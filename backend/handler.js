// CommonJS imports so it runs without "type":"module"
const { DynamoDBClient } = require("@aws-sdk/client-dynamodb");
const {
  DynamoDBDocumentClient,
  QueryCommand,
  GetCommand,
  PutCommand,
  BatchGetCommand,
} = require("@aws-sdk/lib-dynamodb");
const { S3Client, PutObjectCommand } = require("@aws-sdk/client-s3");
const { getSignedUrl } = require("@aws-sdk/s3-request-presigner");

const REGION = process.env.AWS_REGION || "us-west-2";
const ddbClient = new DynamoDBClient({ region: REGION });
const ddb = DynamoDBDocumentClient.from(ddbClient);
const s3 = new S3Client({ region: REGION });

const TABLE = process.env.VISITS_TABLE;
const BUCKET = process.env.VISIT_IMAGES_BUCKET;
const FRIENDS_TABLE  = process.env.FRIENDS_TABLE  || "backend-Friends";
const PROFILES_TABLE = process.env.PROFILES_TABLE || "backend-Profiles";

// helper: extract user sub from HTTP API JWT authorizer
function getUserSub(event) {
  const jwt = event?.requestContext?.authorizer?.jwt;
  const claims = jwt?.claims || event?.requestContext?.authorizer?.claims;
  return claims?.sub;
}

exports.listVisits = async (event) => {
  try {
    const userId = getUserSub(event);
    if (!userId) return { statusCode: 401, body: JSON.stringify({ message: "Unauthorized" }) };

    const res = await ddb.send(
      new QueryCommand({
        TableName: TABLE,
        KeyConditionExpression: "userId = :u",
        ExpressionAttributeValues: { ":u": userId },
      })
    );
    return { statusCode: 200, body: JSON.stringify(res.Items || []) };
  } catch (err) {
    console.error("listVisits error:", err);
    return { statusCode: 500, body: JSON.stringify({ message: "Server error", error: err.message }) };
  }
};

exports.getVisit = async (event) => {
  try {
    const userId = getUserSub(event);
    if (!userId) return { statusCode: 401, body: JSON.stringify({ message: "Unauthorized" }) };

    const placeId = event.pathParameters?.placeId;
    const res = await ddb.send(
      new GetCommand({
        TableName: TABLE,
        Key: { userId, placeId },
      })
    );
    return { statusCode: 200, body: JSON.stringify(res.Item || {}) };
  } catch (err) {
    console.error("getVisit error:", err);
    return { statusCode: 500, body: JSON.stringify({ message: "Server error", error: err.message }) };
  }
};

exports.upsertVisit = async (event) => {
  try {
    const userId = getUserSub(event);
    if (!userId) return { statusCode: 401, body: JSON.stringify({ message: "Unauthorized" }) };

    const placeId = event.pathParameters?.placeId;
    const { rating, notes, visitDate, imageKeys } = JSON.parse(event.body || "{}");

    await ddb.send(
      new PutCommand({
        TableName: TABLE,
        Item: {
          userId,
          placeId,
          rating: rating != null ? Number(rating) : null,
          notes: notes ?? null,
          visitDate: visitDate ?? null,
          imageKeys: Array.isArray(imageKeys) ? imageKeys : [],
          timestamp: new Date().toISOString(),
        },
      })
    );

    return { statusCode: 200, body: JSON.stringify({ success: true }) };
  } catch (err) {
    console.error("upsertVisit error:", err);
    return { statusCode: 500, body: JSON.stringify({ message: "Server error", error: err.message }) };
  }
};

exports.getUploadUrl = async (event) => {
  try {
    const userId = getUserSub(event);
    if (!userId) return { statusCode: 401, body: JSON.stringify({ message: "Unauthorized" }) };

    const placeId = event.pathParameters?.placeId;
    const key = `${userId}/${placeId}/${Date.now()}.jpg`;

    const cmd = new PutObjectCommand({
      Bucket: BUCKET,
      Key: key,
      ContentType: "image/jpeg",
    });

    const uploadUrl = await getSignedUrl(s3, cmd, { expiresIn: 300 });
    return { statusCode: 200, body: JSON.stringify({ uploadUrl, key }) };
  } catch (err) {
    console.error("getUploadUrl error:", err);
    return { statusCode: 500, body: JSON.stringify({ message: "Server error", error: err.message }) };
  }
};

module.exports.getImageUrls = async (event) => {
  try {
    const userId  = getUserSub(event);
    const placeId = event?.pathParameters?.placeId;
    const table   = process.env.VISITS_TABLE;
    const bucket  = process.env.VISIT_IMAGES_BUCKET;
    const DEBUG   = process.env.DEBUG_IMAGE_URLS === '1';

    if (!userId)  return { statusCode: 401, body: JSON.stringify({ message: 'Unauthorized: missing sub' }) };
    if (!placeId) return { statusCode: 400, body: JSON.stringify({ message: 'Missing placeId' }) };

    const res = await ddb.send(new GetCommand({
      TableName: table,
      Key: { userId, placeId },
      ConsistentRead: true,
    }));
    const item = res.Item || {};

    // --- Robust extraction of keys from many shapes ---
    let raw = item.imageKeys ?? item.images ?? [];

    // DynamoDB Set shape (when someone used createSet somewhere)
    if (raw && typeof raw === 'object' && Array.isArray(raw.values)) {
      raw = raw.values;
    }

    // If a single string, try to parse JSON or split by comma
    if (typeof raw === 'string') {
      try {
        const parsed = JSON.parse(raw);
        raw = Array.isArray(parsed) ? parsed : raw.split(',').map(s => s.trim());
      } catch {
        raw = raw.split(',').map(s => s.trim());
      }
    }

    // Final sanitize → array of non-empty strings
    const keys = Array.isArray(raw)
      ? raw.filter(k => typeof k === 'string' && k.length > 0)
      : [];

    console.log('getImageUrls dbg', {
      userId, placeId,
      hasItem: !!res.Item,
      keysShape: typeof (item.imageKeys ?? item.images),
      keysCount: keys.length,
      bucket,
    });

    if (!keys.length) {
      // Include optional debug echo so you can see what the handler read
      return {
        statusCode: 200,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(DEBUG ? { images: [], debug: { item } } : { images: [] }),
      };
    }

    // getSignedUrl never checks object existence; it will still sign the URL.
    // If an object is missing, the browser will 404/403 when loading it, but we still return the signed URL.
    const images = await Promise.all(
      keys.map(async (key) => {
        const url = await getSignedUrl(
          s3,
          new (require('@aws-sdk/client-s3').GetObjectCommand)({ Bucket: bucket, Key: key }),
          { expiresIn: 60 * 10 } // 10 min
        );
        return { key, url };
      })
    );

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(DEBUG ? { images, debug: { keys } } : { images }),
    };
    } catch (err) {
      console.error('getImageUrls error', err);
      return { statusCode: 500, body: JSON.stringify({ message: 'Failed to generate image URLs', error: err?.message }) };
    }
  };


// Utility: safe JSON parse
function parseJSON(body) {
  try { return JSON.parse(body || "{}"); } catch { return {}; }
}

// GET /me
exports.getMe = async (event) => {
  try {
    const userId = getUserSub(event);
    if (!userId) return { statusCode: 401, body: JSON.stringify({ message: "Unauthorized" }) };

    const email =
      event?.requestContext?.authorizer?.jwt?.claims?.email ||
      event?.requestContext?.authorizer?.claims?.email ||
      null;

    const prof = await ddb.send(
      new GetCommand({ TableName: PROFILES_TABLE, Key: { userId } })
    );

    return {
      statusCode: 200,
      body: JSON.stringify({
        userId,
        email,
        displayName: prof.Item?.displayName ?? null,
        friendCode: userId, // friend code == Cognito sub
      }),
    };
  } catch (err) {
    console.error("getMe error:", err);
    return { statusCode: 500, body: JSON.stringify({ message: "Server error", error: err.message }) };
  }
};

// POST /profile   { displayName }
exports.updateProfile = async (event) => {
  try {
    const userId = getUserSub(event);
    if (!userId) return { statusCode: 401, body: JSON.stringify({ message: "Unauthorized" }) };

    const body = parseJSON(event.body);
    const displayName = (body.displayName || "").toString().slice(0, 60);

    await ddb.send(
      new PutCommand({
        TableName: PROFILES_TABLE,
        Item: { userId, displayName, updatedAt: new Date().toISOString() },
      })
    );

    return { statusCode: 200, body: JSON.stringify({ ok: true }) };
  } catch (err) {
    console.error("updateProfile error:", err);
    return { statusCode: 500, body: JSON.stringify({ message: "Server error", error: err.message }) };
  }
};

// POST /friends/{friendId}
exports.addFriend = async (event) => {
  try {
    const userId = getUserSub(event);
    if (!userId) return { statusCode: 401, body: JSON.stringify({ message: "Unauthorized" }) };

    const friendId = event?.pathParameters?.friendId;
    if (!friendId || friendId === userId) {
      return { statusCode: 400, body: JSON.stringify({ message: "Invalid friendId" }) };
    }

    // Idempotent add (ignore ConditionalCheckFailedException)
    try {
      await ddb.send(
        new PutCommand({
          TableName: FRIENDS_TABLE,
          Item: { userId, friendId, createdAt: new Date().toISOString() },
          ConditionExpression: "attribute_not_exists(userId) AND attribute_not_exists(friendId)",
        })
      );
    } catch (e) {
      // if already exists, fine
      if (e.name !== "ConditionalCheckFailedException") throw e;
    }

    return { statusCode: 200, body: JSON.stringify({ ok: true }) };
  } catch (err) {
    console.error("addFriend error:", err);
    return { statusCode: 500, body: JSON.stringify({ message: "Server error", error: err.message }) };
  }
};

// GET /friends   → ["friendSub1","friendSub2",...]
exports.listFriends = async (event) => {
  try {
    const userId = getUserSub(event);
    if (!userId) return { statusCode: 401, body: JSON.stringify({ message: "Unauthorized" }) };

    const out = await ddb.send(
      new QueryCommand({
        TableName: FRIENDS_TABLE,
        KeyConditionExpression: "userId = :u",
        ExpressionAttributeValues: { ":u": userId },
      })
    );

    const ids = (out.Items || []).map((i) => i.friendId);
    return { statusCode: 200, body: JSON.stringify(ids) };
  } catch (err) {
    console.error("listFriends error:", err);
    return { statusCode: 500, body: JSON.stringify({ message: "Server error", error: err.message }) };
  }
};

// GET /friends/summary
// → [{ friendId, displayName, visitedCount, lastVisit: { placeId, visitDate } | null }]
exports.friendsSummary = async (event) => {
  try {
    const userId = getUserSub(event);
    if (!userId) return { statusCode: 401, body: JSON.stringify({ message: "Unauthorized" }) };

    // 1) list friendIds
    const { Items } = await ddb.send(
      new QueryCommand({
        TableName: FRIENDS_TABLE,
        KeyConditionExpression: "userId = :u",
        ExpressionAttributeValues: { ":u": userId },
      })
    );
    const friendIds = (Items || []).map((i) => i.friendId);
    if (!friendIds.length) return { statusCode: 200, body: JSON.stringify([]) };

    // 2) batch get profiles
    const batch = await ddb.send(
      new BatchGetCommand({
        RequestItems: {
          [PROFILES_TABLE]: {
            Keys: friendIds.map((id) => ({ userId: id })),
            ProjectionExpression: "userId, displayName",
          },
        },
      })
    );
    const profs = {};
    (batch.Responses?.[PROFILES_TABLE] || []).forEach((p) => (profs[p.userId] = p));

    // 3) compute counts + last visit (simple full query per friend)
    const summaries = [];
    for (const fid of friendIds) {
      const all = await ddb.send(
        new QueryCommand({
          TableName: TABLE, // your VISITS_TABLE
          KeyConditionExpression: "userId = :u",
          ExpressionAttributeValues: { ":u": fid },
          ExpressionAttributeNames: { "#ts": "timestamp" },
          ProjectionExpression: "placeId, visitDate, rating, #ts",
        })
      );
      const items = all.Items || [];

      // Count "visited": either has visitDate or numeric rating
      const visitedCount = items.filter(
        (v) =>
          !!v.visitDate ||
          (typeof v.rating === "number" && !Number.isNaN(v.rating))
      ).length;

      // pick last by timestamp (fallback to visitDate)
      let last = null;
      for (const it of items) {
        const t =
          (it.timestamp && Date.parse(it.timestamp)) ||
          (it.visitDate && Date.parse(it.visitDate)) ||
          0;
        if (!last || t > last._t) {
          last = { _t: t, placeId: it.placeId, visitDate: it.visitDate || null };
        }
      }
      summaries.push({
        friendId: fid,
        displayName: profs[fid]?.displayName ?? null,
        visitedCount,
        lastVisit: last ? { placeId: last.placeId, visitDate: last.visitDate } : null,
      });
    }

    return { statusCode: 200, body: JSON.stringify(summaries) };
  } catch (err) {
    console.error("friendsSummary error:", err);
    return { statusCode: 500, body: JSON.stringify({ message: "Server error", error: err.message }) };
  }
};

// GET /friends/{friendId}/visits  → limited fields only
exports.getFriendVisits = async (event) => {
  try {
    const userId = getUserSub(event);
    if (!userId) return { statusCode: 401, body: JSON.stringify({ message: "Unauthorized" }) };

    const friendId = event?.pathParameters?.friendId;
    if (!friendId) return { statusCode: 400, body: JSON.stringify({ message: "Missing friendId" }) };

    // guard: ensure user follows friend
    const rel = await ddb.send(
      new GetCommand({ TableName: FRIENDS_TABLE, Key: { userId, friendId } })
    );
    if (!rel.Item) return { statusCode: 403, body: JSON.stringify({ message: "Not friends" }) };

    const out = await ddb.send(
      new QueryCommand({
        TableName: TABLE,
        KeyConditionExpression: "userId = :u",
        ExpressionAttributeValues: { ":u": friendId },
        ExpressionAttributeNames: { "#ts": "timestamp" },
        ProjectionExpression: "placeId, visitDate, rating, #ts",
      })
    );

    return { statusCode: 200, body: JSON.stringify(out.Items || []) };
  } catch (err) {
    console.error("getFriendVisits error:", err);
    return { statusCode: 500, body: JSON.stringify({ message: "Server error", error: err.message }) };
  }
};



import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import {
  DynamoDBDocumentClient,
  QueryCommand,
  GetCommand,
  PutCommand,
} from "@aws-sdk/lib-dynamodb";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

const REGION = process.env.AWS_REGION || "us-west-2";
const ddbClient = new DynamoDBClient({ region: REGION });
const ddb = DynamoDBDocumentClient.from(ddbClient);
const s3 = new S3Client({ region: REGION });

const TABLE = process.env.VISITS_TABLE;
const BUCKET = process.env.VISIT_IMAGES_BUCKET;

// 1) List all visits for the authenticated user
export const listVisits = async (event) => {
  const userId = event.requestContext.authorizer.jwt.claims.sub;
  const res = await ddb.send(
    new QueryCommand({
      TableName: TABLE,
      KeyConditionExpression: "userId = :u",
      ExpressionAttributeValues: { ":u": userId },
    })
  );
  return { statusCode: 200, body: JSON.stringify(res.Items) };
};

// 2) Get one visit record by placeId
export const getVisit = async (event) => {
  const userId = event.requestContext.authorizer.jwt.claims.sub;
  const placeId = event.pathParameters.placeId;
  const res = await ddb.send(
    new GetCommand({
      TableName: TABLE,
      Key: { userId, placeId },
    })
  );
  return { statusCode: 200, body: JSON.stringify(res.Item || {}) };
};

// 3) Create or update a visit (with rating, notes, visitDate, imageKeys)
export const upsertVisit = async (event) => {
  const userId = event.requestContext.authorizer.jwt.claims.sub;
  const placeId = event.pathParameters.placeId;
  const { rating, notes, visitDate, imageKeys } = JSON.parse(event.body || "{}");

  await ddb.send(
    new PutCommand({
      TableName: TABLE,
      Item: {
        userId,
        placeId,
        rating,
        notes,
        visitDate,
        imageKeys,
        timestamp: new Date().toISOString(),
      },
    })
  );

  return { statusCode: 200, body: JSON.stringify({ success: true }) };
};

// 4) Return a presigned S3 URL so the client can upload images directly
export const getUploadUrl = async (event) => {
  const userId = event.requestContext.authorizer.jwt.claims.sub;
  const placeId = event.pathParameters.placeId;
  // unique key per user/place/timestamp
  const key = `${userId}/${placeId}/${Date.now()}.jpg`;

  const cmd = new PutObjectCommand({
    Bucket: BUCKET,
    Key: key,
    ContentType: "image/jpeg",
  });

  const url = await getSignedUrl(s3, cmd, { expiresIn: 300 });
  return {
    statusCode: 200,
    body: JSON.stringify({ uploadUrl: url, key }),
  };
};

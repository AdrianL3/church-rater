// src/api/index.ts
import Constants from 'expo-constants';
import { fetchAuthSession } from 'aws-amplify/auth';
import { jwtDecode } from 'jwt-decode';

type IdPayload = { iss: string; aud: string; exp: number; sub: string };

const API_BASE = Constants.expoConfig?.extra?.apiUrl;

// ---------- Auth header helper ----------
async function authHeaders() {
  const { tokens } = await fetchAuthSession();
  const idToken = tokens?.idToken?.toString();
  if (!idToken) throw new Error('No ID token');

  const p = jwtDecode<IdPayload>(idToken);
  console.log('JWT iss:', p.iss, 'aud:', p.aud, 'sub:', p.sub);

  return {
    Authorization: `Bearer ${idToken}`,
    'Content-Type': 'application/json',
  };
}

// ---------- Visit types ----------
export type Visit = {
  userId: string;
  placeId: string;
  placeName?: string | null;   // ← NEW
  rating?: number | null;
  notes?: string | null;
  visitDate?: string | null;
  imageKeys?: string[];
  timestamp?: string | null;
};

export type FriendVisit = {
  placeId: string;
  placeName?: string | null;   // ← NEW
  rating?: number | null;
  visitDate?: string | null;
  timestamp?: string | null;
};

// ---------- Visits API ----------
export async function listVisits(): Promise<Visit[]> {
  const res = await fetch(`${API_BASE}/visits`, { headers: await authHeaders() });
  if (!res.ok) throw new Error(await res.text());
  const data = await res.json();
  return (Array.isArray(data) ? data : []).map((v: any): Visit => ({
    userId: v.userId,
    placeId: v.placeId,
    placeName: v.placeName ?? null,         // ← pass through
    rating: typeof v.rating === 'number' ? v.rating : null,
    notes: typeof v.notes === 'string' ? v.notes : null,
    visitDate: v.visitDate ?? null,
    imageKeys: Array.isArray(v.imageKeys) ? v.imageKeys : [],
    timestamp: v.timestamp ?? null,
  }));
}

export async function getVisit(placeId: string): Promise<Visit | {}> {
  const res = await fetch(`${API_BASE}/visits/${encodeURIComponent(placeId)}`, {
    headers: await authHeaders(),
  });
  if (!res.ok) throw new Error(await res.text());
  const v = await res.json();
  if (!v || !v.placeId) return {};
  return {
    userId: v.userId,
    placeId: v.placeId,
    placeName: v.placeName ?? null,         // ← pass through
    rating: typeof v.rating === 'number' ? v.rating : null,
    notes: typeof v.notes === 'string' ? v.notes : null,
    visitDate: v.visitDate ?? null,
    imageKeys: Array.isArray(v.imageKeys) ? v.imageKeys : [],
    timestamp: v.timestamp ?? null,
  } as Visit;
}

export async function upsertVisit(
  placeId: string,
  data: {
    rating: number;
    notes?: string;
    visitDate: string;
    imageKeys?: string[];
    placeName?: string | null;            // ← allow sending placeName
  }
) {
  const res = await fetch(`${API_BASE}/visits/${encodeURIComponent(placeId)}`, {
    method: 'POST',
    headers: await authHeaders(),
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export async function getUploadUrl(placeId: string) {
  const res = await fetch(`${API_BASE}/visits/${encodeURIComponent(placeId)}/upload-url`, {
    headers: await authHeaders(),
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json() as Promise<{ uploadUrl: string; key: string }>;
}

export async function getImageUrls(
  placeId: string
): Promise<{ images: { key: string; url: string }[] }> {
  const res = await fetch(`${API_BASE}/visits/${encodeURIComponent(placeId)}/images`, {
    method: 'GET',
    headers: await authHeaders(),
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

// ---------- Friends / Profile ----------
export type Me = {
  userId: string;
  email?: string;
  displayName?: string | null;
  friendCode: string;
};

export async function getMe(): Promise<Me> {
  const res = await fetch(`${API_BASE}/me`, { headers: await authHeaders() });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export async function updateProfile(body: { displayName: string }) {
  const res = await fetch(`${API_BASE}/profile`, {
    method: 'POST',
    headers: { ...(await authHeaders()), 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

// (legacy “instant add” – still here if you need it elsewhere)
export async function addFriend(friendId: string) {
  const res = await fetch(`${API_BASE}/friends/${encodeURIComponent(friendId)}`, {
    method: 'POST',
    headers: await authHeaders(),
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

// If your backend now returns placeName in lastVisit, reflect that here:
export type FriendSummary = {
  friendId: string;
  displayName?: string | null;
  visitedCount: number;
  lastVisit?: {
    placeId: string;
    placeName?: string | null;           // ← NEW (optional)
    visitDate?: string | null;
  } | null;
};

export async function friendsSummary(): Promise<FriendSummary[]> {
  const res = await fetch(`${API_BASE}/friends/summary`, { headers: await authHeaders() });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export async function getFriendVisits(friendId: string): Promise<FriendVisit[]> {
  const res = await fetch(`${API_BASE}/friends/${encodeURIComponent(friendId)}/visits`, {
    headers: await authHeaders(),
  });
  if (!res.ok) throw new Error(await res.text());
  const data = await res.json();
  return (Array.isArray(data) ? data : []).map((v: any): FriendVisit => ({
    placeId: v.placeId,
    placeName: v.placeName ?? null,      // ← pass through
    rating: typeof v.rating === 'number' ? v.rating : null,
    visitDate: v.visitDate ?? null,
    timestamp: v.timestamp ?? null,
  }));
}

// ----- Friend requests / management -----
export async function requestFriend(targetUserId: string) {
  const res = await fetch(`${API_BASE}/friends/requests/${encodeURIComponent(targetUserId)}`, {
    method: 'POST',
    headers: await authHeaders(),
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export async function listIncomingRequests() {
  const res = await fetch(`${API_BASE}/friends/requests/incoming`, {
    headers: await authHeaders(),
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json() as Promise<Array<{ requesterUserId: string; createdAt: string }>>;
}

export async function listOutgoingRequests() {
  const res = await fetch(`${API_BASE}/friends/requests/outgoing`, {
    headers: await authHeaders(),
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json() as Promise<Array<{ targetUserId: string; createdAt: string }>>;
}

export async function acceptFriendRequest(requesterUserId: string) {
  const res = await fetch(
    `${API_BASE}/friends/requests/${encodeURIComponent(requesterUserId)}/accept`,
    { method: 'POST', headers: await authHeaders() }
  );
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export async function declineFriendRequest(requesterUserId: string) {
  const res = await fetch(
    `${API_BASE}/friends/requests/${encodeURIComponent(requesterUserId)}/decline`,
    { method: 'POST', headers: await authHeaders() }
  );
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export async function removeFriend(friendId: string) {
  const res = await fetch(`${API_BASE}/friends/${encodeURIComponent(friendId)}`, {
    method: 'DELETE',
    headers: await authHeaders(),
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export async function deleteVisit(placeId: string) {
  const res = await fetch(`${API_BASE}/visits/${encodeURIComponent(placeId)}`, {
    method: 'DELETE',
    headers: await authHeaders(),
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

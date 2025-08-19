// src/api/index.ts
import Constants from 'expo-constants';
import { fetchAuthSession } from 'aws-amplify/auth';
import { jwtDecode } from 'jwt-decode';

type IdPayload = { iss: string; aud: string; exp: number; sub: string };

const API_BASE = Constants.expoConfig?.extra?.apiUrl;

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

export async function listVisits() {
  const res = await fetch(`${API_BASE}/visits`, { headers: await authHeaders() });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export async function getVisit(placeId: string) {
  const res = await fetch(`${API_BASE}/visits/${encodeURIComponent(placeId)}`, {
    headers: await authHeaders(),
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export async function upsertVisit(
  placeId: string,
  data: { rating: number; notes?: string; visitDate: string; imageKeys?: string[] }
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

export async function getImageUrls(placeId: string): Promise<{ images: { key: string; url: string }[] }> {
    const res = await fetch(`${API_BASE}/visits/${encodeURIComponent(placeId)}/images`, {
      method: 'GET',
      headers: await authHeaders(),
    });
    if (!res.ok) throw new Error(await res.text());
    return res.json();
  }

// --- FRIENDS / PROFILE API ---

export type Me = { userId: string; email?: string; displayName?: string|null; friendCode: string };

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

export async function addFriend(friendId: string) {
  const res = await fetch(`${API_BASE}/friends/${encodeURIComponent(friendId)}`, {
    method: 'POST',
    headers: await authHeaders(),
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export type FriendSummary = {
  friendId: string;
  displayName?: string | null;
  visitedCount: number;
  lastVisit?: { placeId: string; visitDate?: string | null } | null;
};

export async function friendsSummary(): Promise<FriendSummary[]> {
  const res = await fetch(`${API_BASE}/friends/summary`, { headers: await authHeaders() });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export type FriendVisit = { placeId: string; visitDate?: string | null; rating?: number | null; timestamp?: string };

export async function getFriendVisits(friendId: string): Promise<FriendVisit[]> {
  const res = await fetch(`${API_BASE}/friends/${encodeURIComponent(friendId)}/visits`, {
    headers: await authHeaders(),
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}
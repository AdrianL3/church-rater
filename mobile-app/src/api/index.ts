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

// src/lib/mapRegion.ts
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { Region } from 'react-native-maps';

const KEY = 'lastMapRegion:v1';
let mem: Region | null = null;

export async function loadLastRegion(): Promise<Region | null> {
  if (mem) return mem;
  try {
    const raw = await AsyncStorage.getItem(KEY);
    if (raw) mem = JSON.parse(raw);
  } catch {}
  return mem;
}

export async function saveLastRegion(r: Region) {
  mem = r;
  try { await AsyncStorage.setItem(KEY, JSON.stringify(r)); } catch {}
}

export function getLastRegion(): Region | null {
  return mem;
}

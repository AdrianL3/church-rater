import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';

const STORAGE_KEY = 'placeNameCache:v1';
let memory: Record<string, string> = {};
let loaded = false;

// robust extra read
function getExtra() {
  return (
    Constants.expoConfig?.extra ??
    // @ts-ignore
    (Constants as any).manifest2?.extra ??
    // @ts-ignore
    (Constants as any).manifest?.extra ??
    {}
  );
}

async function ensureLoaded() {
  if (loaded) return;
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (raw) memory = JSON.parse(raw);
  } catch {}
  loaded = true;
}

let saveTimer: ReturnType<typeof setTimeout> | undefined;
function saveDebounced() {
  if (saveTimer) clearTimeout(saveTimer);
  saveTimer = setTimeout(() => {
    AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(memory)).catch(() => {});
  }, 400);
}

// ---------- Throttle (TypeScript-safe) ----------
let pending: Promise<void> = Promise.resolve();
let last = 0;
const MIN_INTERVAL_MS = 250;

/**
 * Queue fn calls so we do at most ~4 req/sec.
 * Keeps internal chain as Promise<void> but returns Promise<T> to the caller.
 */
function throttled<T>(fn: () => Promise<T>): Promise<T> {
  const call = async () => {
    const now = Date.now();
    const wait = Math.max(0, MIN_INTERVAL_MS - (now - last));
    if (wait) await new Promise((r) => setTimeout(r, wait));
    last = Date.now();
    return fn();
  };

  // Chain after the current queue:
  const p = pending.then(call) as Promise<T>;
  // Update the queue to a void promise regardless of success/failure:
  pending = p.then(() => {}, () => {});
  return p;
}
// -----------------------------------------------

export async function getPlaceName(placeId: string): Promise<string | null> {
  if (!placeId) return null;
  await ensureLoaded();
  if (memory[placeId]) return memory[placeId];

  const extra = getExtra();
  const apiKey: string = extra.googleMapsApiKey ?? '';
  if (!apiKey) return null;

  const fetchOne = async () => {
    const url =
      `https://maps.googleapis.com/maps/api/place/details/json?place_id=${encodeURIComponent(
        placeId
      )}&fields=name&key=${apiKey}`;
    const res = await fetch(url);
    const json = await res.json();
    if (json.status === 'OK' && json.result?.name) {
      memory[placeId] = json.result.name;
      saveDebounced();
      return memory[placeId];
    }
    return null;
  };

  return throttled(fetchOne);
}

// fire-and-forget prefetch (first N)
export function prefetchNames(ids: string[]) {
  ids.forEach((id) => {
    void getPlaceName(id);
  });
}

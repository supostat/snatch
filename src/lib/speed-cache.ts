const SPEED_CACHE_DURATION_MS = 1500;

export interface SpeedCache {
  value: string | null;
  timestamp: number;
}

export function createSpeedCache(): SpeedCache {
  return { value: null, timestamp: 0 };
}

export function getCachedSpeed(
  cache: SpeedCache,
  newSpeed: string | null,
): string | null {
  const now = Date.now();

  if (newSpeed) {
    cache.value = newSpeed;
    cache.timestamp = now;
    return newSpeed;
  }

  if (cache.value && now - cache.timestamp < SPEED_CACHE_DURATION_MS) {
    return cache.value;
  }

  cache.value = null;
  return null;
}

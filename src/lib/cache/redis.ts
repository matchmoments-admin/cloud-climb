import { Redis } from '@upstash/redis';

let redis: Redis | null = null;

function getRedisClient(): Redis | null {
  if (!process.env.UPSTASH_REDIS_REST_URL || !process.env.UPSTASH_REDIS_REST_TOKEN) {
    console.warn('[CACHE] Redis credentials not configured, caching disabled');
    return null;
  }

  if (!redis) {
    try {
      redis = new Redis({
        url: process.env.UPSTASH_REDIS_REST_URL,
        token: process.env.UPSTASH_REDIS_REST_TOKEN,
      });
      console.log('[CACHE] Upstash Redis initialized');
    } catch (error) {
      console.error('[CACHE] Redis initialization failed:', error);
      return null;
    }
  }

  return redis;
}

/**
 * Get cached data or fetch fresh if not exists
 */
export async function getCached<T>(
  key: string,
  fetcher: () => Promise<T>,
  ttl: number = 300
): Promise<T> {
  const client = getRedisClient();

  if (!client) {
    return await fetcher();
  }

  try {
    const cached = await client.get<T>(key);

    if (cached !== null) {
      console.log(`[CACHE HIT] ${key}`);
      return cached;
    }

    console.log(`[CACHE MISS] ${key}`);

    const data = await fetcher();
    await client.setex(key, ttl, JSON.stringify(data));

    console.log(`[CACHE SET] ${key} (TTL: ${ttl}s)`);

    return data;
  } catch (error) {
    console.error(`[CACHE ERROR] ${key}:`, error);
    return await fetcher();
  }
}

/**
 * Invalidate cache by pattern
 */
export async function invalidateCache(pattern: string): Promise<void> {
  const client = getRedisClient();

  if (!client) return;

  try {
    const keys = await client.keys(pattern);
    if (keys.length > 0) {
      await client.del(...keys);
      console.log(`[CACHE INVALIDATED] ${keys.length} keys matching ${pattern}`);
    }
  } catch (error) {
    console.error(`[CACHE INVALIDATE ERROR] ${pattern}:`, error);
  }
}

/**
 * Invalidate a single cache key
 */
export async function invalidateCacheKey(key: string): Promise<void> {
  const client = getRedisClient();

  if (!client) return;

  try {
    await client.del(key);
    console.log(`[CACHE INVALIDATED] ${key}`);
  } catch (error) {
    console.error(`[CACHE INVALIDATE ERROR] ${key}:`, error);
  }
}

/**
 * Get cache statistics
 */
export async function getCacheStats(): Promise<{
  enabled: boolean;
  totalKeys: number;
  keysByPrefix: Record<string, number>;
} | null> {
  const client = getRedisClient();

  if (!client) {
    return { enabled: false, totalKeys: 0, keysByPrefix: {} };
  }

  try {
    const allKeys = await client.keys('*');

    const keysByPrefix: Record<string, number> = {};
    allKeys.forEach((key) => {
      const prefix = key.split(':')[0];
      keysByPrefix[prefix] = (keysByPrefix[prefix] || 0) + 1;
    });

    return {
      enabled: true,
      totalKeys: allKeys.length,
      keysByPrefix,
    };
  } catch (error) {
    console.error('Failed to get cache stats:', error);
    return null;
  }
}

// Domain-specific cache invalidation

export async function invalidateArticleCaches(): Promise<void> {
  await invalidateCache('articles:*');
}

export async function invalidateAuthorCaches(): Promise<void> {
  await invalidateCache('authors:*');
}

export async function invalidateAllCaches(): Promise<void> {
  const client = getRedisClient();

  if (!client) return;

  try {
    const allKeys = await client.keys('*');
    if (allKeys.length > 0) {
      await client.del(...allKeys);
      console.log(`[CACHE FLUSH] Deleted all ${allKeys.length} keys`);
    }
  } catch (error) {
    console.error('[CACHE FLUSH ERROR]:', error);
  }
}

export { redis, getRedisClient };

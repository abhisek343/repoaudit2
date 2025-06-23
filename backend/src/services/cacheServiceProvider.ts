import { RedisCacheService } from './redisCacheService';

// Singleton instance
let cacheServiceInstance: RedisCacheService | null = null;

/**
 * Get or create the singleton Redis cache service instance
 */
export function getCacheService(): RedisCacheService {
  if (!cacheServiceInstance) {
    cacheServiceInstance = new RedisCacheService(
      process.env.REDIS_URL || 'redis://localhost:6379'
    );
    console.log('[CacheServiceProvider] Created new Redis cache service instance');
  }
  return cacheServiceInstance;
}

/**
 * Close the Redis connection - useful for testing or graceful shutdown
 */
export async function closeCacheService(): Promise<void> {
  if (cacheServiceInstance) {
    await cacheServiceInstance.close();
    cacheServiceInstance = null;
    console.log('[CacheServiceProvider] Closed Redis cache service connection');
  }
} 
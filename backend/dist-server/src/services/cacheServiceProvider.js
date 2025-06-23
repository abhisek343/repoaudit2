"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getCacheService = getCacheService;
exports.closeCacheService = closeCacheService;
const redisCacheService_1 = require("./redisCacheService");
// Singleton instance
let cacheServiceInstance = null;
/**
 * Get or create the singleton Redis cache service instance
 */
function getCacheService() {
    if (!cacheServiceInstance) {
        cacheServiceInstance = new redisCacheService_1.RedisCacheService(process.env.REDIS_URL || 'redis://localhost:6379');
        console.log('[CacheServiceProvider] Created new Redis cache service instance');
    }
    return cacheServiceInstance;
}
/**
 * Close the Redis connection - useful for testing or graceful shutdown
 */
async function closeCacheService() {
    if (cacheServiceInstance) {
        await cacheServiceInstance.close();
        cacheServiceInstance = null;
        console.log('[CacheServiceProvider] Closed Redis cache service connection');
    }
}

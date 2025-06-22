"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.RedisCacheService = void 0;
const ioredis_1 = __importDefault(require("ioredis"));
class RedisCacheService {
    client;
    defaultTTL; // seconds
    prefix;
    hits = 0;
    misses = 0;
    constructor(url, defaultTTL = 300) {
        this.client = new ioredis_1.default(url, {
            // Auto-reconnect with exponential backoff
            retryStrategy: (times) => Math.min(times * 50, 2000),
            lazyConnect: false,
        });
        this.defaultTTL = defaultTTL;
        this.prefix = process.env.REDIS_KEY_PREFIX;
        // Connection event handlers
        this.client.on('error', (err) => console.error('[RedisCacheService] Redis error:', err));
        this.client.on('connect', () => console.info('[RedisCacheService] Connected to Redis'));
        this.client.on('reconnecting', () => console.info('[RedisCacheService] Reconnecting to Redis'));
    }
    async get(key) {
        try {
            const fullKey = this.prefix ? `${this.prefix}:${key}` : key;
            const data = await this.client.get(fullKey);
            if (!data) {
                this.misses++;
                return null;
            }
            this.hits++;
            return JSON.parse(data);
        }
        catch (e) {
            console.error(`[RedisCacheService] GET error for key ${key}:`, e);
            return null;
        }
    }
    async set(key, data, ttlSeconds) {
        try {
            const fullKey = this.prefix ? `${this.prefix}:${key}` : key;
            const value = JSON.stringify(data);
            const ttl = ttlSeconds ?? this.defaultTTL;
            const pipeline = this.client.pipeline();
            pipeline.set(fullKey, value, 'EX', ttl);
            pipeline.zadd('report_access_log', Date.now(), fullKey);
            await pipeline.exec();
            await this.trimCache();
        }
        catch (e) {
            console.error(`[RedisCacheService] SET error for key ${key}:`, e);
        }
    }
    async trimCache(maxCacheSize = 10) {
        try {
            const count = await this.client.zcard('report_access_log');
            if (count > maxCacheSize) {
                const toRemove = await this.client.zrange('report_access_log', 0, count - maxCacheSize - 1);
                if (toRemove.length > 0) {
                    const pipeline = this.client.pipeline();
                    pipeline.del(...toRemove);
                    pipeline.zrem('report_access_log', ...toRemove);
                    await pipeline.exec();
                    console.log(`[RedisCacheService] Trimmed ${toRemove.length} old cache entries.`);
                }
            }
        }
        catch (e) {
            console.error('[RedisCacheService] TRIM error:', e);
        }
    }
    async delete(key) {
        try {
            const fullKey = this.prefix ? `${this.prefix}:${key}` : key;
            const result = await this.client.del(fullKey);
            return result > 0;
        }
        catch (e) {
            console.error(`[RedisCacheService] DELETE error for key ${key}:`, e);
            return false;
        }
    }
    async clear() {
        try {
            await this.client.flushdb();
        }
        catch (e) {
            console.error('[RedisCacheService] CLEAR error:', e);
        }
    }
    /**
     * Check Redis health
     */
    async ping() {
        try {
            const res = await this.client.ping();
            return res === 'PONG';
        }
        catch {
            return false;
        }
    }
    /**
     * Gracefully shut down Redis connection
     */
    async close() {
        try {
            await this.client.quit();
        }
        catch (e) {
            console.error('[RedisCacheService] Error during quit:', e);
        }
    }
    /**
     * Get cache statistics
     */
    stats() {
        return { hits: this.hits, misses: this.misses };
    }
}
exports.RedisCacheService = RedisCacheService;

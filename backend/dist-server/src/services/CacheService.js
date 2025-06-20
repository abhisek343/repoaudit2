"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CacheService = void 0;
class CacheService {
    cache = new Map(); // data: any -> unknown
    defaultTTL; // Default Time To Live in milliseconds
    constructor(defaultTTL = 5 * 60 * 1000) {
        this.defaultTTL = defaultTTL;
    }
    async get(key) {
        const entry = this.cache.get(key);
        if (entry && (Date.now() - entry.timestamp < this.defaultTTL)) {
            console.log(`[CacheService] Cache HIT for key: ${key}`);
            return entry.data;
        }
        if (entry) {
            // Entry exists but is stale, delete it
            console.log(`[CacheService] Cache STALE for key: ${key}. Deleting.`);
            this.cache.delete(key);
        }
        else {
            console.log(`[CacheService] Cache MISS for key: ${key}`);
        }
        return null;
    }
    async set(key, data, ttl) {
        const timestamp = Date.now();
        this.cache.set(key, { data, timestamp });
        console.log(`[CacheService] Cache SET for key: ${key}`);
        // Optional: Implement individual TTL cleanup if needed, though simpler to rely on stale check on get
        // If a specific TTL is provided for this entry, you might want to handle its expiry separately.
        // For now, the global TTL check on get() handles staleness.
        if (ttl) {
            // This is just an example if you wanted proactive cleanup for specific TTLs
            // setTimeout(() => {
            //   const currentEntry = this.cache.get(key);
            //   if (currentEntry && currentEntry.timestamp === timestamp) { // Ensure it's the same entry
            //     this.cache.delete(key);
            //     console.log(`[CacheService] Proactively DELETED expired key: ${key} after ${ttl}ms`);
            //   }
            // }, ttl);
        }
    }
    async delete(key) {
        const deleted = this.cache.delete(key);
        if (deleted) {
            console.log(`[CacheService] Cache DELETED for key: ${key}`);
        }
        return deleted;
    }
    async clear() {
        this.cache.clear();
        console.log('[CacheService] Cache CLEARED.');
    }
    size() {
        return this.cache.size;
    }
    // Optional: Method to clean up all stale entries proactively
    async cleanStale() {
        const now = Date.now();
        let cleanedCount = 0;
        for (const [key, entry] of this.cache.entries()) {
            if (now - entry.timestamp >= this.defaultTTL) {
                this.cache.delete(key);
                cleanedCount++;
            }
        }
        if (cleanedCount > 0) {
            console.log(`[CacheService] Cleaned ${cleanedCount} stale entries.`);
        }
    }
}
exports.CacheService = CacheService;
// Example of a global cache instance if needed throughout the app
// export const globalCache = new CacheService();

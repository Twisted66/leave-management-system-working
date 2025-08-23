/**
 * User cache implementation for performance optimization
 * Reduces database calls for frequently accessed user data
 */

import type { Employee } from "./types";

interface CachedUser {
  data: Employee;
  expiry: number;
}

interface CacheStats {
  hits: number;
  misses: number;
  size: number;
}

class UserCache {
  private cache = new Map<string, CachedUser>();
  private readonly TTL = 5 * 60 * 1000; // 5 minutes
  private readonly MAX_SIZE = 1000; // Maximum cache entries
  private stats: CacheStats = { hits: 0, misses: 0, size: 0 };

  /**
   * Gets user from cache if valid, null otherwise
   */
  get(key: string): Employee | null {
    const cached = this.cache.get(key);
    
    if (!cached) {
      this.stats.misses++;
      return null;
    }

    if (Date.now() > cached.expiry) {
      this.cache.delete(key);
      this.stats.misses++;
      this.stats.size--;
      return null;
    }

    this.stats.hits++;
    return cached.data;
  }

  /**
   * Sets user in cache with TTL
   */
  set(key: string, user: Employee): void {
    // Evict oldest entries if cache is full
    if (this.cache.size >= this.MAX_SIZE) {
      this.evictOldest();
    }

    this.cache.set(key, {
      data: user,
      expiry: Date.now() + this.TTL
    });
    
    this.stats.size = this.cache.size;
  }

  /**
   * Invalidates specific user cache entry
   */
  invalidate(key: string): void {
    if (this.cache.delete(key)) {
      this.stats.size--;
    }
  }

  /**
   * Invalidates all entries for a user (by external ID or userID)
   */
  invalidateUser(externalId: string, userID?: string): void {
    this.invalidate(`external:${externalId}`);
    if (userID) {
      this.invalidate(`user:${userID}`);
    }
  }

  /**
   * Clears all cache entries
   */
  clear(): void {
    this.cache.clear();
    this.stats = { hits: 0, misses: 0, size: 0 };
  }

  /**
   * Gets cache statistics
   */
  getStats(): CacheStats & { hitRate: number } {
    const total = this.stats.hits + this.stats.misses;
    const hitRate = total > 0 ? (this.stats.hits / total) * 100 : 0;
    
    return {
      ...this.stats,
      hitRate: Math.round(hitRate * 100) / 100
    };
  }

  /**
   * Evicts expired entries
   */
  private cleanup(): void {
    const now = Date.now();
    for (const [key, cached] of this.cache.entries()) {
      if (now > cached.expiry) {
        this.cache.delete(key);
      }
    }
    this.stats.size = this.cache.size;
  }

  /**
   * Evicts oldest entry when cache is full
   */
  private evictOldest(): void {
    const firstKey = this.cache.keys().next().value;
    if (firstKey) {
      this.cache.delete(firstKey);
    }
  }
}

// Global cache instance
export const userCache = new UserCache();

// Cleanup expired entries every 10 minutes
setInterval(() => {
  userCache.clear();
}, 10 * 60 * 1000);

/**
 * Cache helper functions
 */
export const CacheKeys = {
  userByExternalId: (externalId: string) => `external:${externalId}`,
  userById: (id: string | number) => `user:${id}`,
  userByEmail: (email: string) => `email:${email}`,
} as const;

/**
 * Performance monitoring for cache operations
 */
export function logCacheMetrics(): void {
  const stats = userCache.getStats();
  console.log('[Cache Metrics]', {
    hitRate: `${stats.hitRate}%`,
    hits: stats.hits,
    misses: stats.misses,
    size: stats.size,
    timestamp: new Date().toISOString()
  });
}

// Log cache metrics every hour in production
if (process.env.NODE_ENV === 'production') {
  setInterval(logCacheMetrics, 60 * 60 * 1000);
}
// =============================================================================
// Rate Limiting Middleware
// =============================================================================
//
// Simple in-memory rate limiting to prevent abuse
// For production, consider using a Redis-backed solution for distributed systems
//
// =============================================================================

const { logger } = require('./logger');

/**
 * Simple in-memory rate limiter
 */
class RateLimiter {
  constructor(options = {}) {
    this.windowMs = options.windowMs || 15 * 60 * 1000; // 15 minutes default
    this.maxRequests = options.maxRequests || 100; // 100 requests per window default
    this.message = options.message || 'Too many requests, please try again later';
    this.skipSuccessfulRequests = options.skipSuccessfulRequests || false;
    this.keyGenerator = options.keyGenerator || this.defaultKeyGenerator;

    // Store: { key: { count: number, resetTime: timestamp } }
    this.store = new Map();

    // Cleanup old entries every minute
    this.startCleanup();
  }

  /**
   * Default key generator uses IP address
   */
  defaultKeyGenerator(req) {
    return req.ip || req.connection.remoteAddress || 'unknown';
  }

  /**
   * Get or create rate limit entry for a key
   */
  getEntry(key) {
    const now = Date.now();
    let entry = this.store.get(key);

    // Create new entry or reset if window expired
    if (!entry || now > entry.resetTime) {
      entry = {
        count: 0,
        resetTime: now + this.windowMs
      };
      this.store.set(key, entry);
    }

    return entry;
  }

  /**
   * Check if request should be rate limited
   */
  shouldLimit(key) {
    const entry = this.getEntry(key);
    return entry.count >= this.maxRequests;
  }

  /**
   * Increment request count for a key
   */
  increment(key) {
    const entry = this.getEntry(key);
    entry.count++;
    this.store.set(key, entry);
    return entry;
  }

  /**
   * Get rate limit info for a key
   */
  getInfo(key) {
    const entry = this.getEntry(key);
    const remaining = Math.max(0, this.maxRequests - entry.count);
    const resetTime = new Date(entry.resetTime);

    return {
      limit: this.maxRequests,
      current: entry.count,
      remaining: remaining,
      resetTime: resetTime
    };
  }

  /**
   * Express middleware function
   */
  middleware() {
    return (req, res, next) => {
      const key = this.keyGenerator(req);

      // Check if already limited
      if (this.shouldLimit(key)) {
        const info = this.getInfo(key);

        logger.warn('Rate limit exceeded', {
          ip: key,
          path: req.path,
          method: req.method,
          resetTime: info.resetTime
        });

        res.status(429).json({
          error: {
            message: this.message,
            statusCode: 429,
            retryAfter: Math.ceil((info.resetTime - Date.now()) / 1000),
            limit: info.limit,
            resetTime: info.resetTime.toISOString()
          }
        });
        return;
      }

      // Increment counter
      const entry = this.increment(key);
      const info = this.getInfo(key);

      // Add rate limit headers
      res.setHeader('X-RateLimit-Limit', info.limit);
      res.setHeader('X-RateLimit-Remaining', info.remaining);
      res.setHeader('X-RateLimit-Reset', info.resetTime.toISOString());

      // Log when getting close to limit
      if (info.remaining < 10) {
        logger.warn('Client approaching rate limit', {
          ip: key,
          remaining: info.remaining
        });
      }

      next();
    };
  }

  /**
   * Cleanup expired entries periodically
   */
  startCleanup() {
    setInterval(() => {
      const now = Date.now();
      let removed = 0;

      for (const [key, entry] of this.store.entries()) {
        if (now > entry.resetTime) {
          this.store.delete(key);
          removed++;
        }
      }

      if (removed > 0) {
        logger.debug(`Rate limiter cleanup: removed ${removed} expired entries`);
      }
    }, 60000); // Run every minute
  }

  /**
   * Clear all rate limit data (useful for testing)
   */
  reset() {
    this.store.clear();
    logger.info('Rate limiter store cleared');
  }

  /**
   * Get statistics about rate limiting
   */
  getStats() {
    return {
      totalKeys: this.store.size,
      windowMs: this.windowMs,
      maxRequests: this.maxRequests
    };
  }
}

/**
 * Create rate limiters for different endpoints
 */

// General API rate limiter (100 requests per 15 minutes)
const generalLimiter = new RateLimiter({
  windowMs: 15 * 60 * 1000,
  maxRequests: 100,
  message: 'Too many requests from this IP, please try again later'
});

// Strict limiter for expensive operations (10 requests per 15 minutes)
const strictLimiter = new RateLimiter({
  windowMs: 15 * 60 * 1000,
  maxRequests: 10,
  message: 'Too many image analysis requests. This is a resource-intensive operation. Please try again later.'
});

// Auth limiter (5 attempts per 15 minutes)
const authLimiter = new RateLimiter({
  windowMs: 15 * 60 * 1000,
  maxRequests: 5,
  message: 'Too many authentication attempts, please try again later'
});

module.exports = {
  RateLimiter,
  generalLimiter,
  strictLimiter,
  authLimiter
};

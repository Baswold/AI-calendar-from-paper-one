// =============================================================================
// Performance Monitoring Utilities
// =============================================================================
//
// This module provides utilities for measuring and monitoring application
// performance, including request timing, memory usage, and throughput metrics.
//
// =============================================================================

const { logger } = require('./logger');

/**
 * Performance metrics storage
 */
class PerformanceMonitor {
  constructor() {
    this.metrics = {
      requests: {
        total: 0,
        success: 0,
        errors: 0
      },
      responseTimes: [],
      memorySnapshots: [],
      startTime: Date.now()
    };

    // Take memory snapshot every 5 minutes
    this.startMemoryMonitoring();
  }

  /**
   * Record a request
   * @param {number} responseTime - Response time in milliseconds
   * @param {boolean} success - Whether request was successful
   */
  recordRequest(responseTime, success = true) {
    this.metrics.requests.total++;

    if (success) {
      this.metrics.requests.success++;
    } else {
      this.metrics.requests.errors++;
    }

    this.metrics.responseTimes.push({
      time: responseTime,
      timestamp: Date.now()
    });

    // Keep only last 1000 response times
    if (this.metrics.responseTimes.length > 1000) {
      this.metrics.responseTimes.shift();
    }
  }

  /**
   * Get average response time
   * @param {number} lastN - Number of recent requests to average (default: all)
   * @returns {number} - Average response time in milliseconds
   */
  getAverageResponseTime(lastN = null) {
    const times = lastN
      ? this.metrics.responseTimes.slice(-lastN)
      : this.metrics.responseTimes;

    if (times.length === 0) return 0;

    const sum = times.reduce((acc, item) => acc + item.time, 0);
    return Math.round(sum / times.length);
  }

  /**
   * Get percentile response time
   * @param {number} percentile - Percentile (50, 90, 95, 99)
   * @returns {number} - Response time at percentile
   */
  getPercentile(percentile) {
    if (this.metrics.responseTimes.length === 0) return 0;

    const sorted = [...this.metrics.responseTimes]
      .map(item => item.time)
      .sort((a, b) => a - b);

    const index = Math.ceil((percentile / 100) * sorted.length) - 1;
    return sorted[index] || 0;
  }

  /**
   * Get requests per minute
   * @returns {number} - Requests per minute
   */
  getRequestsPerMinute() {
    const uptimeMinutes = (Date.now() - this.metrics.startTime) / 1000 / 60;
    return Math.round(this.metrics.requests.total / uptimeMinutes);
  }

  /**
   * Get error rate
   * @returns {number} - Error rate as percentage
   */
  getErrorRate() {
    if (this.metrics.requests.total === 0) return 0;
    return ((this.metrics.requests.errors / this.metrics.requests.total) * 100).toFixed(2);
  }

  /**
   * Get current memory usage
   * @returns {object} - Memory usage details
   */
  getMemoryUsage() {
    const usage = process.memoryUsage();
    return {
      heapUsed: Math.round(usage.heapUsed / 1024 / 1024), // MB
      heapTotal: Math.round(usage.heapTotal / 1024 / 1024), // MB
      rss: Math.round(usage.rss / 1024 / 1024), // MB
      external: Math.round(usage.external / 1024 / 1024), // MB
      percentage: ((usage.heapUsed / usage.heapTotal) * 100).toFixed(1)
    };
  }

  /**
   * Start periodic memory monitoring
   */
  startMemoryMonitoring() {
    setInterval(() => {
      const usage = this.getMemoryUsage();
      this.metrics.memorySnapshots.push({
        ...usage,
        timestamp: Date.now()
      });

      // Keep only last 288 snapshots (24 hours if taken every 5 min)
      if (this.metrics.memorySnapshots.length > 288) {
        this.metrics.memorySnapshots.shift();
      }

      // Warn if memory usage is high
      if (parseFloat(usage.percentage) > 90) {
        logger.warn('High memory usage detected', usage);
      }
    }, 5 * 60 * 1000); // Every 5 minutes
  }

  /**
   * Get comprehensive metrics summary
   * @returns {object} - All metrics
   */
  getMetrics() {
    return {
      uptime: {
        milliseconds: Date.now() - this.metrics.startTime,
        seconds: Math.round((Date.now() - this.metrics.startTime) / 1000),
        minutes: Math.round((Date.now() - this.metrics.startTime) / 1000 / 60),
        hours: ((Date.now() - this.metrics.startTime) / 1000 / 60 / 60).toFixed(2)
      },
      requests: {
        ...this.metrics.requests,
        errorRate: this.getErrorRate() + '%',
        requestsPerMinute: this.getRequestsPerMinute()
      },
      responseTimes: {
        average: this.getAverageResponseTime(),
        p50: this.getPercentile(50),
        p90: this.getPercentile(90),
        p95: this.getPercentile(95),
        p99: this.getPercentile(99),
        count: this.metrics.responseTimes.length
      },
      memory: this.getMemoryUsage()
    };
  }

  /**
   * Reset all metrics
   */
  reset() {
    this.metrics = {
      requests: {
        total: 0,
        success: 0,
        errors: 0
      },
      responseTimes: [],
      memorySnapshots: [],
      startTime: Date.now()
    };
    logger.info('Performance metrics reset');
  }

  /**
   * Log current metrics
   */
  logMetrics() {
    const metrics = this.getMetrics();
    logger.info('Performance Metrics', metrics);
  }
}

/**
 * Request timing middleware
 * Measures request duration and records metrics
 */
function performanceMiddleware(monitor) {
  return (req, res, next) => {
    const startTime = Date.now();

    // Listen for response finish
    res.on('finish', () => {
      const duration = Date.now() - startTime;
      const success = res.statusCode < 400;

      monitor.recordRequest(duration, success);

      // Log slow requests
      if (duration > 1000) {
        logger.warn('Slow request detected', {
          path: req.path,
          method: req.method,
          duration: `${duration}ms`,
          statusCode: res.statusCode
        });
      }
    });

    next();
  };
}

/**
 * Simple timer for measuring operation duration
 */
class Timer {
  constructor(label) {
    this.label = label;
    this.startTime = Date.now();
  }

  /**
   * End timer and return duration
   * @returns {number} - Duration in milliseconds
   */
  end() {
    const duration = Date.now() - this.startTime;
    return duration;
  }

  /**
   * End timer and log result
   * @param {object} metadata - Additional data to log
   */
  endAndLog(metadata = {}) {
    const duration = this.end();
    logger.info(`${this.label} completed`, {
      duration: `${duration}ms`,
      ...metadata
    });
    return duration;
  }
}

/**
 * Measure async function execution time
 * @param {string} label - Label for the operation
 * @param {function} fn - Async function to measure
 * @returns {Promise} - Result of the function
 */
async function measureAsync(label, fn) {
  const timer = new Timer(label);
  try {
    const result = await fn();
    timer.endAndLog({ success: true });
    return result;
  } catch (error) {
    timer.endAndLog({ success: false, error: error.message });
    throw error;
  }
}

/**
 * Cache with TTL (Time To Live)
 */
class Cache {
  constructor(defaultTTL = 300000) { // 5 minutes default
    this.store = new Map();
    this.defaultTTL = defaultTTL;
    this.hits = 0;
    this.misses = 0;
  }

  /**
   * Get value from cache
   * @param {string} key - Cache key
   * @returns {any} - Cached value or undefined
   */
  get(key) {
    const item = this.store.get(key);

    if (!item) {
      this.misses++;
      return undefined;
    }

    // Check if expired
    if (Date.now() > item.expires) {
      this.store.delete(key);
      this.misses++;
      return undefined;
    }

    this.hits++;
    return item.value;
  }

  /**
   * Set value in cache
   * @param {string} key - Cache key
   * @param {any} value - Value to cache
   * @param {number} ttl - Time to live in milliseconds
   */
  set(key, value, ttl = this.defaultTTL) {
    this.store.set(key, {
      value: value,
      expires: Date.now() + ttl
    });
  }

  /**
   * Delete key from cache
   * @param {string} key - Cache key
   */
  delete(key) {
    this.store.delete(key);
  }

  /**
   * Clear entire cache
   */
  clear() {
    this.store.clear();
    this.hits = 0;
    this.misses = 0;
  }

  /**
   * Get cache statistics
   * @returns {object} - Cache stats
   */
  getStats() {
    const total = this.hits + this.misses;
    const hitRate = total > 0 ? ((this.hits / total) * 100).toFixed(2) : 0;

    return {
      size: this.store.size,
      hits: this.hits,
      misses: this.misses,
      hitRate: `${hitRate}%`,
      defaultTTL: `${this.defaultTTL}ms`
    };
  }

  /**
   * Clean up expired entries
   */
  cleanup() {
    const now = Date.now();
    let removed = 0;

    for (const [key, item] of this.store.entries()) {
      if (now > item.expires) {
        this.store.delete(key);
        removed++;
      }
    }

    if (removed > 0) {
      logger.debug(`Cache cleanup: removed ${removed} expired entries`);
    }
  }

  /**
   * Start periodic cleanup
   * @param {number} interval - Cleanup interval in milliseconds
   */
  startPeriodicCleanup(interval = 60000) { // Every minute
    setInterval(() => this.cleanup(), interval);
  }
}

// Create global performance monitor
const globalMonitor = new PerformanceMonitor();

// Log metrics every 15 minutes
setInterval(() => {
  globalMonitor.logMetrics();
}, 15 * 60 * 1000);

module.exports = {
  PerformanceMonitor,
  performanceMiddleware,
  Timer,
  measureAsync,
  Cache,
  globalMonitor
};

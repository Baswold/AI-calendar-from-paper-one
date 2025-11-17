// =============================================================================
// Structured Logging Utility
// =============================================================================
//
// This module provides a structured logging system with different log levels,
// timestamps, and formatting for better debugging and monitoring.
//
// =============================================================================

const fs = require('fs');
const path = require('path');

// Log levels
const LogLevel = {
  DEBUG: 0,
  INFO: 1,
  WARN: 2,
  ERROR: 3,
  FATAL: 4
};

// ANSI color codes for terminal output
const Colors = {
  RESET: '\x1b[0m',
  BRIGHT: '\x1b[1m',
  DIM: '\x1b[2m',

  BLACK: '\x1b[30m',
  RED: '\x1b[31m',
  GREEN: '\x1b[32m',
  YELLOW: '\x1b[33m',
  BLUE: '\x1b[34m',
  MAGENTA: '\x1b[35m',
  CYAN: '\x1b[36m',
  WHITE: '\x1b[37m',

  BG_RED: '\x1b[41m',
  BG_GREEN: '\x1b[42m',
  BG_YELLOW: '\x1b[43m'
};

class Logger {
  constructor(options = {}) {
    this.minLevel = options.minLevel || LogLevel.DEBUG;
    this.includeTimestamp = options.includeTimestamp !== false;
    this.colorize = options.colorize !== false;
    this.logToFile = options.logToFile || false;
    this.logFilePath = options.logFilePath || path.join(__dirname, '../logs/app.log');
    this.serviceName = options.serviceName || 'calendar-converter';

    // Create logs directory if logging to file
    if (this.logToFile) {
      const logDir = path.dirname(this.logFilePath);
      if (!fs.existsSync(logDir)) {
        fs.mkdirSync(logDir, { recursive: true });
      }
    }
  }

  /**
   * Format timestamp in ISO format
   */
  getTimestamp() {
    return new Date().toISOString();
  }

  /**
   * Get color for log level
   */
  getLevelColor(level) {
    switch (level) {
      case LogLevel.DEBUG: return Colors.CYAN;
      case LogLevel.INFO: return Colors.GREEN;
      case LogLevel.WARN: return Colors.YELLOW;
      case LogLevel.ERROR: return Colors.RED;
      case LogLevel.FATAL: return Colors.BG_RED + Colors.WHITE;
      default: return Colors.RESET;
    }
  }

  /**
   * Get string representation of log level
   */
  getLevelString(level) {
    switch (level) {
      case LogLevel.DEBUG: return 'DEBUG';
      case LogLevel.INFO: return 'INFO ';
      case LogLevel.WARN: return 'WARN ';
      case LogLevel.ERROR: return 'ERROR';
      case LogLevel.FATAL: return 'FATAL';
      default: return 'UNKN ';
    }
  }

  /**
   * Format log message
   */
  formatMessage(level, message, meta = {}) {
    const parts = [];

    // Timestamp
    if (this.includeTimestamp) {
      const timestamp = this.getTimestamp();
      if (this.colorize) {
        parts.push(`${Colors.DIM}${timestamp}${Colors.RESET}`);
      } else {
        parts.push(timestamp);
      }
    }

    // Service name
    parts.push(`[${this.serviceName}]`);

    // Log level
    const levelStr = this.getLevelString(level);
    if (this.colorize) {
      const color = this.getLevelColor(level);
      parts.push(`${color}${levelStr}${Colors.RESET}`);
    } else {
      parts.push(levelStr);
    }

    // Message
    parts.push(message);

    // Metadata
    if (Object.keys(meta).length > 0) {
      const metaStr = JSON.stringify(meta, null, 2);
      if (this.colorize) {
        parts.push(`${Colors.DIM}${metaStr}${Colors.RESET}`);
      } else {
        parts.push(metaStr);
      }
    }

    return parts.join(' ');
  }

  /**
   * Core log method
   */
  log(level, message, meta = {}) {
    if (level < this.minLevel) {
      return; // Skip if below minimum level
    }

    const formattedMessage = this.formatMessage(level, message, meta);

    // Console output
    if (level >= LogLevel.ERROR) {
      console.error(formattedMessage);
    } else {
      console.log(formattedMessage);
    }

    // File output
    if (this.logToFile) {
      // Strip ANSI codes for file logging
      const fileMessage = formattedMessage.replace(/\x1b\[[0-9;]*m/g, '');
      fs.appendFileSync(this.logFilePath, fileMessage + '\n');
    }
  }

  /**
   * Log debug message
   */
  debug(message, meta = {}) {
    this.log(LogLevel.DEBUG, message, meta);
  }

  /**
   * Log info message
   */
  info(message, meta = {}) {
    this.log(LogLevel.INFO, message, meta);
  }

  /**
   * Log warning message
   */
  warn(message, meta = {}) {
    this.log(LogLevel.WARN, message, meta);
  }

  /**
   * Log error message
   */
  error(message, meta = {}) {
    if (meta instanceof Error) {
      meta = {
        error: meta.message,
        stack: meta.stack
      };
    } else if (meta.error instanceof Error) {
      meta.errorMessage = meta.error.message;
      meta.errorStack = meta.error.stack;
      delete meta.error;
    }
    this.log(LogLevel.ERROR, message, meta);
  }

  /**
   * Log fatal message
   */
  fatal(message, meta = {}) {
    this.log(LogLevel.FATAL, message, meta);
  }

  /**
   * Create a child logger with additional context
   */
  child(context = {}) {
    const childLogger = new Logger({
      minLevel: this.minLevel,
      includeTimestamp: this.includeTimestamp,
      colorize: this.colorize,
      logToFile: this.logToFile,
      logFilePath: this.logFilePath,
      serviceName: this.serviceName
    });

    // Override log method to include context
    const originalLog = childLogger.log.bind(childLogger);
    childLogger.log = (level, message, meta = {}) => {
      originalLog(level, message, { ...context, ...meta });
    };

    return childLogger;
  }

  /**
   * Log HTTP request
   */
  logRequest(req) {
    this.info('HTTP Request', {
      method: req.method,
      path: req.path,
      query: req.query,
      ip: req.ip,
      userAgent: req.get('user-agent')
    });
  }

  /**
   * Log HTTP response
   */
  logResponse(req, res, duration) {
    const level = res.statusCode >= 400 ? LogLevel.ERROR : LogLevel.INFO;
    this.log(level, 'HTTP Response', {
      method: req.method,
      path: req.path,
      statusCode: res.statusCode,
      duration: `${duration}ms`
    });
  }

  /**
   * Express middleware for request logging
   */
  requestLogger() {
    return (req, res, next) => {
      const startTime = Date.now();

      this.logRequest(req);

      // Log response when finished
      res.on('finish', () => {
        const duration = Date.now() - startTime;
        this.logResponse(req, res, duration);
      });

      next();
    };
  }
}

// Create default logger instance
const defaultLogger = new Logger({
  minLevel: process.env.NODE_ENV === 'production' ? LogLevel.INFO : LogLevel.DEBUG,
  colorize: true,
  logToFile: process.env.LOG_TO_FILE === 'true',
  serviceName: 'calendar-api'
});

module.exports = {
  Logger,
  LogLevel,
  logger: defaultLogger
};

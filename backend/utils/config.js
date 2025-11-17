// =============================================================================
// Configuration Management Utility
// =============================================================================
//
// Centralized configuration management with validation, type checking,
// and environment-specific defaults.
//
// =============================================================================

const { logger } = require('./logger');

/**
 * Configuration schema with validation rules
 */
const CONFIG_SCHEMA = {
  // Server configuration
  PORT: {
    type: 'number',
    default: 9002,
    validate: (val) => val > 0 && val <= 65535,
    description: 'Server port number'
  },
  NODE_ENV: {
    type: 'string',
    default: 'development',
    validate: (val) => ['development', 'production', 'test'].includes(val),
    description: 'Node environment'
  },

  // API Keys
  ANTHROPIC_API_KEY: {
    type: 'string',
    required: true,
    validate: (val) => val && val.length > 10,
    description: 'Anthropic API key for Claude Vision'
  },
  GOOGLE_CLIENT_ID: {
    type: 'string',
    required: false,
    description: 'Google OAuth client ID'
  },
  GOOGLE_CLIENT_SECRET: {
    type: 'string',
    required: false,
    description: 'Google OAuth client secret'
  },
  GOOGLE_REDIRECT_URI: {
    type: 'string',
    required: false,
    description: 'Google OAuth redirect URI'
  },

  // CORS configuration
  CORS_ORIGINS: {
    type: 'string',
    default: '*',
    description: 'Comma-separated list of allowed CORS origins'
  },

  // File upload configuration
  MAX_UPLOAD_SIZE: {
    type: 'number',
    default: 10,
    validate: (val) => val > 0 && val <= 100,
    description: 'Maximum file upload size in MB'
  },

  // Rate limiting
  RATE_LIMIT_WINDOW: {
    type: 'number',
    default: 15,
    validate: (val) => val > 0,
    description: 'Rate limit window in minutes'
  },
  RATE_LIMIT_MAX: {
    type: 'number',
    default: 100,
    validate: (val) => val > 0,
    description: 'Maximum requests per window'
  },

  // Logging
  LOG_LEVEL: {
    type: 'string',
    default: 'DEBUG',
    validate: (val) => ['DEBUG', 'INFO', 'WARN', 'ERROR', 'FATAL'].includes(val),
    description: 'Logging level'
  },
  LOG_TO_FILE: {
    type: 'boolean',
    default: false,
    description: 'Enable file logging'
  },
  LOG_FILE_PATH: {
    type: 'string',
    default: './logs/app.log',
    description: 'Log file path'
  },

  // Session
  SESSION_SECRET: {
    type: 'string',
    required: false,
    validate: (val) => !val || val.length >= 32,
    description: 'Session secret for secure sessions'
  },

  // Database (for future use)
  DATABASE_URL: {
    type: 'string',
    required: false,
    description: 'Database connection URL'
  }
};

/**
 * Configuration manager class
 */
class Config {
  constructor() {
    this.values = {};
    this.errors = [];
    this.warnings = [];
    this.loaded = false;
  }

  /**
   * Load configuration from environment variables
   */
  load() {
    logger.info('Loading configuration...');

    for (const [key, schema] of Object.entries(CONFIG_SCHEMA)) {
      const envValue = process.env[key];
      let value;

      // Check if required but missing
      if (schema.required && !envValue) {
        this.errors.push({
          key: key,
          message: `${key} is required but not set`,
          description: schema.description
        });
        continue;
      }

      // Use default if not set
      if (!envValue) {
        value = schema.default;
        if (value !== undefined) {
          logger.debug(`Using default value for ${key}`, { value });
        }
      } else {
        // Parse and validate value
        value = this.parseValue(envValue, schema.type);

        if (value === null) {
          this.errors.push({
            key: key,
            message: `${key} has invalid type (expected ${schema.type})`,
            actualValue: envValue
          });
          continue;
        }

        // Run validation
        if (schema.validate && !schema.validate(value)) {
          this.errors.push({
            key: key,
            message: `${key} failed validation`,
            actualValue: value,
            description: schema.description
          });
          continue;
        }
      }

      this.values[key] = value;
    }

    // Check for configuration issues
    this.checkForIssues();

    // Report errors if any
    if (this.errors.length > 0) {
      this.reportErrors();
      throw new Error('Configuration validation failed');
    }

    // Report warnings
    if (this.warnings.length > 0) {
      this.reportWarnings();
    }

    this.loaded = true;
    logger.info('Configuration loaded successfully');
    return this;
  }

  /**
   * Parse value to correct type
   * @param {string} value - Raw value from environment
   * @param {string} type - Expected type
   * @returns {any} - Parsed value or null if invalid
   */
  parseValue(value, type) {
    try {
      switch (type) {
        case 'string':
          return String(value);

        case 'number':
          const num = Number(value);
          return isNaN(num) ? null : num;

        case 'boolean':
          const lower = value.toLowerCase();
          if (lower === 'true' || lower === '1') return true;
          if (lower === 'false' || lower === '0') return false;
          return null;

        case 'array':
          return value.split(',').map(s => s.trim());

        default:
          return value;
      }
    } catch (error) {
      return null;
    }
  }

  /**
   * Check for common configuration issues
   */
  checkForIssues() {
    // Warn if using default secret in production
    if (this.get('NODE_ENV') === 'production') {
      if (!this.get('SESSION_SECRET')) {
        this.warnings.push({
          message: 'SESSION_SECRET not set in production',
          recommendation: 'Generate a strong random secret'
        });
      }

      if (this.get('CORS_ORIGINS') === '*') {
        this.warnings.push({
          message: 'CORS_ORIGINS set to * in production',
          recommendation: 'Specify exact allowed origins'
        });
      }
    }

    // Warn about Google OAuth incomplete setup
    const hasGoogleId = !!this.get('GOOGLE_CLIENT_ID');
    const hasGoogleSecret = !!this.get('GOOGLE_CLIENT_SECRET');

    if (hasGoogleId !== hasGoogleSecret) {
      this.warnings.push({
        message: 'Google OAuth partially configured',
        recommendation: 'Set both GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET'
      });
    }
  }

  /**
   * Report configuration errors
   */
  reportErrors() {
    logger.fatal('❌ CONFIGURATION ERRORS:');
    this.errors.forEach(error => {
      logger.error(`  ${error.key}: ${error.message}`);
      if (error.description) {
        logger.info(`    ${error.description}`);
      }
    });
  }

  /**
   * Report configuration warnings
   */
  reportWarnings() {
    logger.warn('⚠️  CONFIGURATION WARNINGS:');
    this.warnings.forEach(warning => {
      logger.warn(`  ${warning.message}`);
      if (warning.recommendation) {
        logger.info(`    💡 ${warning.recommendation}`);
      }
    });
  }

  /**
   * Get configuration value
   * @param {string} key - Configuration key
   * @param {any} defaultValue - Default value if not set
   * @returns {any} - Configuration value
   */
  get(key, defaultValue = undefined) {
    if (!this.loaded) {
      throw new Error('Configuration not loaded. Call load() first.');
    }

    const value = this.values[key];
    return value !== undefined ? value : defaultValue;
  }

  /**
   * Check if key exists in configuration
   * @param {string} key - Configuration key
   * @returns {boolean}
   */
  has(key) {
    return this.values.hasOwnProperty(key) && this.values[key] !== undefined;
  }

  /**
   * Get all configuration values
   * @param {boolean} includeSensitive - Include sensitive values
   * @returns {object} - All configuration
   */
  getAll(includeSensitive = false) {
    if (includeSensitive) {
      return { ...this.values };
    }

    // Mask sensitive values
    const safe = { ...this.values };
    const sensitiveKeys = ['ANTHROPIC_API_KEY', 'GOOGLE_CLIENT_SECRET', 'SESSION_SECRET', 'DATABASE_URL'];

    sensitiveKeys.forEach(key => {
      if (safe[key]) {
        safe[key] = this.maskSensitiveValue(safe[key]);
      }
    });

    return safe;
  }

  /**
   * Mask sensitive value for display
   * @param {string} value - Value to mask
   * @returns {string} - Masked value
   */
  maskSensitiveValue(value) {
    if (!value || value.length < 8) return '***';
    return value.substring(0, 4) + '...' + value.substring(value.length - 4);
  }

  /**
   * Get configuration as environment-specific object
   * @returns {object} - Environment configuration
   */
  getEnvironmentConfig() {
    return {
      isProduction: this.get('NODE_ENV') === 'production',
      isDevelopment: this.get('NODE_ENV') === 'development',
      isTest: this.get('NODE_ENV') === 'test',
      port: this.get('PORT'),
      corsOrigins: this.getCorsOrigins(),
      maxUploadSizeBytes: this.get('MAX_UPLOAD_SIZE') * 1024 * 1024,
      rateLimitWindowMs: this.get('RATE_LIMIT_WINDOW') * 60 * 1000,
      rateLimitMax: this.get('RATE_LIMIT_MAX')
    };
  }

  /**
   * Get CORS origins as array
   * @returns {array} - Array of allowed origins
   */
  getCorsOrigins() {
    const origins = this.get('CORS_ORIGINS');
    if (origins === '*') return '*';
    return origins.split(',').map(s => s.trim()).filter(s => s);
  }

  /**
   * Print configuration summary
   */
  printSummary() {
    logger.info('='.repeat(60));
    logger.info('Configuration Summary');
    logger.info('='.repeat(60));

    const config = this.getAll(false);
    const env = this.getEnvironmentConfig();

    logger.info(`Environment: ${env.isProduction ? 'PRODUCTION' : env.isDevelopment ? 'DEVELOPMENT' : 'TEST'}`);
    logger.info(`Port: ${config.PORT}`);
    logger.info(`Max Upload Size: ${this.get('MAX_UPLOAD_SIZE')}MB`);
    logger.info(`Rate Limit: ${this.get('RATE_LIMIT_MAX')} requests per ${this.get('RATE_LIMIT_WINDOW')} minutes`);
    logger.info(`Log Level: ${config.LOG_LEVEL}`);
    logger.info(`Log to File: ${config.LOG_TO_FILE}`);

    if (config.ANTHROPIC_API_KEY) {
      logger.info(`Anthropic API Key: ${this.maskSensitiveValue(this.values.ANTHROPIC_API_KEY)}`);
    }

    if (config.GOOGLE_CLIENT_ID) {
      logger.info(`Google OAuth: Configured`);
    }

    logger.info('='.repeat(60));
  }
}

// Create and export singleton instance
const config = new Config();

module.exports = {
  config,
  Config,
  CONFIG_SCHEMA
};

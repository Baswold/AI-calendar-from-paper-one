const express = require('express');
const multer = require('multer');
const { Anthropic } = require('@anthropic-ai/sdk');
const fs = require('fs').promises;
const path = require('path');
require('dotenv').config();

// Import utilities
const { logger } = require('./utils/logger');
const {
  validateEvent,
  validateEvents,
  validateFile,
  sanitizeString
} = require('./utils/validation');
const { generalLimiter, strictLimiter } = require('./utils/rateLimiter');

// =============================================================================
// Environment Variable Validation
// =============================================================================

/**
 * Validates required environment variables and provides helpful error messages
 */
function validateEnvironment() {
  const errors = [];
  const warnings = [];

  // Check for ANTHROPIC_API_KEY
  if (!process.env.ANTHROPIC_API_KEY) {
    errors.push({
      variable: 'ANTHROPIC_API_KEY',
      message: 'Anthropic API key is required for AI-powered calendar extraction',
      howToFix: 'Set ANTHROPIC_API_KEY in your .env file or environment'
    });
  } else if (process.env.ANTHROPIC_API_KEY.length < 10) {
    warnings.push({
      variable: 'ANTHROPIC_API_KEY',
      message: 'API key seems too short - it may be invalid'
    });
  }

  // Validate PORT if specified
  if (process.env.PORT) {
    const port = parseInt(process.env.PORT);
    if (isNaN(port) || port < 1 || port > 65535) {
      errors.push({
        variable: 'PORT',
        message: 'PORT must be a valid number between 1 and 65535',
        howToFix: `Current value: ${process.env.PORT}. Use a valid port number.`
      });
    }
  }

  // Check for optional Google Calendar credentials
  const hasGoogleClientId = !!process.env.GOOGLE_CLIENT_ID;
  const hasGoogleClientSecret = !!process.env.GOOGLE_CLIENT_SECRET;

  if (hasGoogleClientId !== hasGoogleClientSecret) {
    warnings.push({
      variable: 'GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET',
      message: 'Both Google Client ID and Secret should be set together for OAuth'
    });
  }

  // Report errors
  if (errors.length > 0) {
    logger.fatal('\n❌ ENVIRONMENT VARIABLE ERRORS:\n');
    errors.forEach(err => {
      logger.error(`❌ ${err.variable}: ${err.message}`);
      if (err.howToFix) {
        logger.info(`💡 ${err.howToFix}`);
      }
    });

    logger.info('\n📝 To fix these errors:');
    logger.info('   1. Create a .env file in the backend/ directory');
    logger.info('   2. Add the required environment variables');
    logger.info('   3. See .env.example for a template\n');

    process.exit(1);
  }

  // Report warnings
  if (warnings.length > 0) {
    logger.warn('\n⚠️  ENVIRONMENT WARNINGS:');
    warnings.forEach(warn => {
      logger.warn(`⚠️  ${warn.variable}: ${warn.message}`);
    });
  }

  return {
    isValid: errors.length === 0,
    hasWarnings: warnings.length > 0,
    errors,
    warnings
  };
}

// Validate environment before starting server
const envValidation = validateEnvironment();

const app = express();
const port = process.env.PORT || 9002;

// Configure multer for file uploads
const upload = multer({ 
  dest: 'uploads/',
  limits: { fileSize: 10 * 1024 * 1024 } // 10MB limit
});

// Initialize Anthropic client
const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

// Middleware
app.use(express.json());

// Request logging middleware
app.use(logger.requestLogger());

// Rate limiting middleware (general limit for all routes)
app.use(generalLimiter.middleware());

// CORS middleware
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
  next();
});

// Static files
app.use(express.static(path.join(__dirname, 'frontend')));

// Create uploads directory if it doesn't exist
const uploadsDir = path.join(__dirname, 'uploads');
fs.mkdir(uploadsDir, { recursive: true }).catch(console.error);

// Calendar analysis endpoint (with strict rate limiting due to expensive Claude API calls)
app.post('/api/analyze-calendar', strictLimiter.middleware(), upload.single('calendar'), async (req, res, next) => {
  let imagePath = null;

  try {
    // Validate file upload
    if (!req.file) {
      throw new ApiError('No image file provided', 400, {
        expectedField: 'calendar',
        hint: 'Use multipart/form-data with field name "calendar"'
      });
    }

    imagePath = req.file.path;

    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
    if (!allowedTypes.includes(req.file.mimetype)) {
      throw new ApiError('Invalid file type', 400, {
        receivedType: req.file.mimetype,
        allowedTypes: allowedTypes
      });
    }

    // Validate file size
    const maxSize = 10 * 1024 * 1024; // 10MB
    if (req.file.size > maxSize) {
      throw new ApiError('File too large', 413, {
        fileSize: req.file.size,
        maxSize: maxSize,
        hint: 'Maximum file size is 10MB'
      });
    }

    logger.info('📸 Analyzing calendar image', {
      filename: req.file.originalname,
      fileSize: `${Math.round(req.file.size / 1024)}KB`,
      mimeType: req.file.mimetype
    });

    // Read the uploaded image
    let imageBuffer;
    try {
      imageBuffer = await fs.readFile(imagePath);
    } catch (readError) {
      throw new ApiError('Failed to read uploaded file', 500, {
        originalError: readError.message,
        filePath: imagePath
      });
    }

    const base64Image = imageBuffer.toString('base64');

    // Determine media type from file extension and MIME type
    const fileExtension = path.extname(req.file.originalname).toLowerCase();
    let mediaType = req.file.mimetype || 'image/jpeg';

    // Override with extension-based detection if MIME type is generic
    if (fileExtension === '.png') mediaType = 'image/png';
    else if (fileExtension === '.gif') mediaType = 'image/gif';
    else if (fileExtension === '.webp') mediaType = 'image/webp';
    else if (fileExtension === '.jpg' || fileExtension === '.jpeg') mediaType = 'image/jpeg';

    logger.debug('Media type determined', { mediaType });

    // Verify API key is available
    if (!process.env.ANTHROPIC_API_KEY) {
      throw new ApiError('Anthropic API key not configured', 500, {
        hint: 'Set ANTHROPIC_API_KEY in your .env file'
      });
    }

    // Analyze image with Claude Vision
    const prompt = `Please analyze this calendar image and extract all visible events. Look carefully for:
    - Event titles/names
    - Dates 
    - Times (if visible)
    - Any additional details or descriptions
    - Recurring events (like daily/weekly activities)

    Return the results as a JSON array where each event has this structure:
    {
      "title": "Event title or name",
      "date": "YYYY-MM-DD" (infer the year from context if not shown),
      "startTime": "HH:MM" (24-hour format, or null if not specified),
      "endTime": "HH:MM" (24-hour format, or null if not specified), 
      "description": "Any additional details visible",
      "location": "Location if visible, otherwise null"
    }

    Important guidelines:
    - Only extract events that are clearly visible and readable
    - If a time is not specified, set startTime and endTime to null
    - For all-day events, set both startTime and endTime to null
    - Be thorough - look for ALL events on the calendar, including small text
    - If you see recurring events (like daily exercise), include each instance
    - Infer reasonable descriptions from context when possible
    - Return ONLY the JSON array, no other text`;

    logger.info('🤖 Sending image to Claude Vision API...');

    let message;
    try {
      message = await anthropic.messages.create({
        model: "claude-3-5-sonnet-20241022",
        max_tokens: 4000,
        messages: [{
          role: "user",
          content: [
            {
              type: "image",
              source: {
                type: "base64",
                media_type: mediaType,
                data: base64Image
              }
            },
            {
              type: "text",
              text: prompt
            }
          ]
        }]
      });
    } catch (apiError) {
      throw new ApiError('Failed to call Anthropic API', 500, {
        originalError: apiError.message,
        hint: 'Check your API key and network connection',
        apiErrorType: apiError.constructor.name
      });
    }

    logger.info('✅ Received response from Claude API');

    // Clean up uploaded file
    try {
      await fs.unlink(imagePath);
      imagePath = null; // Mark as cleaned up
    } catch (unlinkError) {
      logger.warn('⚠️  Could not delete temporary file', { error: unlinkError.message });
    }

    // Parse Claude's response
    let events;
    try {
      const responseText = message.content[0].text.trim();
      logger.debug('📝 Claude response received', {
        responseLength: `${responseText.length} characters`
      });

      // Try to extract JSON from the response
      const jsonMatch = responseText.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        events = JSON.parse(jsonMatch[0]);
      } else {
        events = JSON.parse(responseText);
      }

      // Validate events array
      if (!Array.isArray(events)) {
        throw new Error('Response is not an array');
      }

      // Validate events using our validation utility
      logger.info('Validating extracted events...');
      const validation = validateEvents(events);

      if (!validation.isValid) {
        logger.warn('Some events failed validation', {
          errors: validation.errors
        });
        // Use only valid events
        events = validation.sanitized || [];
      } else {
        // All events valid, use sanitized version
        events = validation.sanitized;
        logger.info(`✅ All ${events.length} events validated successfully`);
      }

    } catch (parseError) {
      logger.error('❌ Error parsing Claude response', {
        error: parseError.message
      });

      throw new ApiError('Failed to parse calendar events from Claude response', 500, {
        parseError: parseError.message,
        rawResponseLength: message.content[0].text.length,
        rawResponsePreview: message.content[0].text.substring(0, 200),
        hint: 'Claude may not have found any events, or the response format was unexpected'
      });
    }

    logger.info(`✅ Successfully extracted ${events.length} events from calendar`, {
      eventCount: events.length,
      sourceFile: req.file.originalname
    });
    res.json({
      success: true,
      events: events,
      metadata: {
        eventCount: events.length,
        sourceFile: req.file.originalname,
        processedAt: new Date().toISOString()
      }
    });

  } catch (error) {
    logger.error('❌ Error analyzing calendar', {
      error: error.message,
      stack: error.stack
    });

    // Clean up uploaded file if it still exists
    if (imagePath) {
      try {
        await fs.unlink(imagePath);
      } catch (unlinkError) {
        logger.error('⚠️  Error cleaning up file', { error: unlinkError.message });
      }
    }

    // Pass error to global error handler
    next(error);
  }
});

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    environment: {
      hasAnthropicKey: !!process.env.ANTHROPIC_API_KEY,
      hasGoogleCredentials: !!(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET),
      port: port,
      nodeEnv: process.env.NODE_ENV || 'development'
    },
    validation: {
      isValid: envValidation.isValid,
      hasWarnings: envValidation.hasWarnings,
      errorCount: envValidation.errors.length,
      warningCount: envValidation.warnings.length
    }
  });
});

// Serve frontend
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'frontend', 'index.html'));
});

// =============================================================================
// Error Handling Middleware
// =============================================================================

/**
 * Custom error class for API errors
 */
class ApiError extends Error {
  constructor(message, statusCode = 500, details = null) {
    super(message);
    this.name = 'ApiError';
    this.statusCode = statusCode;
    this.details = details;
    this.timestamp = new Date().toISOString();
  }
}

/**
 * 404 Not Found handler
 */
app.use((req, res, next) => {
  const error = new ApiError(`Route not found: ${req.method} ${req.path}`, 404);
  next(error);
});

/**
 * Global error handler
 * Handles all errors and sends appropriate responses
 */
app.use((err, req, res, next) => {
  // Log error details
  logger.error('🔴 ERROR OCCURRED', {
    timestamp: err.timestamp || new Date().toISOString(),
    route: `${req.method} ${req.path}`,
    message: err.message,
    stack: err.stack,
    details: err.details
  });

  // Determine status code
  const statusCode = err.statusCode || 500;

  // Build error response
  const errorResponse = {
    error: {
      message: err.message || 'Internal server error',
      timestamp: err.timestamp || new Date().toISOString(),
      path: req.path,
      method: req.method
    }
  };

  // Add details in development mode
  if (process.env.NODE_ENV !== 'production') {
    errorResponse.error.details = err.details;
    errorResponse.error.stack = err.stack;
  }

  // Add helpful messages for common errors
  if (statusCode === 404) {
    errorResponse.error.suggestion = 'Check the URL and try again. Available endpoints: /api/analyze-calendar, /api/health';
  } else if (statusCode === 413) {
    errorResponse.error.suggestion = 'File is too large. Maximum size is 10MB.';
  } else if (statusCode === 400) {
    errorResponse.error.suggestion = 'Check your request parameters and try again.';
  } else if (statusCode === 500) {
    errorResponse.error.suggestion = 'An unexpected error occurred. Check server logs for details.';
  }

  res.status(statusCode).json(errorResponse);
});

// Start server
app.listen(port, () => {
  logger.info('='.repeat(60));
  logger.info('🚀 Calendar Photo Converter API Server');
  logger.info(`📄 Server running on http://localhost:${port}`);
  logger.info(`🤖 Claude API Key: ${process.env.ANTHROPIC_API_KEY ? 'Configured ✅' : 'Missing ❌'}`);
  logger.info(`📊 Environment: ${process.env.NODE_ENV || 'development'}`);
  logger.info(`📝 Logging level: ${process.env.NODE_ENV === 'production' ? 'INFO' : 'DEBUG'}`);
  logger.info('⛔ Press Ctrl+C to stop');
  logger.info('='.repeat(60));
});
// =============================================================================
// Input Validation and Sanitization Utilities
// =============================================================================
//
// This module provides validation and sanitization functions to protect
// against common security vulnerabilities like XSS, SQL injection, and
// malformed input.
//
// =============================================================================

/**
 * Sanitizes a string by removing potentially dangerous HTML/script content
 * @param {string} input - The string to sanitize
 * @returns {string} - Sanitized string
 */
function sanitizeString(input) {
  if (typeof input !== 'string') {
    return '';
  }

  return input
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '') // Remove script tags and content
    .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '') // Remove style tags and content
    .replace(/<[^>]+>/g, '') // Remove all HTML tags
    .replace(/javascript:/gi, '') // Remove javascript: protocol
    .replace(/on\w+\s*=\s*["']?[^"'\s]*["']?/gi, '') // Remove event handlers like onclick="..."
    .replace(/&lt;/g, '') // Remove HTML entities
    .replace(/&gt;/g, '')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#x27;/g, "'")
    .trim();
}

/**
 * Validates and sanitizes an event title
 * @param {string} title - Event title
 * @returns {object} - { isValid, sanitized, error }
 */
function validateEventTitle(title) {
  if (!title || typeof title !== 'string') {
    return {
      isValid: false,
      sanitized: null,
      error: 'Title is required and must be a string'
    };
  }

  const sanitized = sanitizeString(title);

  if (sanitized.length === 0) {
    return {
      isValid: false,
      sanitized: null,
      error: 'Title cannot be empty after sanitization'
    };
  }

  if (sanitized.length > 500) {
    return {
      isValid: false,
      sanitized: null,
      error: 'Title is too long (max 500 characters)'
    };
  }

  return {
    isValid: true,
    sanitized: sanitized,
    error: null
  };
}

/**
 * Validates a date string (YYYY-MM-DD format)
 * @param {string} dateString - Date to validate
 * @returns {object} - { isValid, sanitized, error }
 */
function validateDate(dateString) {
  if (!dateString || typeof dateString !== 'string') {
    return {
      isValid: false,
      sanitized: null,
      error: 'Date is required and must be a string'
    };
  }

  // Check format YYYY-MM-DD
  const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
  if (!dateRegex.test(dateString)) {
    return {
      isValid: false,
      sanitized: null,
      error: 'Date must be in YYYY-MM-DD format'
    };
  }

  // Validate actual date
  const [year, month, day] = dateString.split('-').map(Number);
  const date = new Date(year, month - 1, day);

  // Check if the date is valid and matches the input
  // This catches cases like Feb 30 which JS would convert to March 2
  if (isNaN(date.getTime()) ||
      date.getFullYear() !== year ||
      date.getMonth() !== month - 1 ||
      date.getDate() !== day) {
    return {
      isValid: false,
      sanitized: null,
      error: 'Invalid date'
    };
  }

  // Check for reasonable date range (1900-2100)
  if (year < 1900 || year > 2100) {
    return {
      isValid: false,
      sanitized: null,
      error: 'Date must be between 1900 and 2100'
    };
  }

  return {
    isValid: true,
    sanitized: dateString,
    error: null
  };
}

/**
 * Validates a time string (HH:MM format)
 * @param {string} timeString - Time to validate
 * @param {boolean} optional - Whether time is optional
 * @returns {object} - { isValid, sanitized, error }
 */
function validateTime(timeString, optional = true) {
  if (!timeString || timeString === null || timeString === 'null') {
    if (optional) {
      return {
        isValid: true,
        sanitized: null,
        error: null
      };
    } else {
      return {
        isValid: false,
        sanitized: null,
        error: 'Time is required'
      };
    }
  }

  if (typeof timeString !== 'string') {
    return {
      isValid: false,
      sanitized: null,
      error: 'Time must be a string'
    };
  }

  // Check format HH:MM
  const timeRegex = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/;
  if (!timeRegex.test(timeString)) {
    return {
      isValid: false,
      sanitized: null,
      error: 'Time must be in HH:MM format (24-hour)'
    };
  }

  return {
    isValid: true,
    sanitized: timeString,
    error: null
  };
}

/**
 * Validates a description string
 * @param {string} description - Description to validate
 * @returns {object} - { isValid, sanitized, error }
 */
function validateDescription(description) {
  if (!description || description === null || description === 'null') {
    return {
      isValid: true,
      sanitized: '',
      error: null
    };
  }

  if (typeof description !== 'string') {
    return {
      isValid: false,
      sanitized: null,
      error: 'Description must be a string'
    };
  }

  const sanitized = sanitizeString(description);

  if (sanitized.length > 2000) {
    return {
      isValid: false,
      sanitized: null,
      error: 'Description is too long (max 2000 characters)'
    };
  }

  return {
    isValid: true,
    sanitized: sanitized,
    error: null
  };
}

/**
 * Validates a location string
 * @param {string} location - Location to validate
 * @returns {object} - { isValid, sanitized, error }
 */
function validateLocation(location) {
  if (!location || location === null || location === 'null') {
    return {
      isValid: true,
      sanitized: '',
      error: null
    };
  }

  if (typeof location !== 'string') {
    return {
      isValid: false,
      sanitized: null,
      error: 'Location must be a string'
    };
  }

  const sanitized = sanitizeString(location);

  if (sanitized.length > 500) {
    return {
      isValid: false,
      sanitized: null,
      error: 'Location is too long (max 500 characters)'
    };
  }

  return {
    isValid: true,
    sanitized: sanitized,
    error: null
  };
}

/**
 * Validates a complete event object
 * @param {object} event - Event object to validate
 * @returns {object} - { isValid, sanitized, errors }
 */
function validateEvent(event) {
  if (!event || typeof event !== 'object') {
    return {
      isValid: false,
      sanitized: null,
      errors: ['Event must be an object']
    };
  }

  const errors = [];
  const sanitized = {};

  // Validate title
  const titleValidation = validateEventTitle(event.title);
  if (!titleValidation.isValid) {
    errors.push(`Title: ${titleValidation.error}`);
  } else {
    sanitized.title = titleValidation.sanitized;
  }

  // Validate date
  const dateValidation = validateDate(event.date);
  if (!dateValidation.isValid) {
    errors.push(`Date: ${dateValidation.error}`);
  } else {
    sanitized.date = dateValidation.sanitized;
  }

  // Validate start time (optional)
  const startTimeValidation = validateTime(event.startTime, true);
  if (!startTimeValidation.isValid) {
    errors.push(`Start time: ${startTimeValidation.error}`);
  } else {
    sanitized.startTime = startTimeValidation.sanitized;
  }

  // Validate end time (optional)
  const endTimeValidation = validateTime(event.endTime, true);
  if (!endTimeValidation.isValid) {
    errors.push(`End time: ${endTimeValidation.error}`);
  } else {
    sanitized.endTime = endTimeValidation.sanitized;
  }

  // Validate description (optional)
  const descriptionValidation = validateDescription(event.description);
  if (!descriptionValidation.isValid) {
    errors.push(`Description: ${descriptionValidation.error}`);
  } else {
    sanitized.description = descriptionValidation.sanitized;
  }

  // Validate location (optional)
  const locationValidation = validateLocation(event.location);
  if (!locationValidation.isValid) {
    errors.push(`Location: ${locationValidation.error}`);
  } else {
    sanitized.location = locationValidation.sanitized;
  }

  return {
    isValid: errors.length === 0,
    sanitized: errors.length === 0 ? sanitized : null,
    errors: errors
  };
}

/**
 * Validates an array of events
 * @param {array} events - Array of events to validate
 * @returns {object} - { isValid, sanitized, errors }
 */
function validateEvents(events) {
  if (!Array.isArray(events)) {
    return {
      isValid: false,
      sanitized: null,
      errors: ['Events must be an array']
    };
  }

  if (events.length === 0) {
    return {
      isValid: false,
      sanitized: null,
      errors: ['Events array cannot be empty']
    };
  }

  if (events.length > 100) {
    return {
      isValid: false,
      sanitized: null,
      errors: ['Too many events (max 100 per request)']
    };
  }

  const sanitized = [];
  const errors = [];

  events.forEach((event, index) => {
    const validation = validateEvent(event);
    if (validation.isValid) {
      sanitized.push(validation.sanitized);
    } else {
      errors.push(`Event ${index}: ${validation.errors.join(', ')}`);
    }
  });

  return {
    isValid: errors.length === 0,
    sanitized: errors.length === 0 ? sanitized : null,
    errors: errors
  };
}

/**
 * Validates a file upload
 * @param {object} file - Multer file object
 * @param {object} options - Validation options
 * @returns {object} - { isValid, error }
 */
function validateFile(file, options = {}) {
  const {
    maxSize = 10 * 1024 * 1024, // 10MB default
    allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'],
    allowedExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp']
  } = options;

  if (!file) {
    return {
      isValid: false,
      error: 'No file provided'
    };
  }

  // Check file size
  if (file.size > maxSize) {
    return {
      isValid: false,
      error: `File too large. Maximum size is ${Math.round(maxSize / 1024 / 1024)}MB`
    };
  }

  // Check MIME type
  if (!allowedTypes.includes(file.mimetype)) {
    return {
      isValid: false,
      error: `Invalid file type. Allowed types: ${allowedTypes.join(', ')}`
    };
  }

  // Check file extension
  const ext = require('path').extname(file.originalname).toLowerCase();
  if (!allowedExtensions.includes(ext)) {
    return {
      isValid: false,
      error: `Invalid file extension. Allowed extensions: ${allowedExtensions.join(', ')}`
    };
  }

  return {
    isValid: true,
    error: null
  };
}

module.exports = {
  sanitizeString,
  validateEventTitle,
  validateDate,
  validateTime,
  validateDescription,
  validateLocation,
  validateEvent,
  validateEvents,
  validateFile
};

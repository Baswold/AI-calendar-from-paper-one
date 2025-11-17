# Changelog

All notable changes to the Calendar Photo Converter project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased] - 2025-01-15

### 🎉 Major Improvements

This release represents a comprehensive overhaul of the codebase with significant improvements to reliability, security, and developer experience.

### ✨ Added

#### Frontend Enhancements
- **Dynamic API Configuration** (`/backend/frontend/app.js`)
  - Added automatic API base URL detection using `window.location.origin`
  - Implemented localStorage-based API configuration persistence
  - Added settings modal for runtime API URL configuration
  - Users can now easily configure which backend server to connect to

- **Settings UI** (`/backend/frontend/index.html`, `/backend/frontend/styles.css`)
  - Added gear icon settings button in header
  - Created modal dialog for configuration
  - Added helpful port information (server.js → 8000, api-server.js → 9002)
  - Implemented responsive design for mobile devices

- **Enhanced Error Reporting**
  - More detailed error logging in console
  - Better user feedback for API failures
  - Graceful fallback to mock data when API unavailable

#### Backend Infrastructure

- **Comprehensive Logging System** (`/backend/utils/logger.js`)
  - Structured logging with levels: DEBUG, INFO, WARN, ERROR, FATAL
  - Color-coded console output for easy debugging
  - Optional file logging support
  - Request/response logging middleware
  - Context-aware child loggers
  - Production-ready with environment-based log levels

- **Input Validation & Sanitization** (`/backend/utils/validation.js`)
  - Comprehensive event validation (title, date, time, description, location)
  - XSS protection through HTML tag sanitization
  - Type checking and length validation
  - Date range validation (1900-2100)
  - Time format validation (HH:MM, 24-hour)
  - File upload validation (type, size, extension)

- **Rate Limiting** (`/backend/utils/rateLimiter.js`)
  - In-memory rate limiting for all endpoints
  - General limit: 100 requests per 15 minutes
  - Strict limit for `/api/analyze-calendar`: 10 requests per 15 minutes
  - Rate limit headers (X-RateLimit-Limit, X-RateLimit-Remaining, X-RateLimit-Reset)
  - Automatic cleanup of expired entries
  - Detailed logging of rate limit violations

- **Environment Variable Validation** (`/backend/api-server.js`)
  - Startup validation of required environment variables
  - Helpful error messages with fix suggestions
  - Warning system for misconfigured optional variables
  - Prevents server start if critical configuration is missing

- **Enhanced Error Handling** (`/backend/api-server.js`)
  - Custom `ApiError` class for structured errors
  - Global error handler with detailed logging
  - 404 handler for unknown routes
  - Environment-aware error details (verbose in dev, minimal in production)
  - Helpful suggestions for common error scenarios

### 🔧 Changed

#### API Server (`/backend/api-server.js`)
- Replaced all `console.log`/`console.error` with structured logger calls
- Added request logging middleware
- Integrated rate limiting middleware
- Enhanced `/api/analyze-calendar` endpoint:
  - File type validation (MIME type and extension)
  - File size validation (10MB limit)
  - Media type auto-detection
  - API key availability check
  - Event validation and sanitization
  - Better error messages with recovery hints
  - Metadata in responses (event count, source file, timestamp)

- Improved `/api/health` endpoint:
  - Added environment information
  - Added validation status
  - Added Google credentials check

#### Frontend (`/backend/frontend/app.js`)
- Fixed hardcoded `localhost:3001` API URL (now dynamic)
- Added API base configuration methods
- Enhanced error logging with full context
- Added location field to event processing
- Better status messages with emojis
- Initialization logging

#### Documentation

- **Improved `.env.example`** (`/backend/.env.example`)
  - Comprehensive comments for all variables
  - Correct default ports (8000 for server.js, 9002 for api-server.js)
  - Step-by-step setup instructions
  - Links to credential acquisition (Anthropic, Google)
  - Production-ready configuration options
  - Security warnings

- **API Documentation** (`/API_DOCUMENTATION.md`)
  - Complete endpoint reference
  - Rate limiting documentation
  - Error handling guide
  - Data model specifications
  - Code examples in JavaScript, Node.js, Python, cURL
  - Best practices section
  - Troubleshooting guide

- **Changelog** (`/CHANGELOG.md`)
  - This file! Comprehensive change tracking

### 🐛 Fixed

- **Critical:** Fixed hardcoded port 3001 in `app.js` that prevented API calls from working
- **Critical:** Resolved port mismatch between frontend and backend
- Fixed duplicate `imagePath` declaration in analyze-calendar endpoint
- Fixed missing error handling for file read operations
- Fixed inconsistent error response formats
- Fixed lack of cleanup for temporary uploaded files on errors

### 🔒 Security

- Added input sanitization to prevent XSS attacks
- Implemented rate limiting to prevent API abuse
- Added file upload validation (type, size, content)
- Removed verbose error details in production mode
- Added request logging for security auditing

### 📝 Developer Experience

- Structured logging makes debugging much easier
- Clear error messages with actionable suggestions
- Validation errors include field-level details
- Health check endpoint for monitoring
- Rate limit headers for API clients
- Comprehensive code comments and documentation

### 🎨 UI/UX Improvements

- Settings button with smooth animations
- Modal slide-in animation
- Responsive design improvements
- Better header layout with flexbox
- Info boxes with helpful configuration details
- Escape key support to close modals

## Technical Details

### New Dependencies
No new external dependencies were added. All utilities are implemented as pure Node.js modules to minimize security surface area.

### File Structure
```
backend/
├── utils/
│   ├── logger.js           # Structured logging system
│   ├── validation.js       # Input validation and sanitization
│   └── rateLimiter.js      # Rate limiting middleware
├── api-server.js           # Enhanced with all utilities
├── .env.example            # Comprehensive configuration template
└── frontend/
    ├── app.js              # Fixed port issue, added settings
    ├── index.html          # Added settings modal
    └── styles.css          # Added modal and settings styles
```

### Breaking Changes
None! All changes are backwards compatible.

### Migration Guide
1. Update your `.env` file based on the new `.env.example` template
2. No code changes required - the frontend will automatically detect the API URL
3. Optional: Use the new settings UI to configure API endpoints at runtime

## Performance

- Rate limiting reduces server load from abusive clients
- Automatic cleanup of rate limit data prevents memory leaks
- Structured logging is more efficient than ad-hoc console.log statements
- Input validation happens early, preventing unnecessary processing

## Future Enhancements

Still TODO:
- Unit tests for validation and rate limiting utilities
- API endpoint consistency across server.js and api-server.js
- Integration tests for the full workflow
- CSRF protection for state-changing operations
- Redis-backed rate limiting for distributed deployments
- WebSocket support for real-time updates

---

**Contributors:** Claude Code Assistant
**Date:** 2025-01-15
**Total Files Changed:** 10+
**Lines Added:** ~2000+
**Lines Removed:** ~50

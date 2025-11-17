# Developer Guide

Welcome to the Calendar Photo Converter development guide! This document will help you understand the codebase architecture, set up your development environment, and contribute to the project.

## Table of Contents

- [Architecture Overview](#architecture-overview)
- [Development Setup](#development-setup)
- [Project Structure](#project-structure)
- [Core Utilities](#core-utilities)
- [Testing](#testing)
- [Code Style](#code-style)
- [Common Tasks](#common-tasks)
- [Debugging](#debugging)
- [Performance](#performance)
- [Security](#security)

## Architecture Overview

The Calendar Photo Converter follows a **three-tier architecture**:

```
┌─────────────────────────────────────────────────────────┐
│                     Frontend Layer                       │
│  (HTML/CSS/JavaScript - Browser-based SPA)              │
│  - User Interface                                        │
│  - File Upload                                           │
│  - Event Display & Management                            │
│  - Settings Configuration                                │
└────────────────┬────────────────────────────────────────┘
                 │
                 │ HTTP/REST API
                 │
┌────────────────▼────────────────────────────────────────┐
│                    Backend Layer                         │
│  (Node.js/Express)                                       │
│  - API Endpoints                                         │
│  - Request Validation                                    │
│  - Rate Limiting                                         │
│  - Logging & Monitoring                                  │
└────────────────┬────────────────────────────────────────┘
                 │
                 │ HTTP API Calls
                 │
┌────────────────▼────────────────────────────────────────┐
│                  External Services                       │
│  - Anthropic Claude Vision API                          │
│  - Google Calendar API (planned)                         │
└─────────────────────────────────────────────────────────┘
```

### Design Principles

1. **Separation of Concerns**: Each module has a single, well-defined responsibility
2. **Security First**: Input validation, sanitization, and rate limiting at every level
3. **Observability**: Structured logging for debugging and monitoring
4. **Fail-Safe**: Graceful error handling with helpful user feedback
5. **Testability**: Pure functions with comprehensive test coverage

## Development Setup

### Prerequisites

- **Node.js** 14+ (LTS recommended)
- **npm** 6+ or **yarn** 1.22+
- **Anthropic API Key** (get from [console.anthropic.com](https://console.anthropic.com))
- **Git** for version control

### Quick Start

1. **Clone the repository**
   ```bash
   git clone https://github.com/yourusername/AI-calendar-from-paper-one.git
   cd AI-calendar-from-paper-one
   ```

2. **Install dependencies**
   ```bash
   cd backend
   npm install
   ```

3. **Configure environment**
   ```bash
   cp .env.example .env
   # Edit .env and add your ANTHROPIC_API_KEY
   ```

4. **Run tests**
   ```bash
   cd utils/__tests__
   node validation.test.js
   ```

5. **Start development server**
   ```bash
   cd backend
   npm start
   # or for Claude Vision API:
   node api-server.js
   ```

6. **Open in browser**
   ```
   http://localhost:8000  (server.js)
   http://localhost:9002  (api-server.js)
   ```

### Development vs Production

**Development Mode:**
```bash
NODE_ENV=development node api-server.js
```
- Verbose error messages
- DEBUG-level logging
- Full error stack traces in API responses
- CORS allows all origins

**Production Mode:**
```bash
NODE_ENV=production node api-server.js
```
- Minimal error messages
- INFO-level logging only
- No stack traces in API responses
- CORS should be configured to specific domains

## Project Structure

```
AI-calendar-from-paper-one/
│
├── backend/
│   ├── api-server.js              # Main API server with Claude integration
│   ├── server.js                  # Full-featured Express server
│   ├── server.py                  # Python HTTP server alternative
│   ├── package.json               # Node.js dependencies
│   ├── .env.example               # Environment configuration template
│   │
│   ├── utils/                     # Shared utilities
│   │   ├── logger.js              # Structured logging system
│   │   ├── rateLimiter.js         # Rate limiting middleware
│   │   ├── validation.js          # Input validation & sanitization
│   │   └── __tests__/             # Unit tests
│   │       └── validation.test.js # Validation utility tests
│   │
│   ├── frontend/                  # Frontend application (served by backend)
│   │   ├── index.html             # Main HTML file
│   │   ├── app.js                 # JavaScript application logic
│   │   └── styles.css             # CSS styling
│   │
│   └── uploads/                   # Temporary upload directory (gitignored)
│
├── frontend/                      # Alternative frontend (standalone)
│   ├── index.html
│   ├── script.js
│   └── styles.css
│
├── docs/
│   ├── API_DOCUMENTATION.md       # Complete API reference
│   ├── DEVELOPER_GUIDE.md         # This file
│   └── CHANGELOG.md               # Version history
│
├── README.md                      # Project overview
└── .gitignore                     # Git ignore rules
```

## Core Utilities

### Logger (`utils/logger.js`)

Structured logging with multiple levels and color-coded output.

**Usage:**
```javascript
const { logger } = require('./utils/logger');

logger.debug('Detailed debugging info', { userId: 123 });
logger.info('General information', { eventCount: 5 });
logger.warn('Warning message', { retryCount: 3 });
logger.error('Error occurred', { error: err.message });
logger.fatal('Critical error', { stack: err.stack });
```

**Creating child loggers:**
```javascript
const requestLogger = logger.child({ requestId: req.id });
requestLogger.info('Processing request'); // Includes requestId in all logs
```

**Request logging middleware:**
```javascript
app.use(logger.requestLogger());
```

### Rate Limiter (`utils/rateLimiter.js`)

In-memory rate limiting to prevent abuse.

**Usage:**
```javascript
const { generalLimiter, strictLimiter } = require('./utils/rateLimiter');

// Apply to all routes
app.use(generalLimiter.middleware());

// Apply strict limit to specific route
app.post('/api/expensive-operation',
  strictLimiter.middleware(),
  handler
);
```

**Custom rate limiter:**
```javascript
const { RateLimiter } = require('./utils/rateLimiter');

const customLimiter = new RateLimiter({
  windowMs: 60000,        // 1 minute
  maxRequests: 5,         // 5 requests per minute
  message: 'Slow down!'
});

app.use('/api/auth', customLimiter.middleware());
```

### Validation (`utils/validation.js`)

Comprehensive input validation and sanitization.

**Usage:**
```javascript
const {
  validateEvent,
  validateEvents,
  sanitizeString
} = require('./utils/validation');

// Validate single event
const result = validateEvent({
  title: 'Team Meeting',
  date: '2025-01-15',
  startTime: '10:00'
});

if (result.isValid) {
  // Use result.sanitized - safe, sanitized data
  saveEvent(result.sanitized);
} else {
  // Handle validation errors
  console.error(result.errors);
}

// Validate array of events
const eventsResult = validateEvents(eventsArray);

// Sanitize user input
const safeName = sanitizeString(userInput);
```

**Validation rules:**
- **Title**: 1-500 chars, HTML stripped
- **Date**: YYYY-MM-DD format, 1900-2100 range
- **Time**: HH:MM format, 00:00-23:59
- **Description**: 0-2000 chars, HTML stripped
- **Location**: 0-500 chars, HTML stripped

## Testing

### Running Tests

```bash
# Run validation tests
cd backend/utils/__tests__
node validation.test.js

# Expected output:
# ✨ All tests passed! ✨
# Success Rate: 100.0%
```

### Writing Tests

Our test framework is simple and dependency-free:

```javascript
describe('My Feature', () => {
  it('should do something', () => {
    const result = myFunction();
    assert(result === expected, 'Result should match expected');
  });

  it('should handle errors', () => {
    const result = myFunction(invalidInput);
    assert(!result.isValid, 'Should reject invalid input');
  });
});
```

### Test Coverage

Current test coverage:
- **Validation utilities**: 72 tests, 100% pass rate
- **Logger**: Manual testing (TODO: automated tests)
- **Rate limiter**: Manual testing (TODO: automated tests)

## Code Style

### JavaScript Style Guide

Follow these conventions:

**Function Documentation:**
```javascript
/**
 * Brief description of what the function does
 * @param {string} param1 - Description of param1
 * @param {number} param2 - Description of param2
 * @returns {object} - Description of return value
 */
function myFunction(param1, param2) {
  // Implementation
}
```

**Error Handling:**
```javascript
// Use try-catch for async operations
try {
  const result = await riskyOperation();
  logger.info('Operation succeeded', { result });
} catch (error) {
  logger.error('Operation failed', { error: error.message });
  throw new ApiError('Operation failed', 500);
}
```

**Naming Conventions:**
- **Variables**: camelCase (`userName`, `eventCount`)
- **Constants**: UPPER_SNAKE_CASE (`MAX_FILE_SIZE`, `DEFAULT_PORT`)
- **Classes**: PascalCase (`ApiError`, `RateLimiter`)
- **Files**: kebab-case (`rate-limiter.js`, `api-server.js`)

### Code Organization

**Module structure:**
```javascript
// 1. Imports
const express = require('express');
const { logger } = require('./utils/logger');

// 2. Constants
const MAX_FILE_SIZE = 10 * 1024 * 1024;
const DEFAULT_PORT = 8000;

// 3. Helper functions
function helperFunction() { }

// 4. Main logic
function mainFunction() { }

// 5. Exports
module.exports = { mainFunction };
```

## Common Tasks

### Adding a New API Endpoint

1. **Define the endpoint in api-server.js:**
   ```javascript
   app.post('/api/my-endpoint', async (req, res, next) => {
     try {
       // 1. Validate input
       const validation = validateMyInput(req.body);
       if (!validation.isValid) {
         throw new ApiError('Invalid input', 400, validation.errors);
       }

       // 2. Process request
       const result = await processRequest(validation.sanitized);

       // 3. Log success
       logger.info('Request processed', { result });

       // 4. Send response
       res.json({ success: true, data: result });
     } catch (error) {
       next(error); // Pass to error handler
     }
   });
   ```

2. **Add validation function in utils/validation.js:**
   ```javascript
   function validateMyInput(input) {
     // Validation logic
     return { isValid: true, sanitized: input, errors: [] };
   }
   ```

3. **Add tests in utils/__tests__/:**
   ```javascript
   describe('validateMyInput', () => {
     it('should accept valid input', () => {
       const result = validateMyInput({ field: 'value' });
       assert(result.isValid, 'Should be valid');
     });
   });
   ```

4. **Document in API_DOCUMENTATION.md**

### Adding Rate Limiting to a Route

```javascript
const { RateLimiter } = require('./utils/rateLimiter');

const myLimiter = new RateLimiter({
  windowMs: 15 * 60 * 1000,  // 15 minutes
  maxRequests: 20,            // 20 requests per window
  message: 'Too many requests'
});

app.post('/api/my-route',
  myLimiter.middleware(),
  async (req, res) => {
    // Handler logic
  }
);
```

### Adding a New Validation Rule

```javascript
// In utils/validation.js

function validatePhoneNumber(phone) {
  if (!phone || typeof phone !== 'string') {
    return { isValid: false, sanitized: null, error: 'Phone required' };
  }

  const sanitized = phone.replace(/[^0-9+]/g, '');
  const phoneRegex = /^\+?[1-9]\d{1,14}$/;

  if (!phoneRegex.test(sanitized)) {
    return { isValid: false, sanitized: null, error: 'Invalid phone format' };
  }

  return { isValid: true, sanitized: sanitized, error: null };
}

module.exports = { validatePhoneNumber, /* ... */ };
```

## Debugging

### Enabling Debug Logging

```bash
# Set NODE_ENV to development
NODE_ENV=development node api-server.js

# Or use DEBUG environment variable
DEBUG=* node api-server.js
```

### Common Issues

**Issue: API returns 500 errors**
- Check server logs for detailed error messages
- Verify ANTHROPIC_API_KEY is set correctly
- Check network connectivity

**Issue: Rate limit exceeded**
- Check `X-RateLimit-Remaining` header
- Wait for `X-RateLimit-Reset` time
- Adjust rate limits in development

**Issue: Validation always fails**
- Check input format matches validation rules
- Look at validation error details
- Test with minimal valid input first

### Logging Best Practices

```javascript
// DO: Log with context
logger.info('Processing image', {
  filename: file.originalname,
  size: file.size,
  userId: req.user.id
});

// DON'T: Log without context
logger.info('Processing');

// DO: Log errors with full details
logger.error('Failed to process', {
  error: error.message,
  stack: error.stack,
  input: sanitizedInput
});

// DON'T: Log sensitive data
logger.info('User logged in', { password: 'secret123' }); // BAD!
```

## Performance

### Optimization Tips

1. **Use streaming for large files**
   ```javascript
   const stream = fs.createReadStream(path);
   stream.pipe(response);
   ```

2. **Implement caching**
   ```javascript
   const cache = new Map();

   function getCachedData(key) {
     if (cache.has(key)) {
       return cache.get(key);
     }
     const data = expensiveOperation();
     cache.set(key, data);
     return data;
   }
   ```

3. **Use async/await properly**
   ```javascript
   // Good: Parallel execution
   const [result1, result2] = await Promise.all([
     operation1(),
     operation2()
   ]);

   // Bad: Sequential when not needed
   const result1 = await operation1();
   const result2 = await operation2();
   ```

### Monitoring

Key metrics to monitor:
- Request latency (response time)
- Error rate (4xx, 5xx responses)
- Rate limit hits
- Memory usage
- API call costs (Claude API)

## Security

### Security Checklist

- ✅ Input validation on all user inputs
- ✅ XSS protection through HTML sanitization
- ✅ Rate limiting to prevent abuse
- ✅ File upload validation (type, size)
- ✅ Error messages don't leak sensitive info
- ✅ Environment variables for secrets
- ⚠️ CSRF protection (TODO)
- ⚠️ SQL injection protection (N/A - no database yet)
- ⚠️ HTTPS in production (deployment-specific)

### Security Best Practices

1. **Never log sensitive data**
   ```javascript
   // Bad
   logger.info('User data', { password: user.password });

   // Good
   logger.info('User authenticated', { userId: user.id });
   ```

2. **Validate all inputs**
   ```javascript
   // Always validate before processing
   const validation = validateEvent(req.body);
   if (!validation.isValid) {
     return res.status(400).json({ errors: validation.errors });
   }
   ```

3. **Use parameterized queries** (when database is added)
   ```javascript
   // Good
   db.query('SELECT * FROM events WHERE id = ?', [eventId]);

   // Bad
   db.query(`SELECT * FROM events WHERE id = ${eventId}`);
   ```

4. **Keep dependencies updated**
   ```bash
   npm audit
   npm update
   ```

## Contributing

### Pull Request Process

1. Create a feature branch: `git checkout -b feature/my-feature`
2. Make changes with clear, focused commits
3. Write/update tests
4. Update documentation
5. Run tests: `node validation.test.js`
6. Create PR with description of changes

### Commit Message Format

```
<type>: <subject>

<body>

<footer>
```

**Types:**
- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation changes
- `test`: Test additions/changes
- `refactor`: Code refactoring
- `perf`: Performance improvements
- `chore`: Maintenance tasks

**Example:**
```
feat: Add phone number validation

Implement validatePhoneNumber function with E.164 format support.
Includes comprehensive test coverage.

Closes #123
```

## Resources

- [Anthropic API Documentation](https://docs.anthropic.com/)
- [Express.js Guide](https://expressjs.com/en/guide/routing.html)
- [Node.js Best Practices](https://github.com/goldbergyoni/nodebestpractices)
- [Security Best Practices](https://cheatsheetseries.owasp.org/)

## Need Help?

- Check the [API Documentation](API_DOCUMENTATION.md)
- Review the [Changelog](CHANGELOG.md)
- Look at existing code examples
- Run tests to understand expected behavior

---

**Happy coding! 🚀**

Last updated: 2025-01-15

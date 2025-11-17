# Calendar Photo Converter API Documentation

## Table of Contents
- [Overview](#overview)
- [Authentication](#authentication)
- [Rate Limiting](#rate-limiting)
- [Error Handling](#error-handling)
- [Endpoints](#endpoints)
- [Data Models](#data-models)
- [Code Examples](#code-examples)

## Overview

The Calendar Photo Converter API allows you to extract calendar events from images using Claude Vision AI. The API analyzes calendar photos and returns structured event data that can be integrated with Google Calendar or other calendar applications.

**Base URL:** `http://localhost:9002` (default for api-server.js)

**API Version:** 1.0

## Authentication

Currently, the API does not require authentication for basic operations. However, you need to configure your `ANTHROPIC_API_KEY` in the server's environment variables to enable AI-powered calendar extraction.

### Setting up API Keys

Create a `.env` file in the `backend/` directory:

```bash
ANTHROPIC_API_KEY=your_anthropic_api_key_here
PORT=9002
```

## Rate Limiting

The API implements rate limiting to prevent abuse and ensure fair usage:

### General Rate Limits
- **Limit:** 100 requests per 15 minutes per IP address
- **Applies to:** All endpoints

### Strict Rate Limits (Image Analysis)
- **Limit:** 10 requests per 15 minutes per IP address
- **Applies to:** `/api/analyze-calendar` endpoint
- **Reason:** Claude Vision API calls are resource-intensive and expensive

### Rate Limit Headers

All responses include rate limit information in headers:

```http
X-RateLimit-Limit: 10
X-RateLimit-Remaining: 7
X-RateLimit-Reset: 2025-01-15T10:30:00.000Z
```

### Rate Limit Exceeded Response

```json
{
  "error": {
    "message": "Too many image analysis requests. Please try again later.",
    "statusCode": 429,
    "retryAfter": 846,
    "limit": 10,
    "resetTime": "2025-01-15T10:30:00.000Z"
  }
}
```

## Error Handling

The API uses standard HTTP status codes and returns detailed error information:

### Error Response Format

```json
{
  "error": {
    "message": "Error description",
    "timestamp": "2025-01-15T10:15:30.000Z",
    "path": "/api/analyze-calendar",
    "method": "POST",
    "suggestion": "Helpful hint about fixing the error"
  }
}
```

### Common Status Codes

| Status Code | Description |
|-------------|-------------|
| 200 | Success |
| 400 | Bad Request - Invalid input |
| 404 | Not Found - Endpoint doesn't exist |
| 413 | Payload Too Large - File exceeds 10MB |
| 429 | Too Many Requests - Rate limit exceeded |
| 500 | Internal Server Error |

## Endpoints

### 1. Health Check

Check if the API server is running and properly configured.

**Endpoint:** `GET /api/health`

**Response:**

```json
{
  "status": "OK",
  "timestamp": "2025-01-15T10:15:30.000Z",
  "environment": {
    "hasAnthropicKey": true,
    "hasGoogleCredentials": false,
    "port": 9002,
    "nodeEnv": "development"
  },
  "validation": {
    "isValid": true,
    "hasWarnings": false,
    "errorCount": 0,
    "warningCount": 0
  }
}
```

**Example:**

```bash
curl http://localhost:9002/api/health
```

---

### 2. Analyze Calendar Image

Upload a calendar image and extract events using Claude Vision AI.

**Endpoint:** `POST /api/analyze-calendar`

**Content-Type:** `multipart/form-data`

**Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| calendar | File | Yes | Image file (JPG, PNG, GIF, WebP) - Max 10MB |

**Request Example:**

```bash
curl -X POST \
  http://localhost:9002/api/analyze-calendar \
  -F "calendar=@/path/to/calendar-photo.jpg"
```

**Success Response (200):**

```json
{
  "success": true,
  "events": [
    {
      "title": "Team Meeting",
      "date": "2025-01-20",
      "startTime": "10:00",
      "endTime": "11:00",
      "description": "Weekly team sync and project updates",
      "location": "Conference Room A"
    },
    {
      "title": "Doctor Appointment",
      "date": "2025-01-22",
      "startTime": "14:30",
      "endTime": null,
      "description": "Annual check-up",
      "location": "Medical Center"
    }
  ],
  "metadata": {
    "eventCount": 2,
    "sourceFile": "calendar-photo.jpg",
    "processedAt": "2025-01-15T10:15:30.000Z"
  }
}
```

**Error Response (400 - No File):**

```json
{
  "error": {
    "message": "No image file provided",
    "timestamp": "2025-01-15T10:15:30.000Z",
    "path": "/api/analyze-calendar",
    "method": "POST",
    "suggestion": "Check your request parameters and try again.",
    "details": {
      "expectedField": "calendar",
      "hint": "Use multipart/form-data with field name 'calendar'"
    }
  }
}
```

**Error Response (413 - File Too Large):**

```json
{
  "error": {
    "message": "File too large",
    "timestamp": "2025-01-15T10:15:30.000Z",
    "path": "/api/analyze-calendar",
    "method": "POST",
    "suggestion": "File is too large. Maximum size is 10MB.",
    "details": {
      "fileSize": 15728640,
      "maxSize": 10485760,
      "hint": "Maximum file size is 10MB"
    }
  }
}
```

## Data Models

### Event Object

```typescript
interface Event {
  title: string;          // Event title (required, max 500 chars)
  date: string;           // Date in YYYY-MM-DD format (required)
  startTime: string | null; // Time in HH:MM format (24-hour, optional)
  endTime: string | null;   // Time in HH:MM format (24-hour, optional)
  description: string;    // Event description (optional, max 2000 chars)
  location: string;       // Event location (optional, max 500 chars)
}
```

### Validation Rules

- **title:** 1-500 characters, HTML/script tags sanitized
- **date:** Must be valid date between 1900-2100
- **startTime/endTime:** HH:MM format, 00:00-23:59 range
- **description:** 0-2000 characters, HTML/script tags sanitized
- **location:** 0-500 characters, HTML/script tags sanitized

## Code Examples

### JavaScript (Browser - Fetch API)

```javascript
async function analyzeCalendar(imageFile) {
  const formData = new FormData();
  formData.append('calendar', imageFile);

  try {
    const response = await fetch('http://localhost:9002/api/analyze-calendar', {
      method: 'POST',
      body: formData
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error.message);
    }

    const data = await response.json();
    console.log(`Found ${data.events.length} events!`);
    return data.events;
  } catch (error) {
    console.error('Error analyzing calendar:', error);
    throw error;
  }
}

// Usage
const fileInput = document.getElementById('fileInput');
fileInput.addEventListener('change', async (event) => {
  const file = event.target.files[0];
  if (file) {
    const events = await analyzeCalendar(file);
    displayEvents(events);
  }
});
```

### JavaScript (Node.js)

```javascript
const fs = require('fs');
const FormData = require('form-data');
const axios = require('axios');

async function analyzeCalendar(imagePath) {
  const formData = new FormData();
  formData.append('calendar', fs.createReadStream(imagePath));

  try {
    const response = await axios.post(
      'http://localhost:9002/api/analyze-calendar',
      formData,
      {
        headers: formData.getHeaders()
      }
    );

    console.log(`Success! Found ${response.data.events.length} events`);
    return response.data.events;
  } catch (error) {
    if (error.response) {
      console.error('API Error:', error.response.data.error);
    } else {
      console.error('Network Error:', error.message);
    }
    throw error;
  }
}

// Usage
analyzeCalendar('./calendar-photo.jpg')
  .then(events => {
    events.forEach(event => {
      console.log(`${event.date} - ${event.title}`);
    });
  })
  .catch(error => {
    console.error('Failed to analyze calendar');
  });
```

### Python

```python
import requests
import json

def analyze_calendar(image_path):
    """Analyze a calendar image and extract events."""
    url = 'http://localhost:9002/api/analyze-calendar'

    with open(image_path, 'rb') as file:
        files = {'calendar': file}
        response = requests.post(url, files=files)

    if response.status_code == 200:
        data = response.json()
        print(f"Success! Found {len(data['events'])} events")
        return data['events']
    else:
        error = response.json()
        print(f"Error: {error['error']['message']}")
        return None

# Usage
events = analyze_calendar('calendar-photo.jpg')
if events:
    for event in events:
        print(f"{event['date']} - {event['title']}")
```

### cURL

```bash
# Basic request
curl -X POST \
  http://localhost:9002/api/analyze-calendar \
  -F "calendar=@calendar-photo.jpg"

# With pretty-printed JSON output
curl -X POST \
  http://localhost:9002/api/analyze-calendar \
  -F "calendar=@calendar-photo.jpg" \
  | python -m json.tool

# Save response to file
curl -X POST \
  http://localhost:9002/api/analyze-calendar \
  -F "calendar=@calendar-photo.jpg" \
  -o events.json

# Check health
curl http://localhost:9002/api/health
```

## Best Practices

### 1. Image Quality

For best results:
- Use high-resolution images (at least 1024x768)
- Ensure good lighting and minimal glare
- Capture the calendar straight-on (avoid angles)
- Include the entire calendar month in the frame

### 2. Error Handling

Always implement proper error handling:

```javascript
async function safeAnalyzeCalendar(imageFile) {
  try {
    const events = await analyzeCalendar(imageFile);
    return { success: true, events };
  } catch (error) {
    // Handle rate limiting
    if (error.response?.status === 429) {
      const retryAfter = error.response.data.error.retryAfter;
      return {
        success: false,
        error: 'Rate limit exceeded',
        retryAfter: retryAfter
      };
    }

    // Handle file size errors
    if (error.response?.status === 413) {
      return {
        success: false,
        error: 'File too large',
        suggestion: 'Please compress the image to under 10MB'
      };
    }

    // Handle other errors
    return {
      success: false,
      error: error.message
    };
  }
}
```

### 3. Rate Limit Handling

Respect rate limits and implement backoff:

```javascript
async function analyzeWithRetry(imageFile, maxRetries = 3) {
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await analyzeCalendar(imageFile);
    } catch (error) {
      if (error.response?.status === 429 && i < maxRetries - 1) {
        const retryAfter = error.response.data.error.retryAfter;
        console.log(`Rate limited. Retrying after ${retryAfter} seconds...`);
        await new Promise(resolve => setTimeout(resolve, retryAfter * 1000));
        continue;
      }
      throw error;
    }
  }
}
```

## Troubleshooting

### Issue: "Anthropic API key not configured"

**Solution:** Set your API key in the `.env` file:
```bash
ANTHROPIC_API_KEY=sk-ant-api03-xxxxxxxxxxxxx
```

### Issue: "No events found in the uploaded images"

**Possible causes:**
- Image quality is too low
- Calendar text is not clearly visible
- Image doesn't contain a calendar

**Solutions:**
- Use a higher resolution image
- Ensure good lighting
- Try a different calendar photo

### Issue: Rate limit exceeded

**Solution:** Wait for the rate limit window to reset or reduce request frequency.

## Support

For issues or questions:
- Check server logs for detailed error information
- Verify environment configuration in `.env.example`
- Ensure all dependencies are installed: `npm install`

---

**Last Updated:** 2025-01-15
**API Version:** 1.0.0

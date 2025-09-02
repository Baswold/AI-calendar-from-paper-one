const express = require('express');
const multer = require('multer');
const { Anthropic } = require('@anthropic-ai/sdk');
const fs = require('fs').promises;
const path = require('path');
require('dotenv').config();

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
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
  next();
});
app.use(express.static(path.join(__dirname, 'frontend')));

// Create uploads directory if it doesn't exist
const uploadsDir = path.join(__dirname, 'uploads');
fs.mkdir(uploadsDir, { recursive: true }).catch(console.error);

// Calendar analysis endpoint
app.post('/api/analyze-calendar', upload.single('calendar'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No image file provided' });
    }

    console.log('Analyzing calendar image:', req.file.originalname);
    
    // Read the uploaded image
    const imagePath = req.file.path;
    const imageBuffer = await fs.readFile(imagePath);
    const base64Image = imageBuffer.toString('base64');
    
    // Determine media type
    const fileExtension = path.extname(req.file.originalname).toLowerCase();
    let mediaType = 'image/jpeg';
    if (fileExtension === '.png') mediaType = 'image/png';
    if (fileExtension === '.gif') mediaType = 'image/gif';
    if (fileExtension === '.webp') mediaType = 'image/webp';

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

    console.log('Sending image to Claude Vision API...');
    
    const message = await anthropic.messages.create({
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

    // Clean up uploaded file
    await fs.unlink(imagePath);

    // Parse Claude's response
    let events;
    try {
      const responseText = message.content[0].text.trim();
      console.log('Claude response:', responseText);
      
      // Try to extract JSON from the response
      const jsonMatch = responseText.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        events = JSON.parse(jsonMatch[0]);
      } else {
        events = JSON.parse(responseText);
      }
    } catch (parseError) {
      console.error('Error parsing Claude response:', parseError);
      console.log('Raw response:', message.content[0].text);
      return res.status(500).json({ 
        error: 'Failed to parse calendar events from image',
        rawResponse: message.content[0].text
      });
    }

    console.log(`Successfully extracted ${events.length} events from calendar`);
    res.json({ events });

  } catch (error) {
    console.error('Error analyzing calendar:', error);
    
    // Clean up uploaded file if it exists
    if (req.file) {
      try {
        await fs.unlink(req.file.path);
      } catch (unlinkError) {
        console.error('Error cleaning up file:', unlinkError);
      }
    }
    
    res.status(500).json({ 
      error: 'Failed to analyze calendar image',
      details: error.message 
    });
  }
});

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    hasAnthropicKey: !!process.env.ANTHROPIC_API_KEY
  });
});

// Serve frontend
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'frontend', 'index.html'));
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Server error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

// Start server
app.listen(port, () => {
  console.log('🚀 Calendar Photo Converter API Server');
  console.log(`📄 Server running on http://localhost:${port}`);
  console.log(`🤖 Claude API Key: ${process.env.ANTHROPIC_API_KEY ? 'Configured ✅' : 'Missing ❌'}`);
  console.log('⛔ Press Ctrl+C to stop');
});
#!/usr/bin/env node

/**
 * Calendar Photo Converter - Node.js Express Server
 * A robust, full-featured server for the calendar photo converter application.
 */

const express = require('express');
const path = require('path');
const fs = require('fs');
const multer = require('multer');
const cors = require('cors');

// Check if required modules are available
const requiredModules = ['express', 'multer', 'cors'];
const missingModules = [];

requiredModules.forEach(module => {
    try {
        require.resolve(module);
    } catch (e) {
        missingModules.push(module);
    }
});

if (missingModules.length > 0) {
    console.log('❌ Missing required Node.js modules:', missingModules.join(', '));
    console.log('📦 Please install them by running:');
    console.log(`   npm install ${missingModules.join(' ')}`);
    console.log('\nOr use the Python server instead: python3 server.py');
    process.exit(1);
}

const app = express();

// Configuration
const PORT = process.env.PORT || 8000;
const FRONTEND_DIR = path.join(__dirname, 'frontend');

// Middleware
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Configure multer for file uploads
const storage = multer.memoryStorage();
const upload = multer({
    storage: storage,
    limits: {
        fileSize: 10 * 1024 * 1024, // 10MB limit
    },
    fileFilter: (req, file, cb) => {
        if (file.mimetype.startsWith('image/')) {
            cb(null, true);
        } else {
            cb(new Error('Only image files are allowed!'), false);
        }
    }
});

// Serve static files from frontend directory
app.use(express.static(FRONTEND_DIR));

// API Routes

// Health check endpoint
app.get('/api/status', (req, res) => {
    res.json({
        status: 'running',
        message: 'Calendar Photo Converter server is running',
        timestamp: new Date().toISOString(),
        version: '1.0.0'
    });
});

// Image processing endpoint (placeholder)
app.post('/api/process-images', upload.array('images', 10), async (req, res) => {
    try {
        if (!req.files || req.files.length === 0) {
            return res.status(400).json({
                status: 'error',
                message: 'No images uploaded'
            });
        }

        console.log(`📸 Processing ${req.files.length} images...`);

        // Simulate processing delay
        await new Promise(resolve => setTimeout(resolve, 1000));

        // Generate mock events (in real implementation, this would use Claude Vision API)
        const mockEvents = generateMockEvents(req.files);

        res.json({
            status: 'success',
            message: `Processed ${req.files.length} images`,
            events: mockEvents,
            images_processed: req.files.length
        });

    } catch (error) {
        console.error('Error processing images:', error);
        res.status(500).json({
            status: 'error',
            message: 'Failed to process images',
            error: error.message
        });
    }
});

// Google OAuth endpoint (placeholder)
app.get('/api/auth/google', (req, res) => {
    // In a real implementation, this would initiate OAuth flow
    res.json({
        status: 'success',
        message: 'Google OAuth would be implemented here',
        auth_url: 'https://accounts.google.com/oauth2/auth',
        client_id: 'placeholder_client_id'
    });
});

// Google OAuth callback (placeholder)
app.get('/api/auth/callback', (req, res) => {
    const { code } = req.query;
    
    // In a real implementation, this would exchange code for tokens
    res.json({
        status: 'success',
        message: 'OAuth callback processed',
        code: code ? 'received' : 'missing'
    });
});

// Add events to Google Calendar (placeholder)
app.post('/api/calendar/add-events', (req, res) => {
    const { events } = req.body;
    
    if (!events || !Array.isArray(events)) {
        return res.status(400).json({
            status: 'error',
            message: 'Invalid events data'
        });
    }

    // Simulate adding events to calendar
    console.log(`📅 Adding ${events.length} events to Google Calendar...`);

    res.json({
        status: 'success',
        message: `Successfully added ${events.length} events to calendar`,
        events_added: events.length
    });
});

// Serve the main page for any non-API routes
app.get('*', (req, res) => {
    const indexPath = path.join(FRONTEND_DIR, 'index.html');
    
    if (fs.existsSync(indexPath)) {
        res.sendFile(indexPath);
    } else {
        res.status(404).send(`
            <h1>Frontend files not found</h1>
            <p>Please make sure the frontend directory exists at: ${FRONTEND_DIR}</p>
            <p>Expected files: index.html, styles.css, app.js</p>
        `);
    }
});

// Error handling middleware
app.use((error, req, res, next) => {
    if (error instanceof multer.MulterError) {
        if (error.code === 'LIMIT_FILE_SIZE') {
            return res.status(400).json({
                status: 'error',
                message: 'File too large. Maximum size is 10MB.'
            });
        }
    }
    
    console.error('Server error:', error);
    res.status(500).json({
        status: 'error',
        message: 'Internal server error',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
});

// Helper function to generate mock events
function generateMockEvents(files) {
    const eventTemplates = [
        {
            title: 'Team Meeting',
            date: '2024-01-15',
            time: '10:00 AM',
            description: 'Weekly team sync and project updates'
        },
        {
            title: 'Doctor Appointment',
            date: '2024-01-16',
            time: '2:30 PM',
            description: 'Annual check-up with Dr. Smith'
        },
        {
            title: 'Birthday Party',
            date: '2024-01-18',
            time: '7:00 PM',
            description: 'Sarah\'s surprise birthday celebration'
        },
        {
            title: 'Conference Call',
            date: '2024-01-20',
            time: '11:00 AM',
            description: 'Client presentation and Q&A session'
        },
        {
            title: 'Gym Session',
            date: '2024-01-22',
            time: '6:00 AM',
            description: 'Morning workout with personal trainer'
        },
        {
            title: 'Dinner Reservation',
            date: '2024-01-25',
            time: '8:00 PM',
            description: 'Anniversary dinner at The Rose Restaurant'
        }
    ];

    const events = [];
    
    files.forEach((file, index) => {
        // Generate 1-3 events per image
        const numEvents = Math.floor(Math.random() * 3) + 1;
        
        for (let i = 0; i < numEvents; i++) {
            const template = eventTemplates[Math.floor(Math.random() * eventTemplates.length)];
            events.push({
                ...template,
                id: `${Date.now()}-${index}-${i}`,
                sourceImage: file.originalname,
                confidence: Math.floor(Math.random() * 30) + 70 // 70-100% confidence
            });
        }
    });

    return events;
}

// Find available port
function findAvailablePort(startPort = 8000) {
    return new Promise((resolve, reject) => {
        const server = require('net').createServer();
        
        server.listen(startPort, () => {
            const port = server.address().port;
            server.close(() => resolve(port));
        });
        
        server.on('error', (err) => {
            if (err.code === 'EADDRINUSE') {
                resolve(findAvailablePort(startPort + 1));
            } else {
                reject(err);
            }
        });
    });
}

// Start the server
async function startServer() {
    try {
        // Check if frontend directory exists
        if (!fs.existsSync(FRONTEND_DIR)) {
            console.log('❌ Error: Frontend directory not found at:', FRONTEND_DIR);
            console.log('Please make sure all files are in the correct location.');
            process.exit(1);
        }

        // Check if main frontend files exist
        const requiredFiles = ['index.html', 'styles.css', 'app.js'];
        const missingFiles = requiredFiles.filter(file => 
            !fs.existsSync(path.join(FRONTEND_DIR, file))
        );

        if (missingFiles.length > 0) {
            console.log('⚠️  Warning: Missing frontend files:', missingFiles.join(', '));
            console.log('The application may not work correctly.');
        }

        // Find available port
        const availablePort = await findAvailablePort(PORT);
        
        // Start server
        const server = app.listen(availablePort, () => {
            const serverUrl = `http://localhost:${availablePort}`;
            
            console.log('='.repeat(60));
            console.log('🚀 Calendar Photo Converter Server Starting...');
            console.log('='.repeat(60));
            console.log(`✅ Server running at: ${serverUrl}`);
            console.log(`📁 Serving files from: ${FRONTEND_DIR}`);
            console.log(`🌐 Open in browser: ${serverUrl}`);
            console.log('='.repeat(60));
            console.log('🛑 Press Ctrl+C to stop the server');
            console.log('='.repeat(60));

            // Try to open browser automatically
            setTimeout(() => {
                const open = require('child_process').exec;
                const command = process.platform === 'darwin' ? 'open' :
                               process.platform === 'win32' ? 'start' : 'xdg-open';
                
                open(`${command} ${serverUrl}`, (error) => {
                    if (error) {
                        console.log(`⚠️  Could not open browser automatically: ${error.message}`);
                        console.log(`Please manually open: ${serverUrl}`);
                    } else {
                        console.log(`🌐 Opened ${serverUrl} in your default browser`);
                    }
                });
            }, 1500);
        });

        // Graceful shutdown
        process.on('SIGINT', () => {
            console.log('\n🛑 Shutting down server gracefully...');
            server.close(() => {
                console.log('✅ Server closed successfully');
                process.exit(0);
            });
        });

        process.on('SIGTERM', () => {
            console.log('🛑 Received SIGTERM, shutting down gracefully...');
            server.close(() => {
                console.log('✅ Server closed successfully');
                process.exit(0);
            });
        });

    } catch (error) {
        console.error('❌ Failed to start server:', error);
        process.exit(1);
    }
}

// Start the server if this file is run directly
if (require.main === module) {
    startServer();
}

module.exports = { app, startServer };
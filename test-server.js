#!/usr/bin/env node

const http = require('http');
const fs = require('fs');
const path = require('path');
const url = require('url');

const PORT = 3001;
const HOST = 'localhost';

// MIME types
const mimeTypes = {
  '.html': 'text/html',
  '.css': 'text/css',
  '.js': 'application/javascript',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon'
};

function serveFile(filePath, res) {
  fs.readFile(filePath, (err, content) => {
    if (err) {
      console.error(`Error reading file ${filePath}:`, err.message);
      res.writeHead(500, { 'Content-Type': 'text/plain' });
      res.end('Internal Server Error');
      return;
    }
    
    const ext = path.extname(filePath).toLowerCase();
    const contentType = mimeTypes[ext] || 'application/octet-stream';
    
    res.writeHead(200, { 'Content-Type': contentType });
    res.end(content);
  });
}

function serve404(res, requestedPath) {
  const html404 = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Calendar App - File Not Found</title>
        <style>
            body { 
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; 
                text-align: center; 
                margin-top: 100px; 
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                color: white;
                min-height: 100vh;
                display: flex;
                align-items: center;
                justify-content: center;
                flex-direction: column;
            }
            .container {
                background: rgba(255,255,255,0.1);
                padding: 40px;
                border-radius: 12px;
                backdrop-filter: blur(10px);
            }
            h1 { font-size: 2.5em; margin-bottom: 20px; }
            p { font-size: 1.2em; margin: 10px 0; }
            a { color: #fff; text-decoration: underline; }
            code { background: rgba(0,0,0,0.3); padding: 4px 8px; border-radius: 4px; }
        </style>
    </head>
    <body>
        <div class="container">
            <h1>📅 Calendar App - Development Server</h1>
            <h2>404 - File Not Found</h2>
            <p>The file <code>${requestedPath}</code> was not found.</p>
            <p><a href="/">🏠 Go to Home</a></p>
            <hr style="margin: 30px 0; opacity: 0.3;">
            <p><small>✨ This is a basic development server for testing the frontend.<br>
               For full API functionality, install dependencies and use the full server.</small></p>
        </div>
    </body>
    </html>
  `;
  
  res.writeHead(404, { 'Content-Type': 'text/html' });
  res.end(html404);
}

const server = http.createServer((req, res) => {
  // Add CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  if (req.method === 'OPTIONS') {
    res.writeHead(200);
    res.end();
    return;
  }
  
  const parsedUrl = url.parse(req.url, true);
  let pathname = parsedUrl.pathname;
  
  console.log(`${req.method} ${pathname}`);
  
  // Route handling
  if (pathname === '/' || pathname === '') {
    pathname = '/index.html';
  }
  
  // Construct file path
  let filePath = path.join(__dirname, 'frontend', pathname);
  
  // Security check - prevent directory traversal
  if (!filePath.startsWith(path.join(__dirname, 'frontend'))) {
    serve404(res, pathname);
    return;
  }
  
  // Check if file exists
  fs.access(filePath, fs.constants.F_OK, (err) => {
    if (err) {
      console.log(`File not found: ${filePath}`);
      serve404(res, pathname);
    } else {
      serveFile(filePath, res);
    }
  });
});

// Error handling
server.on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    console.error(`❌ Port ${PORT} is already in use!`);
    console.log('💡 Try stopping other servers or use a different port.');
    process.exit(1);
  } else {
    console.error('❌ Server error:', err);
    process.exit(1);
  }
});

// Start server
server.listen(PORT, HOST, () => {
  console.log('🚀 Calendar App Development Server Started!');
  console.log(`📄 Server running at: http://${HOST}:${PORT}/`);
  console.log(`📁 Serving files from: ${path.join(__dirname, 'frontend')}`);
  console.log('⚡ This is a basic file server - API endpoints require the full server');
  console.log('⛔ Press Ctrl+C to stop');
});

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('\n👋 Shutting down server...');
  server.close(() => {
    console.log('✅ Server stopped');
    process.exit(0);
  });
});

process.on('SIGTERM', () => {
  console.log('\n👋 Received SIGTERM, shutting down server...');
  server.close(() => {
    console.log('✅ Server stopped');
    process.exit(0);
  });
});
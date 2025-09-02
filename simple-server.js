const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = 3001;

// MIME types
const mimeTypes = {
  '.html': 'text/html',
  '.css': 'text/css',
  '.js': 'application/javascript',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml'
};

const server = http.createServer((req, res) => {
  let filePath = path.join(__dirname, 'frontend');
  
  if (req.url === '/' || req.url === '') {
    filePath = path.join(filePath, 'index.html');
  } else {
    filePath = path.join(filePath, req.url);
  }
  
  const ext = path.extname(filePath).toLowerCase();
  const contentType = mimeTypes[ext] || 'application/octet-stream';
  
  fs.readFile(filePath, (err, content) => {
    if (err) {
      if (err.code === 'ENOENT') {
        res.writeHead(404, { 'Content-Type': 'text/html' });
        res.end(`
          <html>
            <head><title>404 Not Found</title></head>
            <body style="font-family: Arial; text-align: center; margin-top: 100px;">
              <h1>📅 Calendar App - Development Server</h1>
              <h2>404 - File Not Found</h2>
              <p>The file <code>${req.url}</code> was not found.</p>
              <p><a href="/">Go to Home</a></p>
              <p><small>Note: This is a basic server for testing the frontend. 
                 For full functionality, use the full Node.js server with dependencies.</small></p>
            </body>
          </html>
        `);
      } else {
        res.writeHead(500);
        res.end('Server Error');
      }
    } else {
      res.writeHead(200, { 'Content-Type': contentType });
      res.end(content);
    }
  });
});

server.listen(PORT, () => {
  console.log(`🚀 Simple server running on http://localhost:${PORT}`);
  console.log('📄 Open your browser to view the calendar app frontend');
  console.log('⚠️  Note: This is a basic file server - API endpoints won\'t work without the full server');
});
#!/usr/bin/env python3
"""
Simple HTTP Server for Calendar App
This serves the frontend files on localhost:3001
"""

import http.server
import socketserver
import os
import sys
from pathlib import Path

PORT = 3001
HOST = "localhost"

class CalendarHandler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=str(Path(__file__).parent / "frontend"), **kwargs)
    
    def end_headers(self):
        # Add CORS headers
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')
        super().end_headers()
    
    def do_OPTIONS(self):
        self.send_response(200)
        self.end_headers()
    
    def log_message(self, format, *args):
        # Custom log format
        print(f"📄 {self.address_string()} - {format % args}")

def main():
    os.chdir(Path(__file__).parent)
    
    print("🚀 Calendar App Development Server")
    print("=" * 50)
    print(f"📁 Serving from: {Path(__file__).parent / 'frontend'}")
    print(f"🌐 Server URL: http://{HOST}:{PORT}/")
    print("⚡ This serves the frontend interface only")
    print("⛔ Press Ctrl+C to stop")
    print("=" * 50)
    
    # Check if frontend directory exists
    frontend_dir = Path(__file__).parent / "frontend"
    if not frontend_dir.exists():
        print(f"❌ Frontend directory not found: {frontend_dir}")
        print("Make sure the 'frontend' folder exists in the same directory as this script")
        sys.exit(1)
    
    # Check if index.html exists
    index_file = frontend_dir / "index.html"
    if not index_file.exists():
        print(f"❌ index.html not found: {index_file}")
        print("Make sure index.html exists in the frontend directory")
        sys.exit(1)
    
    print("✅ Frontend files found, starting server...")
    print()
    
    try:
        with socketserver.TCPServer((HOST, PORT), CalendarHandler) as httpd:
            print(f"✅ Server started successfully on http://{HOST}:{PORT}/")
            print("💡 Open this URL in your browser to view the calendar app")
            print()
            httpd.serve_forever()
    except OSError as e:
        if e.errno == 48:  # Address already in use
            print(f"❌ Port {PORT} is already in use!")
            print("💡 Try stopping other servers or change the port number")
        else:
            print(f"❌ Server error: {e}")
        sys.exit(1)
    except KeyboardInterrupt:
        print("\n👋 Server stopped by user")
        sys.exit(0)

if __name__ == "__main__":
    main()
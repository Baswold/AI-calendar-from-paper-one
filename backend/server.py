#!/usr/bin/env python3
"""
Calendar Photo Converter - Python HTTP Server
A robust, simple HTTP server for serving the frontend application.
"""

import http.server
import socketserver
import os
import sys
import webbrowser
import threading
import time
from pathlib import Path
import json
from urllib.parse import urlparse, parse_qs
import base64
import mimetypes

class CalendarPhotoHandler(http.server.SimpleHTTPRequestHandler):
    """Custom handler for the calendar photo converter application."""
    
    def __init__(self, *args, **kwargs):
        # Set the directory to serve from
        super().__init__(*args, directory=str(Path(__file__).parent / "frontend"), **kwargs)
    
    def do_GET(self):
        """Handle GET requests."""
        parsed_path = urlparse(self.path)
        path = parsed_path.path
        
        # Serve the main page for root requests
        if path == "/" or path == "":
            self.path = "/index.html"
        
        # Handle API endpoints (placeholder for future implementation)
        elif path.startswith("/api/"):
            self.handle_api_request(path, parsed_path.query)
            return
        
        # Serve static files
        super().do_GET()
    
    def do_POST(self):
        """Handle POST requests for file uploads and processing."""
        parsed_path = urlparse(self.path)
        path = parsed_path.path
        
        if path.startswith("/api/"):
            self.handle_api_request(path, None, is_post=True)
        else:
            self.send_error(404, "Not Found")
    
    def handle_api_request(self, path, query, is_post=False):
        """Handle API requests (placeholder implementation)."""
        response_data = {"status": "success", "message": "API endpoint placeholder"}
        
        if path == "/api/status":
            response_data = {
                "status": "running",
                "message": "Calendar Photo Converter server is running",
                "timestamp": time.time()
            }
        
        elif path == "/api/process-images" and is_post:
            # Placeholder for image processing
            response_data = {
                "status": "success",
                "message": "Image processing would happen here",
                "events": [
                    {
                        "title": "Sample Event",
                        "date": "2024-01-15",
                        "time": "10:00 AM",
                        "description": "This is a placeholder event"
                    }
                ]
            }
        
        elif path == "/api/auth/google":
            # Placeholder for Google OAuth
            response_data = {
                "status": "success",
                "message": "Google OAuth would be implemented here",
                "auth_url": "https://accounts.google.com/oauth2/auth"
            }
        
        else:
            response_data = {"status": "error", "message": "API endpoint not found"}
            self.send_response(404)
        
        # Send JSON response
        if response_data["status"] == "success":
            self.send_response(200)
        else:
            self.send_response(404)
        
        self.send_header("Content-Type", "application/json")
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type")
        self.end_headers()
        
        self.wfile.write(json.dumps(response_data).encode())
    
    def do_OPTIONS(self):
        """Handle OPTIONS requests for CORS."""
        self.send_response(200)
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type")
        self.end_headers()
    
    def log_message(self, format, *args):
        """Override to provide better logging."""
        timestamp = time.strftime("%Y-%m-%d %H:%M:%S")
        sys.stderr.write(f"[{timestamp}] {format % args}\n")

def find_free_port(start_port=8000, max_attempts=10):
    """Find a free port starting from start_port."""
    for port in range(start_port, start_port + max_attempts):
        try:
            with socketserver.TCPServer(("", port), None) as test_server:
                return port
        except OSError:
            continue
    return None

def start_server(port=None, open_browser=True):
    """Start the HTTP server."""
    if port is None:
        port = find_free_port()
    
    if port is None:
        print("❌ Error: Could not find a free port to start the server.")
        sys.exit(1)
    
    # Ensure we're in the right directory
    script_dir = Path(__file__).parent
    os.chdir(script_dir)
    
    # Check if frontend directory exists
    frontend_dir = script_dir / "frontend"
    if not frontend_dir.exists():
        print(f"❌ Error: Frontend directory not found at {frontend_dir}")
        print("Please make sure all files are in the correct location.")
        sys.exit(1)
    
    # Start the server
    try:
        with socketserver.TCPServer(("", port), CalendarPhotoHandler) as httpd:
            server_url = f"http://localhost:{port}"
            
            print("=" * 60)
            print("🚀 Calendar Photo Converter Server Starting...")
            print("=" * 60)
            print(f"✅ Server running at: {server_url}")
            print(f"📁 Serving files from: {frontend_dir}")
            print(f"🌐 Open in browser: {server_url}")
            print("=" * 60)
            print("🛑 Press Ctrl+C to stop the server")
            print("=" * 60)
            
            # Open browser after a short delay
            if open_browser:
                def open_browser_delayed():
                    time.sleep(1.5)
                    try:
                        webbrowser.open(server_url)
                        print(f"🌐 Opened {server_url} in your default browser")
                    except Exception as e:
                        print(f"⚠️  Could not open browser automatically: {e}")
                        print(f"Please manually open: {server_url}")
                
                browser_thread = threading.Thread(target=open_browser_delayed)
                browser_thread.daemon = True
                browser_thread.start()
            
            # Start serving
            httpd.serve_forever()
            
    except KeyboardInterrupt:
        print("\n🛑 Server stopped by user")
        sys.exit(0)
    except OSError as e:
        if "Address already in use" in str(e):
            print(f"❌ Error: Port {port} is already in use.")
            print("Try a different port or stop the other service using this port.")
        else:
            print(f"❌ Error starting server: {e}")
        sys.exit(1)
    except Exception as e:
        print(f"❌ Unexpected error: {e}")
        sys.exit(1)

def main():
    """Main function to handle command line arguments."""
    import argparse
    
    parser = argparse.ArgumentParser(description="Calendar Photo Converter Server")
    parser.add_argument("--port", "-p", type=int, default=None,
                       help="Port to run the server on (default: auto-detect)")
    parser.add_argument("--no-browser", action="store_true",
                       help="Don't automatically open the browser")
    
    args = parser.parse_args()
    
    start_server(port=args.port, open_browser=not args.no_browser)

if __name__ == "__main__":
    main()
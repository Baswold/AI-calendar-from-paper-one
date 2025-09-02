#!/usr/bin/env python3

import http.server
import socketserver
import os
import sys

# Try different ports in case 3001 is blocked
PORTS_TO_TRY = [8000, 8080, 3000, 3001, 5000, 9000]

def test_port(port):
    try:
        with socketserver.TCPServer(("localhost", port), http.server.SimpleHTTPRequestHandler) as httpd:
            print(f"✅ Port {port} is available")
            return True
    except OSError:
        print(f"❌ Port {port} is in use or blocked")
        return False

def main():
    print("🔍 CALENDAR APP DEBUG SERVER")
    print("=" * 40)
    
    # Change to frontend directory
    frontend_dir = os.path.join(os.path.dirname(__file__), 'frontend')
    if not os.path.exists(frontend_dir):
        print(f"❌ Frontend directory not found: {frontend_dir}")
        return
    
    os.chdir(frontend_dir)
    print(f"📁 Serving from: {os.getcwd()}")
    
    # List files in directory
    files = os.listdir('.')
    print(f"📄 Files found: {', '.join(files)}")
    
    # Test ports
    print("\n🔌 Testing ports...")
    available_port = None
    for port in PORTS_TO_TRY:
        if test_port(port):
            available_port = port
            break
    
    if not available_port:
        print("\n❌ No available ports found!")
        print("Try closing other applications and run again.")
        return
    
    print(f"\n🚀 Starting server on port {available_port}")
    print(f"🌐 Open: http://localhost:{available_port}/test.html")
    print("⛔ Press Ctrl+C to stop\n")
    
    class CustomHandler(http.server.SimpleHTTPRequestHandler):
        def log_message(self, format, *args):
            print(f"📄 {format % args}")
    
    try:
        with socketserver.TCPServer(("localhost", available_port), CustomHandler) as httpd:
            httpd.serve_forever()
    except KeyboardInterrupt:
        print("\n👋 Server stopped")

if __name__ == "__main__":
    main()
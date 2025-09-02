#!/usr/bin/env python3
"""
Calendar Photo Converter - Quick Start Script
A simple Python script to start the server with minimal dependencies.
"""

import os
import sys
import time
import threading
import webbrowser
from pathlib import Path

def main():
    print("🚀 Calendar Photo Converter - Quick Start")
    print("=" * 50)
    
    # Get script directory
    script_dir = Path(__file__).parent
    backend_dir = script_dir / "backend"
    frontend_dir = backend_dir / "frontend"
    
    # Change to backend directory
    os.chdir(backend_dir)
    print(f"📁 Working directory: {backend_dir}")
    
    # Check if frontend files exist
    print("🔍 Checking frontend files...")
    required_files = ["index.html", "styles.css", "app.js"]
    missing_files = []
    
    for file in required_files:
        if not (frontend_dir / file).exists():
            missing_files.append(file)
    
    if missing_files:
        print(f"⚠️  Warning: Missing frontend files: {', '.join(missing_files)}")
    else:
        print("✅ All frontend files found")
    
    print("=" * 50)
    
    # Try to start Python server
    try:
        print("🐍 Starting Python server...")
        print("🌐 Server will be available at: http://localhost:8000")
        print("🛑 Press Ctrl+C to stop the server")
        print("=" * 50)
        
        # Try to open browser after a delay
        def open_browser():
            time.sleep(2)
            try:
                webbrowser.open("http://localhost:8000")
                print("🌐 Opened http://localhost:8000 in your browser")
            except Exception as e:
                print(f"⚠️  Could not open browser: {e}")
                print("Please manually open: http://localhost:8000")
        
        browser_thread = threading.Thread(target=open_browser)
        browser_thread.daemon = True
        browser_thread.start()
        
        # Import and start the server
        sys.path.insert(0, str(backend_dir))
        from server import start_server
        start_server(port=8000, open_browser=False)
        
    except ImportError:
        print("❌ Could not import server module")
        print("Falling back to simple HTTP server...")
        
        # Fallback to simple HTTP server
        os.chdir(frontend_dir)
        
        # Open browser
        def open_browser():
            time.sleep(2)
            try:
                webbrowser.open("http://localhost:8000")
                print("🌐 Opened http://localhost:8000 in your browser")
            except Exception:
                print("Please manually open: http://localhost:8000")
        
        browser_thread = threading.Thread(target=open_browser)
        browser_thread.daemon = True
        browser_thread.start()
        
        # Start simple server
        import http.server
        import socketserver
        
        with socketserver.TCPServer(("", 8000), http.server.SimpleHTTPRequestHandler) as httpd:
            print("🚀 Simple HTTP server started")
            print("⚠️  Note: API functionality not available with simple server")
            httpd.serve_forever()
    
    except Exception as e:
        print(f"❌ Error starting server: {e}")
        print("\nTry one of these alternatives:")
        print("1. Run: python3 backend/server.py")
        print("2. Run: node backend/server.js")
        print("3. Run: php backend/server.php")
        print("4. Open frontend/index.html directly in browser")
        sys.exit(1)

if __name__ == "__main__":
    try:
        main()
    except KeyboardInterrupt:
        print("\n🛑 Server stopped by user")
        sys.exit(0)
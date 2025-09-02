#!/bin/bash

# Calendar Photo Converter - Universal Server Starter
# This script tries multiple server options to ensure the application runs

echo "🚀 Calendar Photo Converter - Universal Server Starter"
echo "================================================================="

# Change to backend directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR/backend"

echo "📁 Working directory: $(pwd)"
echo "================================================================="

# Function to check if a port is available
check_port() {
    local port=$1
    if lsof -Pi :$port -sTCP:LISTEN -t >/dev/null 2>&1; then
        return 1  # Port is in use
    else
        return 0  # Port is available
    fi
}

# Function to find available port
find_available_port() {
    local start_port=8000
    local max_attempts=10
    
    for ((port=start_port; port<start_port+max_attempts; port++)); do
        if check_port $port; then
            echo $port
            return
        fi
    done
    
    echo "8080"  # Fallback port
}

# Function to open browser
open_browser() {
    local url=$1
    echo "🌐 Opening $url in browser..."
    
    if command -v open >/dev/null 2>&1; then
        # macOS
        sleep 2 && open "$url" &
    elif command -v xdg-open >/dev/null 2>&1; then
        # Linux
        sleep 2 && xdg-open "$url" &
    elif command -v start >/dev/null 2>&1; then
        # Windows (Git Bash/WSL)
        sleep 2 && start "$url" &
    else
        echo "⚠️  Could not detect browser opener. Please manually open: $url"
    fi
}

# Check if frontend files exist
echo "🔍 Checking frontend files..."
if [ ! -d "frontend" ]; then
    echo "❌ Error: frontend directory not found!"
    echo "Please make sure you're running this script from the correct location."
    exit 1
fi

required_files=("frontend/index.html" "frontend/styles.css" "frontend/app.js")
missing_files=()

for file in "${required_files[@]}"; do
    if [ ! -f "$file" ]; then
        missing_files+=("$file")
    fi
done

if [ ${#missing_files[@]} -gt 0 ]; then
    echo "⚠️  Warning: Missing frontend files: ${missing_files[*]}"
    echo "The application may not work correctly."
fi

echo "✅ Frontend files check completed"
echo "================================================================="

# Try different server options in order of preference

# Option 1: Node.js/Express Server
echo "🟢 Option 1: Trying Node.js server..."
if command -v node >/dev/null 2>&1; then
    echo "✅ Node.js found: $(node --version)"
    
    # Check if npm is available
    if command -v npm >/dev/null 2>&1; then
        echo "✅ npm found: $(npm --version)"
        
        # Install dependencies if needed
        if [ ! -d "node_modules" ]; then
            echo "📦 Installing Node.js dependencies..."
            npm install
        fi
        
        # Check if dependencies are installed
        if [ -d "node_modules" ]; then
            echo "🚀 Starting Node.js server..."
            PORT=$(find_available_port)
            export PORT
            open_browser "http://localhost:$PORT" &
            exec node server.js
        else
            echo "❌ Failed to install Node.js dependencies"
        fi
    else
        echo "❌ npm not found"
    fi
else
    echo "❌ Node.js not found"
fi

echo "================================================================="

# Option 2: Python HTTP Server
echo "🟡 Option 2: Trying Python server..."
if command -v python3 >/dev/null 2>&1; then
    echo "✅ Python3 found: $(python3 --version)"
    echo "🚀 Starting Python server..."
    open_browser "http://localhost:8000" &
    exec python3 server.py
elif command -v python >/dev/null 2>&1; then
    echo "✅ Python found: $(python --version)"
    echo "🚀 Starting Python server..."
    open_browser "http://localhost:8000" &
    exec python server.py
else
    echo "❌ Python not found"
fi

echo "================================================================="

# Option 3: PHP Server
echo "🟠 Option 3: Trying PHP server..."
if command -v php >/dev/null 2>&1; then
    echo "✅ PHP found: $(php --version | head -n1)"
    echo "🚀 Starting PHP server..."
    open_browser "http://localhost:8000" &
    exec php server.php
else
    echo "❌ PHP not found"
fi

echo "================================================================="

# Option 4: Simple Python HTTP Server (fallback)
echo "🔴 Option 4: Trying simple Python HTTP server..."
if command -v python3 >/dev/null 2>&1; then
    echo "✅ Python3 found, using simple HTTP server"
    echo "🚀 Starting simple Python HTTP server..."
    echo "⚠️  Note: This is a basic server without API functionality"
    cd frontend
    open_browser "http://localhost:8000" &
    exec python3 -m http.server 8000
elif command -v python >/dev/null 2>&1; then
    echo "✅ Python found, using simple HTTP server"
    echo "🚀 Starting simple Python HTTP server..."
    echo "⚠️  Note: This is a basic server without API functionality"
    cd frontend
    open_browser "http://localhost:8000" &
    exec python -m SimpleHTTPServer 8000
fi

echo "================================================================="

# If we get here, nothing worked
echo "❌ ERROR: No suitable server environment found!"
echo ""
echo "Please install one of the following:"
echo "  • Node.js (recommended): https://nodejs.org/"
echo "  • Python 3: https://python.org/"
echo "  • PHP: https://php.net/"
echo ""
echo "Or try opening the frontend/index.html file directly in your browser"
echo "(though some features may not work without a server)"

exit 1
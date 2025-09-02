#!/bin/bash

echo "🚀 Calendar App - Simple Server Starter"
echo "======================================="

# Get the directory where this script is located
cd "$(dirname "$0")"

echo "📁 Working directory: $(pwd)"
echo ""

# Try Python first (most reliable)
if command -v python3 &> /dev/null; then
    echo "✅ Python3 found - starting Python server..."
    echo "🌐 Server will be available at: http://localhost:3001/"
    echo "⛔ Press Ctrl+C to stop"
    echo ""
    python3 serve.py
elif command -v python &> /dev/null; then
    echo "✅ Python found - starting Python server..."
    echo "🌐 Server will be available at: http://localhost:3001/"
    echo "⛔ Press Ctrl+C to stop"
    echo ""
    python serve.py
# Try Node.js as backup
elif command -v node &> /dev/null; then
    echo "✅ Node.js found - starting Node server..."
    echo "🌐 Server will be available at: http://localhost:3001/"
    echo "⛔ Press Ctrl+C to stop"
    echo ""
    node test-server.js
else
    echo "❌ Neither Python nor Node.js found!"
    echo ""
    echo "Please install one of the following:"
    echo "• Python 3: https://www.python.org/downloads/"
    echo "• Node.js: https://nodejs.org/"
    echo ""
    read -p "Press Enter to exit..."
    exit 1
fi
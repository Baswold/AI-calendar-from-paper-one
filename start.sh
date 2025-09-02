#!/bin/bash

# Calendar Photo to Google Calendar Converter
# Startup script

echo "🚀 Starting Calendar Photo Converter..."

# Check if .env file exists
if [ ! -f "backend/.env" ]; then
    echo "❌ Error: backend/.env file not found!"
    echo "Please copy backend/.env.example to backend/.env and configure your API keys."
    exit 1
fi

# Check if node_modules exists
if [ ! -d "backend/node_modules" ]; then
    echo "📦 Installing dependencies..."
    cd backend && npm install && cd ..
fi

# Start the server
echo "🌐 Starting server on http://localhost:3001"
echo "📄 Open http://localhost:3001 in your browser to use the app"
echo "⛔ Press Ctrl+C to stop the server"
echo ""

cd backend && npm start
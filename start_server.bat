@echo off
REM Calendar Photo Converter - Windows Server Starter
REM Double-click this file to start the server on Windows

echo 🚀 Calendar Photo Converter - Windows Server Starter
echo =================================================================

REM Change to backend directory
cd /d "%~dp0backend"

echo 📁 Working directory: %CD%
echo =================================================================

REM Check if frontend files exist
echo 🔍 Checking frontend files...
if not exist "frontend" (
    echo ❌ Error: frontend directory not found!
    echo Please make sure you're running this script from the correct location.
    pause
    exit /b 1
)

if not exist "frontend\index.html" (
    echo ⚠️  Warning: Missing index.html
)
if not exist "frontend\styles.css" (
    echo ⚠️  Warning: Missing styles.css
)
if not exist "frontend\app.js" (
    echo ⚠️  Warning: Missing app.js
)

echo ✅ Frontend files check completed
echo =================================================================

REM Option 1: Try Node.js/Express Server
echo 🟢 Option 1: Trying Node.js server...
node --version >nul 2>&1
if %errorlevel% == 0 (
    echo ✅ Node.js found
    node --version
    
    npm --version >nul 2>&1
    if %errorlevel% == 0 (
        echo ✅ npm found
        npm --version
        
        if not exist "node_modules" (
            echo 📦 Installing Node.js dependencies...
            npm install
        )
        
        if exist "node_modules" (
            echo 🚀 Starting Node.js server...
            echo 🌐 Open http://localhost:8000 in your browser
            echo 🛑 Press Ctrl+C to stop the server
            echo =================================================================
            
            REM Try to open browser automatically
            timeout /t 2 /nobreak >nul
            start "" "http://localhost:8000"
            
            node server.js
            goto :end
        ) else (
            echo ❌ Failed to install Node.js dependencies
        )
    ) else (
        echo ❌ npm not found
    )
) else (
    echo ❌ Node.js not found
)

echo =================================================================

REM Option 2: Try Python Server
echo 🟡 Option 2: Trying Python server...
python --version >nul 2>&1
if %errorlevel% == 0 (
    echo ✅ Python found
    python --version
    echo 🚀 Starting Python server...
    echo 🌐 Open http://localhost:8000 in your browser
    echo 🛑 Press Ctrl+C to stop the server
    echo =================================================================
    
    REM Try to open browser automatically
    timeout /t 2 /nobreak >nul
    start "" "http://localhost:8000"
    
    python server.py
    goto :end
) else (
    echo ❌ Python not found
)

python3 --version >nul 2>&1
if %errorlevel% == 0 (
    echo ✅ Python3 found
    python3 --version
    echo 🚀 Starting Python3 server...
    echo 🌐 Open http://localhost:8000 in your browser
    echo 🛑 Press Ctrl+C to stop the server
    echo =================================================================
    
    REM Try to open browser automatically
    timeout /t 2 /nobreak >nul
    start "" "http://localhost:8000"
    
    python3 server.py
    goto :end
)

echo =================================================================

REM Option 3: Try PHP Server
echo 🟠 Option 3: Trying PHP server...
php --version >nul 2>&1
if %errorlevel% == 0 (
    echo ✅ PHP found
    php --version | head -n 1
    echo 🚀 Starting PHP server...
    echo 🌐 Open http://localhost:8000 in your browser
    echo 🛑 Press Ctrl+C to stop the server
    echo =================================================================
    
    REM Try to open browser automatically
    timeout /t 2 /nobreak >nul
    start "" "http://localhost:8000"
    
    php server.php
    goto :end
) else (
    echo ❌ PHP not found
)

echo =================================================================

REM Option 4: Simple Python HTTP Server (fallback)
echo 🔴 Option 4: Trying simple Python HTTP server...
python --version >nul 2>&1
if %errorlevel% == 0 (
    echo ✅ Python found, using simple HTTP server
    echo 🚀 Starting simple Python HTTP server...
    echo ⚠️  Note: This is a basic server without API functionality
    echo 🌐 Open http://localhost:8000 in your browser
    echo 🛑 Press Ctrl+C to stop the server
    echo =================================================================
    
    cd frontend
    
    REM Try to open browser automatically
    timeout /t 2 /nobreak >nul
    start "" "http://localhost:8000"
    
    python -m http.server 8000
    goto :end
)

python3 --version >nul 2>&1
if %errorlevel% == 0 (
    echo ✅ Python3 found, using simple HTTP server
    echo 🚀 Starting simple Python3 HTTP server...
    echo ⚠️  Note: This is a basic server without API functionality
    echo 🌐 Open http://localhost:8000 in your browser
    echo 🛑 Press Ctrl+C to stop the server
    echo =================================================================
    
    cd frontend
    
    REM Try to open browser automatically
    timeout /t 2 /nobreak >nul
    start "" "http://localhost:8000"
    
    python3 -m http.server 8000
    goto :end
)

echo =================================================================

REM If we get here, nothing worked
echo ❌ ERROR: No suitable server environment found!
echo.
echo Please install one of the following:
echo   • Node.js (recommended): https://nodejs.org/
echo   • Python 3: https://python.org/
echo   • PHP: https://php.net/
echo.
echo Or try opening the frontend\index.html file directly in your browser
echo (though some features may not work without a server)
echo.

:end
pause
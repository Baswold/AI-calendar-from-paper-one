# 📅 Calendar Photo Converter

Convert photos of calendars into Google Calendar events using Claude Vision API. This application provides a simple web interface to upload calendar photos, extract events using AI, and add them to your Google Calendar.

## ✨ Features

- 📸 **Image Upload**: Drag & drop or browse for calendar photos
- 🤖 **AI Processing**: Extract events using Claude Vision API (placeholder)
- 📋 **Event Review**: Review and edit extracted events before adding
- 🔗 **Google Calendar**: Integration with Google Calendar OAuth (placeholder)
- 📱 **Responsive Design**: Works on desktop, tablet, and mobile
- ⚡ **Multiple Server Options**: Python, Node.js, PHP, and simple HTTP server options

## 🚀 Quick Start (Recommended)

The easiest way to get started is to use one of the automated startup scripts:

### Option 1: Universal Starter (Bash/Linux/macOS)
```bash
./start_server.sh
```

### Option 2: Windows Batch File
```cmd
start_server.bat
```

### Option 3: Python Quick Start
```bash
python3 quick_start.py
```

These scripts will automatically:
- Detect available server technologies
- Install dependencies if needed
- Start the most appropriate server
- Open your browser to the application
- Handle errors gracefully with fallback options

## 🛠 Manual Installation & Setup

If the automated scripts don't work, you can manually start any of the server options:

### Node.js Server (Recommended - Full Features)

1. **Install Node.js**: Download from [nodejs.org](https://nodejs.org/)

2. **Install Dependencies**:
   ```bash
   cd backend
   npm install
   ```

3. **Start Server**:
   ```bash
   npm start
   # or
   node server.js
   ```

4. **Open Browser**: Visit `http://localhost:8000`

### Python Server (Good Alternative)

1. **Requirements**: Python 3.6+ (usually pre-installed on macOS/Linux)

2. **Start Server**:
   ```bash
   cd backend
   python3 server.py
   # or
   ./server.py
   ```

3. **Open Browser**: Visit `http://localhost:8000`

### PHP Server (Lightweight Option)

1. **Requirements**: PHP 7.0+ with built-in server

2. **Start Server**:
   ```bash
   cd backend
   php server.php
   ```

3. **Open Browser**: Visit `http://localhost:8000`

### Simple HTTP Server (Fallback - Limited Features)

If nothing else works, you can use a basic HTTP server:

```bash
cd backend/frontend
python3 -m http.server 8000
# or
python -m SimpleHTTPServer 8000  # Python 2
```

⚠️ **Note**: The simple HTTP server won't have API functionality, so image processing will only show mock data.

## 📁 Project Structure

```
calender_app/
├── README.md                 # This file
├── start_server.sh          # Universal server starter (Bash)
├── start_server.bat         # Windows server starter
├── quick_start.py           # Python quick start script
└── backend/
    ├── server.js            # Node.js/Express server (full-featured)
    ├── server.py            # Python HTTP server
    ├── server.php           # PHP built-in server
    ├── package.json         # Node.js dependencies
    └── frontend/
        ├── index.html       # Main application page
        ├── styles.css       # Application styling
        └── app.js           # Frontend JavaScript
```

## 🌐 Usage Guide

1. **Upload Photos**: 
   - Drag and drop calendar photos onto the upload area
   - Or click "browse files" to select images
   - Supports JPG, PNG, GIF, WebP formats

2. **Process Images**:
   - Click "Process Images" button
   - Wait for AI analysis to complete
   - Review extracted events in the table

3. **Review Events**:
   - Check/uncheck events you want to add
   - Edit event details if needed
   - Use "Select All" or "Deselect All" for bulk actions

4. **Add to Calendar**:
   - Click "Add to Google Calendar"
   - Authorize Google Calendar access (when implemented)
   - Confirm successful addition

## 🔧 Troubleshooting

### Server Won't Start

1. **Check Requirements**: Ensure you have at least one of:
   - Node.js 14+ and npm
   - Python 3.6+
   - PHP 7.0+

2. **Port Conflicts**: If port 8000 is in use:
   - The scripts will automatically find available ports
   - Or manually specify: `PORT=8001 node server.js`

3. **Permission Issues**:
   ```bash
   chmod +x start_server.sh
   chmod +x quick_start.py
   chmod +x backend/server.py
   ```

### Missing Dependencies (Node.js)

```bash
cd backend
npm install express multer cors
npm start
```

### Firewall/Security Issues

- The application runs locally on `localhost`
- No external network access required for basic functionality
- Allow browser to access localhost:8000

### Browser Compatibility

- **Recommended**: Chrome 80+, Firefox 75+, Safari 13+, Edge 80+
- **Required Features**: ES6, Fetch API, CSS Grid
- **File Upload**: HTML5 file API support

## 🔐 Security Notes

- This application runs locally on your machine
- No data is sent to external servers (except when Claude/Google APIs are implemented)
- Images are processed in memory only
- No persistent storage of images or events

## 🚧 Development Status

This is a **prototype/demo version** with the following implementation status:

### ✅ Completed Features
- Complete responsive web interface
- Multiple robust server implementations
- File upload handling
- Event review and management UI
- Mock data generation for testing

### 🏗 Placeholder/To-Do Features
- **Claude Vision API Integration**: Currently shows mock events
- **Google Calendar OAuth**: Currently shows mock authorization
- **Real Event Extraction**: Uses generated sample events
- **Data Persistence**: No database storage yet
- **Error Handling**: Basic error handling implemented

## 🛟 Support

If you encounter issues:

1. **Try Different Server**: Use the automated scripts to try multiple server options
2. **Check Console**: Open browser developer tools for error messages  
3. **Simple Fallback**: Open `backend/frontend/index.html` directly in browser
4. **System Requirements**: Verify you have Node.js, Python, or PHP installed

## 🔄 Updates & Extensions

To extend this application:

1. **Claude Vision API**: Replace mock functions in `app.js` with real API calls
2. **Google Calendar**: Implement OAuth flow and Calendar API integration
3. **Database**: Add persistent storage for events and user data
4. **Authentication**: Add user accounts and session management
5. **Cloud Deployment**: Deploy to cloud platforms for multi-user access

## 📝 License

This project is created as a demonstration/prototype. Feel free to modify and extend as needed.

---

**Made with ❤️ by Claude Code Assistant**

🌐 **Quick Links:**
- 🚀 [Quick Start](#-quick-start-recommended)  
- 🛠 [Manual Setup](#-manual-installation--setup)
- 🔧 [Troubleshooting](#-troubleshooting)
- 📁 [Project Structure](#-project-structure)
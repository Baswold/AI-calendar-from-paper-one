# 🚀 Quick Start Guide

## 1. Install Dependencies
```bash
npm run install-deps
```

## 2. Configure Environment Variables
```bash
# Copy the example file
cp backend/.env.example backend/.env

# Edit backend/.env with your API keys:
# - ANTHROPIC_API_KEY (from console.anthropic.com)
# - GOOGLE_CLIENT_ID (from Google Cloud Console)
# - GOOGLE_CLIENT_SECRET (from Google Cloud Console)
```

## 3. Google Cloud Setup
1. Enable Google Calendar API
2. Create OAuth 2.0 credentials
3. Add redirect URI: `http://localhost:3001/auth-callback.html`

## 4. Start the Application
```bash
npm start
```

## 5. Open in Browser
Visit: http://localhost:3001

## 6. Test the App
1. Upload a clear photo of a paper calendar
2. Click "Analyze Calendar"
3. Review extracted events
4. Connect Google Calendar
5. Create events

## Troubleshooting
- Check browser console for errors
- Verify API keys are correct
- Ensure redirect URI matches exactly
- Test with high-quality calendar images

That's it! 🎉
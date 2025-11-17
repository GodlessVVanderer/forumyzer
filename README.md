# Forumyzer

Transform video comments from YouTube and TikTok into structured forum discussions.

## Overview

**Forumyzer** is a Chrome extension and web application that fetches comments from video platforms, classifies them into categories (spam, bot, toxic, genuine, question), and presents them as an organized forum-style interface.

### Supported Platforms

- ✅ **YouTube** - Full support via YouTube Data API
- ✅ **TikTok** - Support via multiple scraping options

## Features

- **Multi-platform Support**: Works with both YouTube and TikTok videos
- **Comment Classification**: Automatically categorizes comments into:
  - 📧 Spam
  - 🤖 Bot
  - ⚠️ Toxic
  - ✅ Genuine
  - ❓ Question
- **Statistics Dashboard**: View breakdown of comment types
- **Forum Interface**: Browse comments in a structured, threaded format
- **Audio Summaries**: Generate audio summaries of forum discussions
- **Shareable Forums**: Create and share forum discussions with others

## Architecture

The project consists of three main components:

### 1. Backend (Node.js + Express)

Located in `/backend/`

- REST API for comment fetching and forum management
- Comment classification service
- Integration with YouTube Data API
- Integration with TikTok scraping services
- Audio summary generation

### 2. Chrome Extension

Located in `/extension/`

- Injects a "Forumyze" button on YouTube and TikTok video pages
- Communicates with the backend API
- Manages authentication and local storage
- Provides popup interface for viewing forums

### 3. Web Application

Located in `/webapp/`

- Standalone web interface for viewing and managing forums
- Forum library for saved discussions
- Share functionality for public forum access

## Setup

### Backend Setup

1. Navigate to the backend directory:
   ```bash
   cd backend
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Create a `.env` file with the following variables:
   ```
   # Required for YouTube support
   YOUTUBE_API_KEY=your_youtube_api_key

   # Optional: For real TikTok comment fetching (choose one)
   APIFY_API_TOKEN=your_apify_token
   # OR
   RAPIDAPI_KEY=your_rapidapi_key

   # Server configuration
   PORT=3000
   ```

4. Start the server:
   ```bash
   npm start
   # or for development with auto-reload:
   npm run dev
   ```

### Chrome Extension Setup

1. Navigate to the extension directory:
   ```bash
   cd extension
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Build the extension:
   ```bash
   npm run build
   ```

4. Load the extension in Chrome:
   - Open Chrome and navigate to `chrome://extensions/`
   - Enable "Developer mode"
   - Click "Load unpacked"
   - Select the `extension/dist` directory

### Web Application Setup

1. Navigate to the webapp directory:
   ```bash
   cd webapp
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Start the development server:
   ```bash
   npm run dev
   ```

## Usage

### Using with YouTube

1. Navigate to any YouTube video page
2. Click the "📋 Forumyzer" button that appears near the like/dislike buttons
3. Wait for the extension to fetch and classify comments
4. Click the extension icon to view the forum

### Using with TikTok

1. Navigate to any TikTok video page
2. Click the "📋 Forumyze" button (appears as a floating button or in the action bar)
3. Wait for the extension to fetch and classify comments
4. Click the extension icon to view the forum

### API Usage

You can also use the backend API directly:

```javascript
// Forumize a YouTube video
POST /api/forumize
{
  "videoId": "dQw4w9WgXcQ",
  "platform": "youtube"
}

// Forumize a TikTok video (URL or ID)
POST /api/forumize
{
  "videoId": "https://www.tiktok.com/@username/video/1234567890",
  "platform": "tiktok"
}

// Platform auto-detection
POST /api/forumize
{
  "videoId": "7456431012588047662"  // Auto-detected as TikTok
}
```

## TikTok Integration

### Current Implementation

The TikTok integration currently uses **mock data** for demonstration purposes. The mock data includes realistic comment examples with proper classification.

### Enabling Real TikTok Comments

To fetch real TikTok comments, you'll need to set up one of the following services:

#### Option 1: Apify TikTok Comments Scraper

1. Sign up for [Apify](https://apify.com/)
2. Get your API token
3. Add to `.env`:
   ```
   APIFY_API_TOKEN=your_token_here
   ```

#### Option 2: RapidAPI TikTok Scraper

1. Sign up for [RapidAPI](https://rapidapi.com/)
2. Subscribe to a TikTok scraping API
3. Add to `.env`:
   ```
   RAPIDAPI_KEY=your_key_here
   ```

### Testing TikTok Integration

A test script is provided to verify the TikTok integration:

```bash
cd backend
node test-tiktok.js
```

This will test:
- URL parsing and video ID extraction
- Platform auto-detection
- Comment fetching and classification
- Statistics generation

## Project Structure

```
forumyzer/
├── backend/
│   ├── models/
│   │   ├── forum.js          # Forum data model
│   │   └── user.js           # User data model
│   ├── services/
│   │   ├── audio.js          # Audio summary generation
│   │   ├── classifier.js     # Comment classification
│   │   ├── forumize.js       # Main forumize service
│   │   └── tiktok.js         # TikTok comment fetching
│   ├── server.js             # Express server
│   ├── test-tiktok.js        # TikTok integration test
│   └── package.json
├── extension/
│   ├── background.js         # Background service worker
│   ├── contentScript.js      # YouTube content script
│   ├── contentScriptTikTok.js # TikTok content script
│   ├── manifest.json         # Extension manifest
│   └── package.json
├── webapp/
│   ├── src/
│   │   └── components/
│   └── package.json
└── README.md
```

## API Reference

### POST /api/forumize

Fetch and classify comments from a video.

**Request Body:**
```json
{
  "videoId": "string (URL or ID)",
  "platform": "youtube | tiktok (optional, auto-detected)"
}
```

**Response:**
```json
{
  "threads": [
    {
      "id": "string",
      "author": "string",
      "text": "string",
      "category": "spam | bot | toxic | genuine | question",
      "replies": []
    }
  ],
  "stats": {
    "totalComments": 100,
    "spamCount": 5,
    "botCount": 3,
    "toxicCount": 2,
    "genuineCount": 80,
    "questionCount": 10,
    "spamPercentage": 5,
    "botPercentage": 3,
    "toxicPercentage": 2,
    "genuinePercentage": 80,
    "questionPercentage": 10
  },
  "platform": "youtube | tiktok"
}
```

### POST /api/forum/save

Save a forum and generate a share token.

### GET /api/forum/:id

Get a forum by ID.

### GET /api/forum/share/:token

Get a forum by share token.

### GET /api/forum/:id/audio

Generate or retrieve an audio summary for a forum.

## Development

### Running Tests

```bash
# Backend tests
cd backend
node test-tiktok.js

# Extension build
cd extension
npm run build

# Web app dev server
cd webapp
npm run dev
```

### Environment Variables

#### Backend `.env`

```bash
# Required
YOUTUBE_API_KEY=your_youtube_api_key

# Optional (for TikTok)
APIFY_API_TOKEN=your_apify_token
RAPIDAPI_KEY=your_rapidapi_key

# Server
PORT=3000
```

## Limitations

### YouTube
- Requires a valid YouTube Data API key
- Subject to API quotas and rate limits

### TikTok
- No official public API for comments
- Mock data used by default
- Real data requires third-party services (Apify, RapidAPI)
- May be subject to rate limits and changes in TikTok's structure

## Future Enhancements

- [ ] Support for more platforms (Instagram, Twitter/X)
- [ ] Improved comment classification with AI/ML models
- [ ] Real-time comment updates
- [ ] User voting and moderation features
- [ ] Advanced search and filtering
- [ ] Export forums to various formats

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

This project is provided as-is for educational and demonstration purposes.

## Deployment

This project is configured for deployment on [Railway](https://railway.app/). See `railway.json` for deployment configuration.

## Support

For issues and questions, please open an issue on GitHub.

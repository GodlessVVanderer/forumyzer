# Forumyzer Integration Guide

## Overview

This guide explains how all the components work together to create a persistent YouTube message board with AI-powered categorization.

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                      Chrome Extension                        │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │ Content      │  │ Background   │  │ Popup        │      │
│  │ Script       │→ │ Service      │→ │ UI           │      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
└─────────────────────────────────────────────────────────────┘
                           ↓
                    YouTube API & Page
                           ↓
┌─────────────────────────────────────────────────────────────┐
│                      Backend (Railway)                       │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │ API          │→ │ AI           │→ │ Message      │      │
│  │ Routes       │  │ Classifier   │  │ Board DB     │      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
│                           ↓                                  │
│                    Gemini AI API                             │
└─────────────────────────────────────────────────────────────┘
                           ↓
┌─────────────────────────────────────────────────────────────┐
│                    Frontend (Vercel)                         │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │ App.tsx      │→ │ Forum.tsx    │→ │ Comment.tsx  │      │
│  │ (Main UI)    │  │ (Categories) │  │ (Display)    │      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
│         ↓                                                    │
│  useForumyzer Hook (AI Integration + Backend API)           │
└─────────────────────────────────────────────────────────────┘
```

## Fixed Category System

All videos use the same 7 categories (like a real forum):

| Category | Emoji | Color | Description |
|----------|-------|-------|-------------|
| Discussion | 🗣️ | #00BCD4 | General discussions and conversations |
| Questions | ❓ | #2196F3 | Questions from viewers |
| Feedback | 💡 | #FF9800 | Constructive feedback and suggestions |
| Genuine | 👍 | #4CAF50 | Positive and authentic comments |
| Bot | 🤖 | #9E9E9E | Automated or bot-generated content |
| Spam | 🚫 | #F44336 | Spam and low-quality content |
| Toxic | ⚠️ | #E91E63 | Harmful or offensive content |

## Component Integration

### 1. App.tsx (Main Container)

**Location:** `webapp/src/App.tsx`

**Responsibilities:**
- Manages application state (video input, active category, settings)
- Handles YouTube video/live stream detection
- Coordinates between useForumyzer hook and UI components
- Displays category tabs with counts and percentages
- Podcast generation integration

**Key Features:**
```typescript
// Fixed categories with metadata
const FORUM_CATEGORIES = {
  discussion: { name: 'Discussion', emoji: '🗣️', color: '#00BCD4' },
  // ... all 7 categories
};

// Backend API integration
const loadMessageBoard = async (videoId: string) => {
  const response = await fetch(`${BACKEND_URL}/api/messageboard/video/${videoId}`);
  const board = await response.json();
  // Merges backend data with Gemini classifications
};
```

### 2. useForumyzer Hook (AI Brain)

**Location:** `webapp/src/hooks/useForumyzer.ts`

**Responsibilities:**
- Fetches YouTube comments via YouTube Data API
- Classifies comments using Gemini AI into fixed categories
- Generates AI-powered confidence scores
- Sentiment analysis (positive/negative/neutral)
- Spam double-checking to reduce false positives
- Podcast generation with Gemini TTS

**AI Classification Flow:**
```typescript
// 1. Fetch YouTube comments
const comments = await fetchYouTubeComments(videoId);

// 2. Classify with Gemini using fixed schema
const model = genAI.getGenerativeModel({
  model: "gemini-2.5-flash",
  generationConfig: {
    responseMimeType: "application/json",
    responseSchema: {
      type: "object",
      properties: {
        category: {
          type: "string",
          enum: ["discussion", "question", "feedback", "genuine", "bot", "spam", "toxic"]
        },
        confidence: { type: "number" },
        sentiment: {
          type: "string",
          enum: ["positive", "negative", "neutral"]
        }
      }
    }
  }
});

// 3. Double-check spam to avoid false positives
if (classification.category === 'spam' && classification.confidence < 0.8) {
  const doubleCheck = await recheckSpam(comment);
  // Only mark as spam if both passes agree
}

// 4. Return classified comments with metadata
return {
  ...comment,
  aiCategory: classification.category,
  aiConfidence: classification.confidence,
  aiSentiment: classification.sentiment
};
```

### 3. Forum.tsx (Category Display)

**Location:** `webapp/src/components/Forum.tsx`

**Responsibilities:**
- Displays comments filtered by active category
- Provides sorting options (newest, oldest, confidence, replies)
- Filtering by sentiment and confidence threshold
- Shows pinned comments in separate section
- Live stream indicator and auto-update footer
- Empty states with helpful messages

**Key Features:**
```typescript
// Category-specific filtering
const categoryComments = comments.filter(
  comment => comment.aiCategory === activeCategory
);

// Multi-dimensional filtering
const filtered = categoryComments
  .filter(c => filterSentiment === 'all' || c.aiSentiment === filterSentiment)
  .filter(c => c.aiConfidence >= minConfidence);

// Pinned vs regular separation
const pinnedComments = filtered.filter(c => c.isPinned);
const regularComments = filtered.filter(c => !c.isPinned);
```

### 4. Comment.tsx (Individual Display)

**Location:** `webapp/src/components/Comment.tsx`

**Responsibilities:**
- Renders individual comments with AI metadata
- Shows confidence scores and category badges
- Displays sentiment indicators
- Provides forum actions (reply, edit, delete, quote, share, pin)
- Nested comment threading
- Moderator badges
- Collapse/expand functionality

**AI Feature Display:**
```typescript
// Category badge with color coding
<span
  className="ai-badge"
  style={{ background: categoryColor }}
  title={`AI classified as ${category} with ${confidence}% confidence`}
>
  {emoji} {category}
</span>

// Confidence score (clickable for details)
<span className="confidence-score" onClick={showAIDetails}>
  {(confidence * 100).toFixed(0)}%
</span>

// Sentiment indicator
<span className="sentiment-indicator">
  {sentiment === 'positive' ? '😊' : sentiment === 'negative' ? '😟' : '😐'}
</span>
```

## Backend Integration

### API Endpoints

#### 1. Process Regular Video
```http
POST /api/forumize
Content-Type: application/json

{
  "videoId": "dQw4w9WgXcQ",
  "useAI": true,
  "removeSpam": true,
  "maxResults": 100
}

Response:
{
  "videoId": "dQw4w9WgXcQ",
  "videoTitle": "Rick Astley - Never Gonna Give You Up",
  "threads": [
    {
      "id": "UgxKREWq38K7dweCoAEC",
      "author": "John Doe",
      "text": "Great song!",
      "aiCategory": "genuine",
      "aiConfidence": 0.95,
      "aiSentiment": "positive",
      "likeCount": 42,
      "replies": []
    }
  ],
  "stats": {
    "totalComments": 100,
    "discussion": 25,
    "question": 10,
    "feedback": 15,
    "genuine": 30,
    "bot": 5,
    "spam": 10,
    "toxic": 5
  }
}
```

#### 2. Process Live Stream
```http
POST /api/forumize/live
Content-Type: application/json

{
  "videoId": "jfKfPfyJRdk",
  "useAI": true
}

Response:
{
  "isLive": true,
  "liveChatId": "Cg0KC2pma0tmUGZ5SlJkShlVQ2tkcldEQkVNR0V6T0RCUlowRkJRVUU",
  "messageBoard": { /* same structure as regular video */ },
  "newMessages": 15,
  "polling": {
    "nextPollToken": "...",
    "interval": 5000
  }
}
```

#### 3. Get Message Board
```http
GET /api/messageboard/video/:videoId

Response:
{
  "id": "board_123",
  "videoId": "dQw4w9WgXcQ",
  "videoTitle": "...",
  "threads": [...],
  "stats": {...},
  "isLive": false,
  "createdAt": "2025-11-18T10:00:00.000Z",
  "updatedAt": "2025-11-18T10:05:00.000Z"
}
```

### AI Classifier Service

**Location:** `backend/services/aiClassifier.js`

**Key Features:**
- Batch processing (20 comments at a time for efficiency)
- Fallback to keyword-based classification if Gemini fails
- Caching for repeated classifications
- Rate limiting awareness

```javascript
const GEMINI_PROMPT = `
You are a YouTube comment classifier. Classify each comment into exactly one category:

CATEGORIES:
- discussion: General discussions and conversations
- question: Questions from viewers
- feedback: Constructive feedback and suggestions
- genuine: Positive and authentic comments
- bot: Automated or bot-generated content
- spam: Spam and low-quality content
- toxic: Harmful or offensive content

Also provide:
- confidence: 0.0 to 1.0 (how confident you are)
- sentiment: positive, negative, or neutral

IMPORTANT:
- Be conservative with spam classification
- Consider context and tone
- Bot detection should look for patterns, not just links
`;
```

### Live Stream Service

**Location:** `backend/services/liveStreamService.js`

**Polling Mechanism:**
```javascript
// Backend auto-merges new messages
async function processLiveChat(videoId, nextPageToken) {
  // 1. Fetch live chat messages
  const chatMessages = await fetchLiveChatMessages(liveChatId, nextPageToken);

  // 2. Classify with AI
  const classified = await aiClassifier.classifyCommentsAI(chatMessages);

  // 3. Merge with existing board (avoid duplicates)
  const existing = await messageBoard.get(videoId);
  const merged = mergeLiveChatMessages(existing.threads, classified);

  // 4. Update board
  await messageBoard.update(videoId, { threads: merged });

  // 5. Return only new messages
  return {
    newMessages: classified,
    nextPageToken: chatMessages.nextPageToken
  };
}
```

## Data Flow

### Regular Video Flow

```
User enters video ID
        ↓
App.tsx detects video type
        ↓
useForumyzer fetches comments (YouTube API)
        ↓
Comments sent to Gemini for classification
        ↓
Classified comments sent to backend
        ↓
Backend stores in message board DB
        ↓
Forum.tsx displays by category
        ↓
Comment.tsx renders with AI metadata
```

### Live Stream Flow

```
User enters live stream ID
        ↓
App.tsx detects live status
        ↓
Background polling starts (every 5s)
        ↓
Backend fetches new chat messages
        ↓
AI classifies new messages
        ↓
Auto-merge prevents duplicates
        ↓
Frontend updates via storage listener
        ↓
Live indicator shows real-time status
```

## AI Features

### 1. Confidence Scores

Each comment gets a confidence score (0.0 - 1.0) indicating how sure the AI is about the classification:

- **0.9 - 1.0:** Very confident (green)
- **0.7 - 0.9:** Confident (blue)
- **0.5 - 0.7:** Moderate (yellow)
- **0.0 - 0.5:** Low confidence (red)

### 2. Sentiment Analysis

Gemini analyzes the emotional tone:

- **Positive** 😊: Supportive, happy, enthusiastic
- **Neutral** 😐: Factual, neutral, objective
- **Negative** 😟: Critical, disappointed, angry

### 3. Spam Double-Check

To reduce false positives:

```typescript
// First pass
const initial = await classifyComment(comment);

if (initial.category === 'spam' && initial.confidence < 0.8) {
  // Second pass with more context
  const doubleCheck = await classifyComment(comment, {
    context: "This might be harsh criticism, not spam. Reconsider.",
    previousClassification: initial
  });

  // Only mark as spam if both agree
  if (doubleCheck.category !== 'spam') {
    return doubleCheck; // Not spam after all
  }
}
```

### 4. Podcast Generation

Uses Gemini TTS to create audio summaries:

```typescript
async function generatePodcast(comments: CommentData[]) {
  // 1. Summarize discussions
  const summary = await gemini.generateText({
    prompt: `Create a podcast script summarizing these YouTube comments...`,
    comments: comments.filter(c => c.aiCategory !== 'spam')
  });

  // 2. Convert to speech
  const audio = await gemini.textToSpeech({
    text: summary,
    voice: 'Puck', // Gemini TTS voice
    model: 'gemini-2.5-flash-preview-tts'
  });

  return audio;
}
```

## Deployment

### Railway (Backend)

**File:** `railway.toml`

```toml
[build]
builder = "DOCKERFILE"
dockerfilePath = "backend/Dockerfile"

[deploy]
startCommand = "node server.js"
healthcheckPath = "/health"
```

**Environment Variables:**
```bash
YOUTUBE_API_KEY=your_youtube_api_key
GEMINI_API_KEY=your_gemini_api_key
JWT_SECRET=your_random_secret
OAUTH_CLIENT_ID=your_google_oauth_client_id
OAUTH_CLIENT_SECRET=your_google_oauth_secret
NODE_ENV=production
PORT=3000
```

### Vercel (Frontend)

**File:** `vercel.json`

```json
{
  "buildCommand": "cd webapp && npm install && npm run build",
  "outputDirectory": "webapp/dist",
  "framework": "vite",
  "env": {
    "VITE_BACKEND_URL": "@backend-url",
    "VITE_OAUTH_CLIENT_ID": "@oauth-client-id"
  }
}
```

### GitHub Actions

**File:** `.github/workflows/deploy.yml`

Automatically deploys on:
- Push to `main` → Production
- Push to `claude/*` → Preview environment

## Usage Examples

### Example 1: Load Regular Video

```typescript
import { useState } from 'react';
import { useForumyzer } from './hooks/useForumyzer';

function App() {
  const [videoId, setVideoId] = useState('');
  const { forumData, loading, loadVideo } = useForumyzer();

  const handleSubmit = async () => {
    await loadVideo(videoId, {
      useAI: true,
      removeSpam: true,
      maxResults: 100
    });
  };

  return (
    <div>
      <input value={videoId} onChange={e => setVideoId(e.target.value)} />
      <button onClick={handleSubmit}>Load Comments</button>

      {forumData && (
        <Forum
          comments={forumData.threads}
          stats={forumData.stats}
          activeCategory="discussion"
        />
      )}
    </div>
  );
}
```

### Example 2: Live Stream Board

```typescript
function LiveStreamBoard({ videoId }: { videoId: string }) {
  const [board, setBoard] = useState<MessageBoard | null>(null);
  const [isLive, setIsLive] = useState(false);

  useEffect(() => {
    // Check if live
    fetch(`${BACKEND_URL}/api/video/${videoId}/live-status`)
      .then(r => r.json())
      .then(data => setIsLive(data.isLive));

    // Start polling if live
    if (isLive) {
      const interval = setInterval(async () => {
        const response = await fetch(`${BACKEND_URL}/api/forumize/live`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ videoId, useAI: true })
        });
        const data = await response.json();
        setBoard(data.messageBoard);
      }, 5000);

      return () => clearInterval(interval);
    }
  }, [videoId, isLive]);

  return (
    <Forum
      comments={board?.threads || []}
      stats={board?.stats || {}}
      isLive={isLive}
    />
  );
}
```

## File Structure

```
forumyzer/
├── backend/
│   ├── services/
│   │   ├── aiClassifier.js          # Gemini AI classification
│   │   ├── liveStreamService.js     # Live chat processing
│   │   └── forumize.js              # Main forumize logic
│   ├── models/
│   │   └── messageBoard.js          # Persistent storage
│   ├── server.js                    # API routes
│   └── Dockerfile
├── webapp/
│   ├── src/
│   │   ├── components/
│   │   │   ├── Comment.tsx          # Comment display
│   │   │   └── Forum.tsx            # Category view
│   │   ├── hooks/
│   │   │   └── useForumyzer.ts      # AI integration hook
│   │   ├── types.ts                 # TypeScript types
│   │   ├── App.tsx                  # Main app
│   │   └── App.css                  # Styling
│   └── package.json
├── extension/
│   ├── contentScript.js             # YouTube page integration
│   ├── background.js                # Live polling
│   └── manifest.json
├── .github/
│   └── workflows/
│       └── deploy.yml               # CI/CD
├── railway.toml                     # Railway config
├── vercel.json                      # Vercel config
└── DEPLOYMENT_GUIDE.md
```

## Troubleshooting

### Issue: Comments not classifying correctly

**Solution:** Check Gemini API quota and adjust batch size:

```javascript
// In aiClassifier.js
const batchSize = 10; // Reduce if hitting quota limits
```

### Issue: Live stream not updating

**Solution:** Verify polling is active:

```javascript
// Check Chrome storage
chrome.storage.local.get(['activeLiveBoards'], (result) => {
  console.log('Active boards:', result.activeLiveBoards);
});
```

### Issue: CORS errors

**Solution:** Update backend CORS config:

```javascript
app.use(cors({
  origin: [
    'https://forumyzer.vercel.app',
    'https://forumyzer-*.vercel.app',
    'http://localhost:5173'
  ],
  credentials: true
}));
```

## API Quotas

### YouTube Data API
- **Free Tier:** 10,000 units/day
- **Comment fetch:** ~5 units per request
- **Live chat fetch:** ~5 units per request

### Google Gemini API
- **Free Tier:** 15 requests/minute, 1500/day
- **Flash model:** ~1500 free requests/day
- **Batch processing:** Reduces API calls

## Best Practices

1. **Use AI sparingly:** Cache classifications to reduce API calls
2. **Batch processing:** Group comments for efficient classification
3. **Fallback logic:** Always have keyword-based fallback
4. **Rate limiting:** Respect API quotas with exponential backoff
5. **Error handling:** Gracefully handle API failures
6. **User feedback:** Show loading states and error messages
7. **Accessibility:** Ensure keyboard navigation and screen reader support

## Next Steps

1. **Testing:** Run the deployment and test with real YouTube videos
2. **Monitoring:** Set up error tracking (Sentry, LogRocket)
3. **Analytics:** Track classification accuracy and user engagement
4. **Optimization:** Fine-tune Gemini prompts based on feedback
5. **Scaling:** Consider Redis caching for high-traffic videos

---

**Happy Forumyzing! 🚀**

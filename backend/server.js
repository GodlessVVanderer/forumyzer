const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const rateLimit = require('express-rate-limit');
const validator = require('validator');
const dotenv = require('dotenv');
const ForumModel = require('./models/forum');
const UserModel = require('./models/user');
const forumizeService = require('./services/forumize');
const { generateAudioSummary } = require('./services/audio');

dotenv.config();

const app = express();

// ============================================
// SECURITY MIDDLEWARE
// ============================================

// 1. Helmet - Security headers
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'", "fonts.googleapis.com"],
      fontSrc: ["'self'", "fonts.gstatic.com"],
      imgSrc: ["'self'", "data:", "https:"],
      scriptSrc: ["'self'"],
      connectSrc: ["'self'", process.env.FRONTEND_URL || "http://localhost:5173"]
    }
  }
}));

// 2. CORS - Whitelist specific origins
const corsOptions = {
  origin: function (origin, callback) {
    const whitelist = [
      process.env.FRONTEND_URL,
      'http://localhost:5173',
      'http://localhost:3000'
    ].filter(Boolean);

    if (!origin || whitelist.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST'],
  maxAge: 86400
};
app.use(cors(corsOptions));

// 3. Compression
app.use(compression());

// 4. Body parser with size limits
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true, limit: '1mb' }));

// 5. Rate limiting
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100,
  message: { error: 'Too many requests, please try again later' },
  standardHeaders: true,
  legacyHeaders: false
});

const forumizeLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 10,
  message: { error: 'Forumization limit reached. Try again in an hour.' },
  standardHeaders: true,
  legacyHeaders: false
});

// Apply to all API routes
app.use('/api/', apiLimiter);

// ============================================
// UTILITY FUNCTIONS
// ============================================

// Sanitize user input
function sanitizeInput(input) {
  if (typeof input !== 'string') return '';
  return validator.escape(validator.trim(input));
}

// Validate YouTube video ID
function isValidVideoId(videoId) {
  return videoId && typeof videoId === 'string' &&
         /^[a-zA-Z0-9_-]{11}$/.test(videoId);
}

// Validate UUID
function isValidUUID(id) {
  return validator.isUUID(id, 4);
}

// Generic error handler
function handleError(res, error, customMessage = 'An error occurred') {
  console.error('Error:', error.message); // Log for debugging
  res.status(500).json({ error: customMessage });
}

// ============================================
// STATIC FILES
// ============================================

const path = require('path');
app.use('/audio', express.static(path.join(__dirname, 'audio'), {
  maxAge: '1d',
  etag: true,
  lastModified: true
}));

// ============================================
// ROUTES
// ============================================

// Health check
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

// Forumize a video
app.post('/api/forumize', forumizeLimiter, async (req, res) => {
  try {
    const { videoId } = req.body;

    // Validate videoId
    if (!isValidVideoId(videoId)) {
      return res.status(400).json({ error: 'Invalid YouTube video ID format' });
    }

    const result = await forumizeService(videoId);
    res.json(result);
  } catch (err) {
    handleError(res, err, 'Failed to process video');
  }
});

// Save a forum
app.post('/api/forum/save', async (req, res) => {
  try {
    const { videoId, videoTitle, videoChannel, forumData } = req.body;

    // Validate required fields
    if (!isValidVideoId(videoId)) {
      return res.status(400).json({ error: 'Invalid video ID' });
    }
    if (!forumData || typeof forumData !== 'object') {
      return res.status(400).json({ error: 'Invalid forum data' });
    }

    // Sanitize inputs
    const sanitizedData = {
      videoId: sanitizeInput(videoId),
      videoTitle: sanitizeInput(videoTitle || ''),
      videoChannel: sanitizeInput(videoChannel || ''),
      forumData: forumData // Forums already classified by backend
    };

    const userId = req.headers['x-user-id'] || null;
    const forum = await ForumModel.create(sanitizedData, userId);

    res.json({ id: forum.id, shareToken: forum.shareToken });
  } catch (err) {
    handleError(res, err, 'Failed to save forum');
  }
});

// Get all forums for current user
app.get('/api/forum/library', async (req, res) => {
  try {
    const userId = req.headers['x-user-id'] || null;
    const forums = await ForumModel.findByUser(userId);
    res.json(forums);
  } catch (err) {
    handleError(res, err, 'Failed to load forums');
  }
});

// Get a specific forum by ID
app.get('/api/forum/:id', async (req, res) => {
  try {
    const { id } = req.params;

    if (!isValidUUID(id)) {
      return res.status(400).json({ error: 'Invalid forum ID' });
    }

    const forum = await ForumModel.findById(id);
    if (!forum) {
      return res.status(404).json({ error: 'Forum not found' });
    }

    res.json(forum);
  } catch (err) {
    handleError(res, err, 'Failed to retrieve forum');
  }
});

// Generate share token
app.post('/api/forum/:id/share', async (req, res) => {
  try {
    const { id } = req.params;

    if (!isValidUUID(id)) {
      return res.status(400).json({ error: 'Invalid forum ID' });
    }

    const token = await ForumModel.generateShareToken(id);
    if (!token) {
      return res.status(404).json({ error: 'Forum not found' });
    }

    res.json({ shareToken: token });
  } catch (err) {
    handleError(res, err, 'Failed to generate share token');
  }
});

// Get forum by share token
app.get('/api/forum/share/:token', async (req, res) => {
  try {
    const { token } = req.params;

    // Validate token format (12 alphanumeric chars)
    if (!token || !/^[a-zA-Z0-9]{12}$/.test(token)) {
      return res.status(400).json({ error: 'Invalid share token' });
    }

    const forum = await ForumModel.findByShareToken(token);
    if (!forum) {
      return res.status(404).json({ error: 'Forum not found' });
    }

    res.json(forum);
  } catch (err) {
    handleError(res, err, 'Failed to retrieve shared forum');
  }
});

// Add a reply to a thread
app.post('/api/forum/:id/reply', async (req, res) => {
  try {
    const { id } = req.params;
    const { threadId, author, text, category } = req.body;

    // Validate inputs
    if (!isValidUUID(id)) {
      return res.status(400).json({ error: 'Invalid forum ID' });
    }
    if (!threadId || !text) {
      return res.status(400).json({ error: 'threadId and text are required' });
    }
    if (text.length > 5000) {
      return res.status(400).json({ error: 'Comment too long (max 5000 characters)' });
    }

    // Sanitize and create reply
    const reply = {
      id: require('uuid').v4(),
      author: sanitizeInput(author || 'Anonymous'),
      text: sanitizeInput(text),
      category: ['spam', 'bot', 'toxic', 'genuine', 'question'].includes(category)
        ? category
        : 'genuine',
      replies: []
    };

    const updatedForum = await ForumModel.addReply(id, threadId, reply);
    if (!updatedForum) {
      return res.status(404).json({ error: 'Forum or thread not found' });
    }

    res.json(updatedForum);
  } catch (err) {
    handleError(res, err, 'Failed to add reply');
  }
});

// Evaluate comment (placeholder)
app.post('/api/evaluate-comment', (req, res) => {
  const { videoId } = req.body;

  // Only log videoId, not user content
  console.log('evaluate-comment called for videoId:', videoId);

  res.json({
    found: false,
    message: 'Scene matching not implemented yet',
    timestamp: null,
    endTime: null,
    description: null,
    confidence: 0
  });
});

// Process local (placeholder)
app.post('/api/process-local', (req, res) => {
  res.json({
    processLocal: false,
    message: 'Local GPU processing is not available in this demo'
  });
});

// Generate audio summary
app.get('/api/forum/:id/audio', async (req, res) => {
  try {
    const { id } = req.params;

    if (!isValidUUID(id)) {
      return res.status(400).json({ error: 'Invalid forum ID' });
    }

    const forum = await ForumModel.findById(id);
    if (!forum) {
      return res.status(404).json({ error: 'Forum not found' });
    }

    const audioUrl = await generateAudioSummary(forum.forumData.threads);
    res.json({ audioUrl });
  } catch (err) {
    handleError(res, err, 'Failed to generate audio summary');
  }
});

// ============================================
// ERROR HANDLING
// ============================================

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Endpoint not found' });
});

// Global error handler
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

// ============================================
// SERVER START
// ============================================

const PORT = process.env.PORT || 3000;
const server = app.listen(PORT, () => {
  console.log(`✅ Forumyzer backend running on port ${PORT}`);
  console.log(`📊 Environment: ${process.env.NODE_ENV || 'development'}`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received, closing server gracefully...');
  server.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  console.log('SIGINT received, closing server gracefully...');
  server.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
});

module.exports = app; // For testing

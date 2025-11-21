const path = require('path');
const dotenv = require('dotenv');

const envPath = path.join(__dirname, '.env');
console.log('📍 Loading .env from:', envPath);
const result = dotenv.config({ path: envPath });
console.log('📍 dotenv result:', result.error ? `❌ ${result.error}` : '✅ Loaded');

const express = require('express');
const cors = require('cors');
const ForumModel = require('./models/forum');
const UserModel = require('./models/user');
const forumyzeService = require('./services/forumyze');
const { generateAudioSummary } = require('./services/audio');
const timeoutSystem = require('./services/timeoutSystem');

const app = express();

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.get('/health', (req, res) => {
  res.json({ status: 'ok', uptime: process.uptime() });
});

/**
 * FORUMYZE ENDPOINT - CHECK IF ALREADY FORUMYZED FIRST
 */
app.post('/api/forumyze', async (req, res) => {
  try {
    const { videoId } = req.body;
    console.log('📍 /api/forumyze called with videoId:', videoId);
    
    // CHECK IF VIDEO ALREADY FORUMYZED
    const existingForum = await ForumModel.findByVideoId(videoId);
    
    if (existingForum) {
      console.log('💰 Returning cached forumyzed data (pure profit!)');
      return res.json({
        ...existingForum.forumData,
        cached: true,
        timesAccessed: existingForum.timesAccessed,
        originallyForumyzedAt: existingForum.forumyzedAt
      });
    }
    
    // NOT FORUMYZED YET - RUN AI PROCESSING
    console.log('🤖 Running AI processing (costs money)');
    const forumyzedData = await forumyzeService(videoId);
    
    res.json({
      ...forumyzedData,
      cached: false
    });
  } catch (err) {
    console.error('❌ Error in /api/forumyze:', err.message);
    res.status(500).json({ error: err.message });
  }
});

/* TIMEOUT SYSTEM ENDPOINTS */

app.get('/api/timeout/users', (req, res) => {
  try {
    const status = req.query.status || 'pending';
    const users = timeoutSystem.getTimeoutUsers(status);
    res.json({ users });
  } catch (err) {
    console.error('❌ Error in /api/timeout/users:', err.message);
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/timeout/user/:userId', (req, res) => {
  try {
    const { userId } = req.params;
    const entry = timeoutSystem.getTimeoutEntry(userId);
    if (!entry) return res.status(404).json({ error: 'User not in timeout' });
    res.json(entry);
  } catch (err) {
    console.error('❌ Error in /api/timeout/user/:userId:', err.message);
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/timeout/respond', (req, res) => {
  try {
    const { userId, response } = req.body;
    if (!userId || !response) {
      return res.status(400).json({ error: 'userId and response required' });
    }
    const entry = timeoutSystem.submitTimeoutResponse(userId, response);
    res.json(entry);
  } catch (err) {
    console.error('❌ Error in /api/timeout/respond:', err.message);
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/timeout/vote', (req, res) => {
  try {
    const { userId, voterId, voteType } = req.body;
    if (!userId || !voterId || !voteType) {
      return res.status(400).json({ error: 'userId, voterId, voteType required' });
    }
    if (!['restore', 'keep'].includes(voteType)) {
      return res.status(400).json({ error: 'voteType must be restore or keep' });
    }
    const entry = timeoutSystem.voteOnTimeoutUser(userId, voterId, voteType);
    res.json(entry);
  } catch (err) {
    console.error('❌ Error in /api/timeout/vote:', err.message);
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/timeout/voluntary', async (req, res) => {
  try {
    const { userId, username, topic, isPaidUser } = req.body;
    if (!userId || !username || !topic) {
      return res.status(400).json({ error: 'userId, username, topic required' });
    }
    const entry = await timeoutSystem.voluntaryTimeout(userId, username, topic, isPaidUser);
    res.json(entry);
  } catch (err) {
    console.error('❌ Error in /api/timeout/voluntary:', err.message);
    res.status(500).json({ error: err.message });
  }
});

/* FORUM ENDPOINTS */

app.post('/api/forum/save', async (req, res) => {
  try {
    const { videoId, videoTitle, videoChannel, forumData } = req.body;
    
    const sanitizedData = {
      videoId,
      videoTitle: videoTitle || '',
      videoChannel: videoChannel || '',
      forumData: forumData
    };

    const userId = req.headers['x-user-id'] || null;
    const forum = await ForumModel.create(sanitizedData, userId);

    res.json({ id: forum.id, shareToken: forum.shareToken });
  } catch (err) {
    console.error('❌ Error in /api/forum/save:', err.message);
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/forum/library', async (req, res) => {
  try {
    const userId = req.headers['x-user-id'] || null;
    const forums = await ForumModel.findByUser(userId);
    res.json(forums);
  } catch (err) {
    console.error('❌ Error in /api/forum/library:', err.message);
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/forum/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const forum = await ForumModel.findById(id);
    if (!forum) return res.status(404).json({ error: 'Forum not found' });
    res.json(forum);
  } catch (err) {
    console.error('❌ Error in /api/forum/:id:', err.message);
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/forum/:id/share', async (req, res) => {
  try {
    const { id } = req.params;
    const token = await ForumModel.generateShareToken(id);
    if (!token) return res.status(404).json({ error: 'Forum not found' });
    res.json({ shareToken: token });
  } catch (err) {
    console.error('❌ Error in /api/forum/:id/share:', err.message);
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/forum/share/:token', async (req, res) => {
  try {
    const { token } = req.params;
    const forum = await ForumModel.findByShareToken(token);
    if (!forum) return res.status(404).json({ error: 'Forum not found' });
    res.json(forum);
  } catch (err) {
    console.error('❌ Error in /api/forum/share/:token:', err.message);
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/forum/:id/audio', async (req, res) => {
  try {
    const { id } = req.params;
    const forum = await ForumModel.findById(id);
    if (!forum) return res.status(404).json({ error: 'Forum not found' });
    const audioUrl = await generateAudioSummary(forum.forumData.threads);
    res.json({ audioUrl });
  } catch (err) {
    console.error('❌ Error in /api/forum/:id/audio:', err.message);
    res.status(500).json({ error: err.message });
  }
});

app.use((err, req, res, next) => {
  console.error('🔥 Unhandled error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`✅ Forumyzer backend on port ${PORT}`);
  console.log(`📊 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`⏱️ TIMEOUT system enabled`);
  console.log(`💰 Cached forumyze checks enabled`);
});

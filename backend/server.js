const path = require('path');
const dotenv = require('dotenv');

// Load .env file with explicit path
const envPath = path.join(__dirname, '.env');
console.log('📍 Loading .env from:', envPath);

const result = dotenv.config({ path: envPath });
console.log('📍 dotenv result:', result.error ? `❌ ${result.error}` : '✅ Loaded');
console.log('🔑 YOUTUBE_API_KEY in process.env:', process.env.YOUTUBE_API_KEY);
console.log('🔑 Length:', process.env.YOUTUBE_API_KEY?.length);

const express = require('express');
const cors = require('cors');
const ForumModel = require('./models/forum');
const UserModel = require('./models/user');
const forumyzeService = require('./services/forumyze');
const { generateAudioSummary } = require('./services/audio');

const app = express();

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.get('/health', (req, res) => {
  res.json({ status: 'ok', uptime: process.uptime() });
});

app.post('/api/forumyze', async (req, res) => {
  try {
    const { videoId } = req.body;
    console.log('📍 /api/forumyze called with videoId:', videoId);
    
    const forumyzedData = await forumyzeService(videoId);
    res.json(forumyzedData);
  } catch (err) {
    console.error('❌ Error in /api/forumyze:', err.message);
    res.status(500).json({ error: err.message });
  }
});

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
    if (!forum) {
      return res.status(404).json({ error: 'Forum not found' });
    }
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
    if (!token) {
      return res.status(404).json({ error: 'Forum not found' });
    }
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
    if (!forum) {
      return res.status(404).json({ error: 'Forum not found' });
    }
    res.json(forum);
  } catch (err) {
    console.error('❌ Error in /api/forum/share/:token:', err.message);
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/forum/:id/reply', async (req, res) => {
  try {
    const { id } = req.params;
    const { threadId, author, text, category } = req.body;

    const reply = {
      id: require('uuid').v4(),
      author: author || 'Anonymous',
      text: text,
      category: category || 'genuine',
      replies: []
    };

    const updatedForum = await ForumModel.addReply(id, threadId, reply);
    if (!updatedForum) {
      return res.status(404).json({ error: 'Forum or thread not found' });
    }

    res.json(updatedForum);
  } catch (err) {
    console.error('❌ Error in /api/forum/:id/reply:', err.message);
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/forum/:id/audio', async (req, res) => {
  try {
    const { id } = req.params;
    const forum = await ForumModel.findById(id);
    if (!forum) {
      return res.status(404).json({ error: 'Forum not found' });
    }
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
});

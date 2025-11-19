const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const ForumModel = require('./models/forum');
const UserModel = require('./models/user');
const MessageBoardModel = require('./models/messageBoard');
const forumizeService = require('./services/forumize');
const { generateAudioSummary } = require('./services/audio');
const { checkIfLive, processLiveChat } = require('./services/liveStreamService');
const { detectBot, recordPost, isBotUser } = require('./services/botDetection');

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

// Serve static files from the audio directory
const path = require('path');
app.use('/audio', express.static(path.join(__dirname, 'audio')));

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Forumise a video: fetch comments, classify and return threads/stats
app.post('/api/forumize', async (req, res) => {
  const { videoId, maxResults, useAI, removeSpam } = req.body;
  if (!videoId) {
    return res.status(400).json({ error: 'videoId is required' });
  }
  try {
    const options = {
      maxResults: maxResults || 50,
      useAI: useAI !== false,
      removeSpam: removeSpam !== false
    };
    const result = await forumizeService(videoId, options);
    res.json(result);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// Check if a video is currently live
app.get('/api/video/:videoId/live-status', async (req, res) => {
  const { videoId } = req.params;
  if (!videoId) {
    return res.status(400).json({ error: 'videoId is required' });
  }
  try {
    const liveStatus = await checkIfLive(videoId);
    res.json(liveStatus);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// Process live chat for a live stream and save to message board
app.post('/api/forumize/live', async (req, res) => {
  const { videoId, pageToken, removeSpam } = req.body;
  if (!videoId) {
    return res.status(400).json({ error: 'videoId is required' });
  }
  try {
    const options = {
      pageToken,
      removeSpam: removeSpam !== false
    };
    const result = await processLiveChat(videoId, options);

    if (result.isLive) {
      // Save to persistent message board
      const userId = req.headers['x-user-id'] || null;
      const board = MessageBoardModel.createOrUpdate({
        videoId,
        videoTitle: result.videoTitle,
        videoChannel: result.channelTitle,
        isLive: true,
        liveChatId: result.liveChatId,
        threads: result.threads,
        stats: result.stats
      }, userId);

      // Update page token for next poll
      if (result.nextPageToken) {
        MessageBoardModel.updatePageToken(board.id, result.nextPageToken);
      }

      res.json({
        ...result,
        boardId: board.id,
        shareToken: board.shareToken
      });
    } else {
      res.json(result);
    }
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// Get message board by video ID
app.get('/api/messageboard/video/:videoId', (req, res) => {
  const board = MessageBoardModel.findByVideoId(req.params.videoId);
  if (!board) {
    return res.status(404).json({ error: 'Message board not found' });
  }
  res.json(board);
});

// Get message board by ID
app.get('/api/messageboard/:id', (req, res) => {
  const board = MessageBoardModel.findById(req.params.id);
  if (!board) {
    return res.status(404).json({ error: 'Message board not found' });
  }
  res.json(board);
});

// Get all message boards for user
app.get('/api/messageboard/library', (req, res) => {
  const userId = req.headers['x-user-id'] || null;
  const boards = MessageBoardModel.findByUser(userId);
  res.json(boards);
});

// Mark message board as ended
app.post('/api/messageboard/:id/end', (req, res) => {
  const board = MessageBoardModel.markAsEnded(req.params.id);
  if (!board) {
    return res.status(404).json({ error: 'Message board not found' });
  }
  res.json(board);
});

// Delete message board
app.delete('/api/messageboard/:id', (req, res) => {
  const deleted = MessageBoardModel.deleteBoard(req.params.id);
  if (!deleted) {
    return res.status(404).json({ error: 'Message board not found' });
  }
  res.json({ success: true });
});

// Save a forum and return ID/share token (optionally userId from header)
app.post('/api/forum/save', (req, res) => {
  const { videoId, videoTitle, videoChannel, forumData } = req.body;
  if (!videoId || !forumData) {
    return res.status(400).json({ error: 'videoId and forumData are required' });
  }
  const userId = req.headers['x-user-id'] || null;
  const forum = ForumModel.create({ videoId, videoTitle, videoChannel, forumData }, userId);
  res.json({ id: forum.id, shareToken: forum.shareToken });
});

// Get all forums for the current user
app.get('/api/forum/library', (req, res) => {
  const userId = req.headers['x-user-id'] || null;
  if (!userId) {
    // For demonstration, return all forums if userId not provided
    return res.json(ForumModel.findByUser(null));
  }
  const forums = ForumModel.findByUser(userId);
  res.json(forums);
});

// Get a specific forum by ID
app.get('/api/forum/:id', (req, res) => {
  const forum = ForumModel.findById(req.params.id);
  if (!forum) {
    return res.status(404).json({ error: 'Forum not found' });
  }
  res.json(forum);
});

// Generate or retrieve share token for a forum
app.post('/api/forum/:id/share', (req, res) => {
  const token = ForumModel.generateShareToken(req.params.id);
  if (!token) {
    return res.status(404).json({ error: 'Forum not found' });
  }
  res.json({ shareToken: token });
});

// Retrieve a forum by share token (public access)
app.get('/api/forum/share/:token', (req, res) => {
  const forum = ForumModel.findByShareToken(req.params.token);
  if (!forum) {
    return res.status(404).json({ error: 'Forum not found' });
  }
  res.json(forum);
});

// Add a reply to a thread - with bot detection
app.post('/api/forum/:id/reply', (req, res) => {
  const { threadId, author, text, category, userId } = req.body;
  if (!threadId || !text) {
    return res.status(400).json({ error: 'threadId and text are required' });
  }

  // Check if user is flagged as bot - can only reply in Hell
  if (isBotUser(userId)) {
    const reply = {
      id: require('uuid').v4(),
      author: author || 'Anonymous',
      text,
      category: 'hell',
      inHell: true,
      replies: []
    };
    const updatedForum = ForumModel.addReply(req.params.id, threadId, reply);
    if (!updatedForum) {
      return res.status(404).json({ error: 'Forum not found' });
    }
    return res.json({ 
      ...updatedForum, 
      botWarning: 'Your account has been flagged as a bot. You can only reply in Hell.' 
    });
  }

  // Record the post for bot detection
  if (userId) {
    recordPost(userId, threadId);
    const botCheck = detectBot(userId);
    if (botCheck.shouldSendToHell) {
      console.log(`⚠️ Bot detected: ${userId} - ${botCheck.postCountIn30s} posts in 30s - SENT TO HELL`);
    }
  }

  const reply = {
    id: require('uuid').v4(),
    author: author || 'Anonymous',
    text,
    category: category || 'genuine',
    replies: []
  };
  const updatedForum = ForumModel.addReply(req.params.id, threadId, reply);
  if (!updatedForum) {
    return res.status(404).json({ error: 'Forum not found' });
  }
  res.json(updatedForum);
});

// Evaluate a partial comment in real‑time and return matching scene (stub)
// This endpoint is a placeholder for the video processing architecture described
// in the Forumyzer Video Processing Architecture document. In a production
// implementation, this route would:
//   1. Use a generative AI model (e.g. Gemini) to parse the comment and
//      extract the scene description, objects and actions.
//   2. Query a scene index stored in BigQuery/Firestore to find matching
//      timestamps in the analysed video.
//   3. Optionally perform local GPU inference for low‑latency results.
// For now, the API simply acknowledges the request and returns a not
// implemented response. Downstream clients should handle `found: false`.
app.post('/api/evaluate-comment', (req, res) => {
  const { videoId, comment, partialText } = req.body;
  console.log('evaluate-comment called for', videoId, comment || partialText);
  res.json({
    found: false,
    message: 'Scene matching not implemented yet',
    timestamp: null,
    endTime: null,
    description: null,
    confidence: 0
  });
});

// Endpoint to trigger local GPU processing (stub)
app.post('/api/process-local', (req, res) => {
  const { videoId } = req.body;
  res.json({
    processLocal: false,
    message: 'Local GPU processing is not available in this demo'
  });
});

// Generate and return audio summary for a forum
app.get('/api/forum/:id/audio', async (req, res) => {
  const forum = ForumModel.findById(req.params.id);
  if (!forum) {
    return res.status(404).json({ error: 'Forum not found' });
  }
  try {
    const audioUrl = await generateAudioSummary(forum.forumData.threads);
    res.json({ audioUrl });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to generate audio summary' });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Forumyzer backend is running on port ${PORT}`);
});

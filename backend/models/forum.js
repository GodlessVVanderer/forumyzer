const { v4: uuidv4 } = require('uuid');
const db = require('../db-async');

class ForumModel {
  static async create(forumData, userId = null) {
    const data = await db.load();
    const forumyzedForum = {
      id: uuidv4(),
      videoId: forumData.videoId,
      videoTitle: forumData.videoTitle,
      videoChannel: forumData.videoChannel,
      forumData: forumData.forumData,
      forumyzedAt: new Date().toISOString(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      userId,
      isPublic: true,
      shareToken: null,
      timesAccessed: 0
    };
    data.forums.push(forumyzedForum);
    await db.save(data);
    return forumyzedForum;
  }

  /**
   * CHECK IF VIDEO ALREADY FORUMYZED
   * Returns existing forumyzed data if video already processed
   */
  static async findByVideoId(videoId) {
    const data = await db.load();
    const existing = data.forums.find(f => f.videoId === videoId);
    
    if (existing) {
      // Increment access counter
      existing.timesAccessed = (existing.timesAccessed || 0) + 1;
      existing.lastAccessedAt = new Date().toISOString();
      await db.save(data);
      console.log(`✅ Video ${videoId} already forumyzed (accessed ${existing.timesAccessed} times)`);
    }
    
    return existing;
  }

  static async findByUser(userId) {
    const data = await db.load();
    return data.forums.filter(f => f.userId === userId);
  }

  static async findById(id) {
    const data = await db.load();
    return data.forums.find(f => f.id === id);
  }

  static async generateShareToken(id) {
    const data = await db.load();
    const forumyzedForum = data.forums.find(f => f.id === id);
    if (!forumyzedForum) return null;
    forumyzedForum.shareToken = uuidv4().replace(/-/g, '').slice(0, 12);
    forumyzedForum.isPublic = true;
    forumyzedForum.updatedAt = new Date().toISOString();
    await db.save(data);
    return forumyzedForum.shareToken;
  }

  static async findByShareToken(token) {
    const data = await db.load();
    return data.forums.find(f => f.shareToken === token);
  }

  static async addReply(forumId, threadId, reply) {
    const data = await db.load();
    const forumyzedForum = data.forums.find(f => f.id === forumId);
    if (!forumyzedForum) return null;

    const pushReply = (threads) => {
      for (const thread of threads) {
        if (thread.id === threadId) {
          thread.replies = thread.replies || [];
          thread.replies.push(reply);
          return true;
        }
        if (thread.replies && thread.replies.length) {
          if (pushReply(thread.replies)) return true;
        }
      }
      return false;
    };

    pushReply(forumyzedForum.forumData.threads);
    forumyzedForum.updatedAt = new Date().toISOString();
    await db.save(data);
    return forumyzedForum;
  }
}

module.exports = ForumModel;

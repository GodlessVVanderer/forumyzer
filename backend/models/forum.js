const { v4: uuidv4 } = require('uuid');
const db = require('../db-async');

/**
 * ForumModel - manages forumyzed forum persistence
 * Provides operations to save, retrieve, and share forumyzed forums.
 * All methods are async to use non-blocking file I/O.
 */
class ForumModel {
  /**
   * Create and persist a new forumyzed forum.
   * @param {Object} forumData Data containing videoId, title, channel and forumyzed threads/stats.
   * @param {String} userId Owner of the forumyzed forum (optional).
   * @returns {Object} The newly created forumyzed forum record.
   */
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
      isPublic: false,
      shareToken: null
    };
    data.forums.push(forumyzedForum);
    await db.save(data);
    return forumyzedForum;
  }

  /**
   * Retrieve all forumyzed forums for a given user.
   * @param {String} userId Owner ID.
   * @returns {Array} Array of forumyzed forums.
   */
  static async findByUser(userId) {
    const data = await db.load();
    return data.forums.filter(f => f.userId === userId);
  }

  /**
   * Find a single forumyzed forum by ID.
   * @param {String} id Forumyzed forum ID.
   * @returns {Object} The forumyzed forum record.
   */
  static async findById(id) {
    const data = await db.load();
    return data.forums.find(f => f.id === id);
  }

  /**
   * Generate a share token for a forumyzed forum and mark it public.
   * @param {String} id Forumyzed forum ID.
   * @returns {String} The generated share token.
   */
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

  /**
   * Find a forumyzed forum by share token.
   * @param {String} token Share token.
   * @returns {Object} The forumyzed forum record.
   */
  static async findByShareToken(token) {
    const data = await db.load();
    return data.forums.find(f => f.shareToken === token);
  }

  /**
   * Add a reply to a thread within a forumyzed forum.
   * @param {String} forumId Forumyzed forum ID.
   * @param {String} threadId Thread ID.
   * @param {Object} reply Reply object { id, author, text, category, replies }
   * @returns {Object} Updated forumyzed forum.
   */
  static async addReply(forumId, threadId, reply) {
    const data = await db.load();
    const forumyzedForum = data.forums.find(f => f.id === forumId);
    if (!forumyzedForum) return null;

    // Recursively search for thread and add reply
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

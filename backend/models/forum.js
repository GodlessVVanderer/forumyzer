const { v4: uuidv4 } = require('uuid');
const db = require('../db');

/**
 * Forum model provides operations to save and retrieve forums from the JSON DB.
 */
class ForumModel {
  /**
   * Create and persist a new forum.
   * @param {Object} forumData Data containing videoId, title, channel and threads/stats.
   * @param {String} userId Owner of the forum (optional).
   * @returns {Object} The newly created forum record.
   */
  static create(forumData, userId = null) {
    const data = db.load();
    const forum = {
      id: uuidv4(),
      videoId: forumData.videoId,
      videoTitle: forumData.videoTitle,
      videoChannel: forumData.videoChannel,
      forumData: forumData.forumData,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      userId,
      isPublic: false,
      shareToken: null
    };
    data.forums.push(forum);
    db.save(data);
    return forum;
  }

  /**
   * Retrieve all forums for a given user.
   * @param {String} userId Owner ID.
   * @returns {Array} Array of forums.
   */
  static findByUser(userId) {
    const data = db.load();
    return data.forums.filter(f => f.userId === userId);
  }

  /**
   * Find a single forum by ID.
   * @param {String} id Forum ID.
   */
  static findById(id) {
    const data = db.load();
    return data.forums.find(f => f.id === id);
  }

  /**
   * Generate a share token for a forum and mark it public.
   * @param {String} id Forum ID.
   */
  static generateShareToken(id) {
    const data = db.load();
    const forum = data.forums.find(f => f.id === id);
    if (!forum) return null;
    forum.shareToken = uuidv4().replace(/-/g, '').slice(0, 12);
    forum.isPublic = true;
    forum.updatedAt = new Date().toISOString();
    db.save(data);
    return forum.shareToken;
  }

  /**
   * Find a forum by share token.
   * @param {String} token Share token.
   */
  static findByShareToken(token) {
    const data = db.load();
    return data.forums.find(f => f.shareToken === token);
  }

  /**
   * Add a reply to a thread within a forum.
   * @param {String} forumId Forum ID.
   * @param {String} threadId Thread ID.
   * @param {Object} reply Reply object { id, author, text, category, replies }
   */
  static addReply(forumId, threadId, reply) {
    const data = db.load();
    const forum = data.forums.find(f => f.id === forumId);
    if (!forum) return null;
    // Recursively search for thread and push reply
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
    pushReply(forum.forumData.threads);
    forum.updatedAt = new Date().toISOString();
    db.save(data);
    return forum;
  }
}

module.exports = ForumModel;
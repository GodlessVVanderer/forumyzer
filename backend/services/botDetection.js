/**
 * Bot Detection Service
 * 
 * Tracks user posting patterns and identifies bots based on:
 * - Posting 10+ comments in 30 seconds
 * - Sends accounts to "Hell" (quarantine) if bot detected
 */

const userPostingHistory = new Map(); // { userId: [{ timestamp, threadId }, ...] }
const botUsers = new Set(); // Users flagged as bots
const POSTING_THRESHOLD = 10; // comments
const TIME_WINDOW = 30 * 1000; // 30 seconds in ms

/**
 * Check if a user is posting like a bot
 * Returns { isBot: boolean, shouldSendToHell: boolean }
 */
function detectBot(userId, currentTime = Date.now()) {
  if (!userPostingHistory.has(userId)) {
    userPostingHistory.set(userId, []);
  }

  const history = userPostingHistory.get(userId);
  
  // Remove old entries outside the time window
  const validEntries = history.filter(entry => currentTime - entry.timestamp < TIME_WINDOW);
  userPostingHistory.set(userId, validEntries);

  // Check if threshold exceeded
  const isBot = validEntries.length >= POSTING_THRESHOLD;

  if (isBot) {
    botUsers.add(userId);
  }

  return {
    isBot,
    postCountIn30s: validEntries.length,
    shouldSendToHell: isBot,
    wasFlaggedAsBot: botUsers.has(userId)
  };
}

/**
 * Record a new post from a user
 */
function recordPost(userId, threadId, timestamp = Date.now()) {
  if (!userPostingHistory.has(userId)) {
    userPostingHistory.set(userId, []);
  }

  const history = userPostingHistory.get(userId);
  history.push({ timestamp, threadId });

  // Keep history manageable - remove entries older than 5 minutes
  const fiveMinutesAgo = timestamp - (5 * 60 * 1000);
  const filtered = history.filter(entry => entry.timestamp > fiveMinutesAgo);
  userPostingHistory.set(userId, filtered);
}

/**
 * Check if user is flagged as a bot (for reply restrictions)
 */
function isBotUser(userId) {
  return botUsers.has(userId);
}

/**
 * Clear history for a user (e.g., after manual review)
 */
function clearUserHistory(userId) {
  userPostingHistory.delete(userId);
}

/**
 * Unblock a user from Hell
 */
function unblockUser(userId) {
  botUsers.delete(userId);
  userPostingHistory.delete(userId);
}

/**
 * Get stats for a user
 */
function getUserStats(userId) {
  const history = userPostingHistory.get(userId) || [];
  const now = Date.now();
  const recentPosts = history.filter(e => now - e.timestamp < TIME_WINDOW).length;
  
  return {
    totalTrackedPosts: history.length,
    postsIn30s: recentPosts,
    isBot: recentPosts >= POSTING_THRESHOLD,
    flaggedAsBot: botUsers.has(userId)
  };
}

module.exports = {
  detectBot,
  recordPost,
  isBotUser,
  clearUserHistory,
  unblockUser,
  getUserStats,
  POSTING_THRESHOLD,
  TIME_WINDOW
};

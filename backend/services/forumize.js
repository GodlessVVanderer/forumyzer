const axios = require('axios');
const { classifyComments, defaultCategories } = require('./classifier');

/**
 * Fetch comments from YouTube for a given video and categorise them.
 * @param {String} videoId The YouTube video ID.
 * @param {Number} maxResults Maximum number of threads to fetch (default 100).
 * @returns {Object} { threads: Array, stats: Object }
 */
async function forumize(videoId, maxResults = 50) {
  const apiKey = process.env.YOUTUBE_API_KEY;
  if (!apiKey) {
    throw new Error('YOUTUBE_API_KEY is not set in environment');
  }

  // Fetch top-level comment threads from the YouTube Data API
  const url = 'https://www.googleapis.com/youtube/v3/commentThreads';
  const params = {
    part: 'snippet,replies',
    videoId,
    maxResults,
    key: apiKey
  };

  let response;
  try {
    response = await axios.get(url, { params });
  } catch (error) {
    console.error('❌ YouTube API Error:', {
      message: error.response?.data?.error?.message || error.message,
      status: error.response?.status,
      details: error.response?.data
    });
    throw new Error(error.response?.data?.error?.message || 'YouTube API request failed');
  }
  const threads = response.data.items.map(item => {
    const top = item.snippet.topLevelComment.snippet;
    const comment = {
      id: item.snippet.topLevelComment.id,
      author: top.authorDisplayName,
      text: top.textOriginal,
      replies: []
    };
    // Extract replies if present
    if (item.replies && item.replies.comments) {
      comment.replies = item.replies.comments.map(c => ({
        id: c.id,
        author: c.snippet.authorDisplayName,
        text: c.snippet.textOriginal,
        replies: []
      }));
    }
    return comment;
  });

  // Classify comments
  const classifiedThreads = classifyComments(threads);
  // Recursively classify replies
  classifiedThreads.forEach(thread => {
    if (thread.replies && thread.replies.length) {
      thread.replies = classifyComments(thread.replies);
    }
  });

  // Compute statistics
  const stats = { totalComments: 0 };
  defaultCategories.forEach(cat => {
    stats[`${cat}Count`] = 0;
  });

  const countComments = (comments) => {
    comments.forEach(comment => {
      stats.totalComments++;
      stats[`${comment.category}Count`]++;
      if (comment.replies && comment.replies.length) {
        countComments(comment.replies);
      }
    });
  };
  countComments(classifiedThreads);
  defaultCategories.forEach(cat => {
    stats[`${cat}Percentage`] = stats.totalComments > 0
      ? Math.round((stats[`${cat}Count`] / stats.totalComments) * 100)
      : 0;
  });

  return {
    threads: classifiedThreads,
    stats
  };
}

module.exports = forumize;
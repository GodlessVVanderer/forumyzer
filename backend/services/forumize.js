const axios = require('axios');
const { classifyComments, defaultCategories } = require('./classifier');
const { fetchTikTokComments, extractVideoId: extractTikTokVideoId } = require('./tiktok');

/**
 * Fetch comments from YouTube or TikTok and categorise them.
 * @param {String} videoId The video ID or URL.
 * @param {Number} maxResults Maximum number of threads to fetch (default 50).
 * @param {String} platform Optional platform specification ('youtube' or 'tiktok'). Auto-detected if not provided.
 * @returns {Object} { threads: Array, stats: Object, platform: String }
 */
async function forumize(videoId, maxResults = 50, platform = null) {
  // Auto-detect platform if not specified
  if (!platform) {
    platform = detectPlatform(videoId);
  }

  let threads;
  if (platform === 'tiktok') {
    threads = await fetchTikTokThreads(videoId, maxResults);
  } else if (platform === 'youtube') {
    threads = await fetchYouTubeThreads(videoId, maxResults);
  } else {
    throw new Error(`Unsupported platform: ${platform}. Supported platforms: youtube, tiktok`);
  }

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
    stats,
    platform
  };
}

/**
 * Detect platform from video ID or URL
 */
function detectPlatform(videoIdOrUrl) {
  if (typeof videoIdOrUrl !== 'string') {
    return 'youtube'; // default
  }

  const str = videoIdOrUrl.toLowerCase();
  if (str.includes('tiktok.com') || str.includes('vm.tiktok')) {
    return 'tiktok';
  }
  if (str.includes('youtube.com') || str.includes('youtu.be')) {
    return 'youtube';
  }

  // If it's just an ID, check format
  // TikTok IDs are typically 19 digits
  if (/^\d{19}$/.test(videoIdOrUrl)) {
    return 'tiktok';
  }

  // YouTube IDs are typically 11 characters alphanumeric
  if (/^[a-zA-Z0-9_-]{11}$/.test(videoIdOrUrl)) {
    return 'youtube';
  }

  // Default to YouTube for backward compatibility
  return 'youtube';
}

/**
 * Fetch comments from YouTube
 */
async function fetchYouTubeThreads(videoId, maxResults) {
  const apiKey = process.env.YOUTUBE_API_KEY;
  if (!apiKey) {
    throw new Error('YOUTUBE_API_KEY is not set in environment');
  }

  // Extract video ID from URL if full URL provided
  let cleanVideoId = videoId;
  const youtubeUrlMatch = videoId.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([a-zA-Z0-9_-]{11})/);
  if (youtubeUrlMatch) {
    cleanVideoId = youtubeUrlMatch[1];
  }

  // Fetch top-level comment threads from the YouTube Data API
  const url = 'https://www.googleapis.com/youtube/v3/commentThreads';
  const params = {
    part: 'snippet,replies',
    videoId: cleanVideoId,
    maxResults,
    key: apiKey
  };
  const response = await axios.get(url, { params });
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

  return threads;
}

/**
 * Fetch comments from TikTok
 */
async function fetchTikTokThreads(videoIdOrUrl, maxResults) {
  // Extract video ID if URL provided
  let videoId = videoIdOrUrl;
  if (videoIdOrUrl.includes('tiktok.com')) {
    videoId = extractTikTokVideoId(videoIdOrUrl);
    if (!videoId) {
      throw new Error('Could not extract TikTok video ID from URL');
    }
  }

  const threads = await fetchTikTokComments(videoId, maxResults);
  return threads;
}

module.exports = forumize;

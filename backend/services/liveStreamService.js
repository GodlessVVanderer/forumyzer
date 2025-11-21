const axios = require('axios');
const { categorizeComments } = require('./aiCategorizer');

/**
 * Live stream chat service for YouTube
 * Handles real-time comment fetching and polling for live streams
 */

/**
 * Check if a video is currently live
 * @param {String} videoId YouTube video ID
 * @returns {Object} { isLive: boolean, liveChatId: string|null }
 */
async function checkIfLive(videoId) {
  const apiKey = process.env.YOUTUBE_API_KEY;
  if (!apiKey) {
    throw new Error('YOUTUBE_API_KEY is not set');
  }

  try {
    const url = 'https://www.googleapis.com/youtube/v3/videos';
    const response = await axios.get(url, {
      params: {
        part: 'liveStreamingDetails,snippet',
        id: videoId,
        key: apiKey
      }
    });

    if (!response.data.items || response.data.items.length === 0) {
      return { isLive: false, liveChatId: null, videoTitle: null, channelTitle: null };
    }

    const video = response.data.items[0];
    const liveDetails = video.liveStreamingDetails;
    const snippet = video.snippet;

    return {
      isLive: snippet.liveBroadcastContent === 'live',
      liveChatId: liveDetails?.activeLiveChatId || null,
      videoTitle: snippet.title,
      channelTitle: snippet.channelTitle,
      isUpcoming: snippet.liveBroadcastContent === 'upcoming',
      scheduledStartTime: liveDetails?.scheduledStartTime || null
    };
  } catch (error) {
    console.error('Error checking live status:', error.message);
    throw error;
  }
}

/**
 * Fetch live chat messages
 * @param {String} liveChatId Live chat ID from video
 * @param {String} pageToken Optional page token for pagination
 * @returns {Object} { messages: Array, nextPageToken: string, pollingIntervalMillis: number }
 */
async function fetchLiveChatMessages(liveChatId, pageToken = null) {
  const apiKey = process.env.YOUTUBE_API_KEY;
  if (!apiKey) {
    throw new Error('YOUTUBE_API_KEY is not set');
  }

  try {
    const url = 'https://www.googleapis.com/youtube/v3/liveChat/messages';
    const params = {
      liveChatId,
      part: 'snippet,authorDetails',
      maxResults: 200,
      key: apiKey
    };

    if (pageToken) {
      params.pageToken = pageToken;
    }

    const response = await axios.get(url, { params });

    const messages = response.data.items.map(item => ({
      id: item.id,
      author: item.authorDetails.displayName,
      authorChannelId: item.authorDetails.channelId,
      text: item.snippet.displayMessage || item.snippet.textMessageDetails?.messageText || '',
      publishedAt: item.snippet.publishedAt,
      type: item.snippet.type,
      isChatOwner: item.authorDetails.isChatOwner,
      isChatModerator: item.authorDetails.isChatModerator,
      isChatSponsor: item.authorDetails.isChatSponsor,
      profileImageUrl: item.authorDetails.profileImageUrl
    }));

    return {
      messages,
      nextPageToken: response.data.nextPageToken,
      pollingIntervalMillis: response.data.pollingIntervalMillis || 5000
    };
  } catch (error) {
    console.error('Error fetching live chat:', error.response?.data || error.message);
    throw error;
  }
}

/**
 * Process live chat for a video - fetch, classify, and filter
 * @param {String} videoId YouTube video ID
 * @param {Object} options Processing options
 * @returns {Object} { topics: Array, spam: Array, bots: Array, toxic: Array, stats: Object, isLive: boolean }
 */
async function processLiveChat(videoId, options = {}) {
  const liveStatus = await checkIfLive(videoId);

  if (!liveStatus.isLive) {
    return {
      isLive: false,
      error: liveStatus.isUpcoming ? 'Stream is scheduled but not live yet' : 'Video is not currently live',
      scheduledStartTime: liveStatus.scheduledStartTime
    };
  }

  const { liveChatId } = liveStatus;
  const { messages, nextPageToken, pollingIntervalMillis } = await fetchLiveChatMessages(liveChatId, options.pageToken);

  // Convert messages to comment format compatible with aiCategorizer
  const comments = messages.map(msg => ({
    text: msg.text,
    author: msg.author,
    authorChannelId: msg.authorChannelId,
    publishedAt: msg.publishedAt,
    replies: []
  }));

  // Use AI categorizer to filter and create topics
  const categorized = await categorizeComments(comments);

  // Calculate statistics
  const stats = {
    totalComments: comments.length,
    topicsFound: categorized.topics.length,
    spamFiltered: categorized.spam.length,
    botsDetected: categorized.bots.length,
    toxicComments: categorized.toxic.length,
    genuineComments: categorized.genuine.length,
    spamPercentage: ((categorized.spam.length / comments.length) * 100).toFixed(1),
    botPercentage: ((categorized.bots.length / comments.length) * 100).toFixed(1),
    genuinePercentage: ((categorized.genuine.length / comments.length) * 100).toFixed(1)
  };

  return {
    isLive: true,
    liveChatId,
    topics: categorized.topics,
    spam: categorized.spam,
    bots: categorized.bots,
    toxic: categorized.toxic,
    genuine: categorized.genuine,
    stats,
    nextPageToken,
    pollingIntervalMillis,
    videoTitle: liveStatus.videoTitle,
    channelTitle: liveStatus.channelTitle
  };
}

module.exports = {
  checkIfLive,
  fetchLiveChatMessages,
  processLiveChat
};

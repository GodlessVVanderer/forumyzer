const axios = require('axios');
const { categorizeInBatches } = require('./aiCategorizer');

/**
 * Fetch ALL comments from a YouTube video (up to API limits)
 */
async function fetchAllComments(videoId, apiKey) {
  const url = 'https://www.googleapis.com/youtube/v3/commentThreads';
  let allComments = [];
  let nextPageToken = null;
  let pageCount = 0;
  const maxPages = 50; // Fetch up to 50 pages (5000 comments max due to API limits)

  console.log(`📥 Fetching comments for video ${videoId}...`);

  do {
    const params = {
      part: 'snippet,replies',
      videoId,
      maxResults: 100, // Max per page
      key: apiKey,
      order: 'relevance'
    };

    if (nextPageToken) {
      params.pageToken = nextPageToken;
    }

    try {
      const response = await axios.get(url, { params });
      const items = response.data.items || [];

      // Extract top-level comments
      items.forEach(item => {
        const topComment = item.snippet.topLevelComment;
        allComments.push({
          id: topComment.id,
          author: topComment.snippet.authorDisplayName,
          text: topComment.snippet.textOriginal,
          likeCount: topComment.snippet.likeCount || 0,
          publishedAt: topComment.snippet.publishedAt,
          replies: []
        });

        // Extract replies if present
        if (item.replies && item.replies.comments) {
          const replyComments = item.replies.comments.map(reply => ({
            id: reply.id,
            author: reply.snippet.authorDisplayName,
            text: reply.snippet.textOriginal,
            likeCount: reply.snippet.likeCount || 0,
            publishedAt: reply.snippet.publishedAt,
            isReply: true,
            parentId: topComment.id
          }));
          allComments[allComments.length - 1].replies = replyComments;
        }
      });

      nextPageToken = response.data.nextPageToken;
      pageCount++;

      console.log(`📄 Page ${pageCount}: Fetched ${items.length} comment threads (Total: ${allComments.length})`);

      // Respect API rate limits
      await new Promise(resolve => setTimeout(resolve, 100));

    } catch (error) {
      console.error(`❌ Error fetching page ${pageCount + 1}:`, error.message);
      break;
    }

  } while (nextPageToken && pageCount < maxPages);

  console.log(`✅ Total comments fetched: ${allComments.length}`);
  return allComments;
}

/**
 * Main forumyze service - fetch and categorize comments
 */
async function forumyzeService(videoId) {
  const apiKey = process.env.YOUTUBE_API_KEY;

  if (!apiKey) {
    throw new Error('YOUTUBE_API_KEY not configured');
  }

  console.log(`🎬 Starting forumyze for video: ${videoId}`);

  // Fetch all comments
  const allComments = await fetchAllComments(videoId, apiKey);

  if (allComments.length === 0) {
    return {
      videoId,
      topics: [],
      stats: {
        totalComments: 0,
        topicsFound: 0,
        spamFiltered: 0,
        botsDetected: 0
      },
      forumyzedAt: new Date().toISOString()
    };
  }

  // Use AI to categorize comments into topics
  console.log(`🤖 Running AI categorization on ${allComments.length} comments...`);
  const categorized = await categorizeInBatches(allComments, 100);

  const stats = {
    totalComments: allComments.length,
    topicsFound: categorized.topics.length,
    spamFiltered: categorized.spam.length,
    botsDetected: categorized.bots.length,
    toxicComments: categorized.toxic.length,
    genuineComments: categorized.genuine.length,
    spamPercentage: ((categorized.spam.length / allComments.length) * 100).toFixed(1),
    botPercentage: ((categorized.bots.length / allComments.length) * 100).toFixed(1),
    genuinePercentage: ((categorized.genuine.length / allComments.length) * 100).toFixed(1)
  };

  console.log(`✅ Forumyze complete:`, stats);

  return {
    videoId,
    topics: categorized.topics,
    spam: categorized.spam,
    bots: categorized.bots,
    toxic: categorized.toxic,
    genuine: categorized.genuine,
    stats,
    forumyzedAt: new Date().toISOString()
  };
}

module.exports = forumyzeService;

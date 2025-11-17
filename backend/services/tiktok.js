const axios = require('axios');

/**
 * Fetch comments from TikTok for a given video.
 *
 * Note: TikTok doesn't provide an official public API for comments.
 * This service uses a fallback approach with mock data for demonstration.
 * In production, consider using:
 * - Apify TikTok Comments Scraper (requires API key)
 * - RapidAPI TikTok endpoints
 * - Custom scraping solution with proper authentication
 *
 * @param {String} videoId The TikTok video ID
 * @param {Number} maxResults Maximum number of comments to fetch
 * @returns {Array} Array of comment objects
 */
async function fetchTikTokComments(videoId, maxResults = 50) {
  // Check if we have an Apify API token
  const apifyToken = process.env.APIFY_API_TOKEN;

  if (apifyToken) {
    // Use Apify TikTok Comments Scraper
    return await fetchWithApify(videoId, apifyToken, maxResults);
  }

  // Check if we have RapidAPI key
  const rapidApiKey = process.env.RAPIDAPI_KEY;
  if (rapidApiKey) {
    return await fetchWithRapidAPI(videoId, rapidApiKey, maxResults);
  }

  // Fallback: Return mock data for demonstration
  console.warn('No TikTok API credentials found. Using mock data.');
  console.warn('To use real TikTok data, set APIFY_API_TOKEN or RAPIDAPI_KEY in your .env file');
  return generateMockComments(videoId, maxResults);
}

/**
 * Fetch comments using Apify TikTok Comments Scraper
 */
async function fetchWithApify(videoId, token, maxResults) {
  try {
    const url = 'https://api.apify.com/v2/acts/clockworks~tiktok-comments-scraper/runs';

    // Start the scraper
    const response = await axios.post(
      url,
      {
        videoUrls: [`https://www.tiktok.com/@user/video/${videoId}`],
        maxComments: maxResults,
      },
      {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        }
      }
    );

    const runId = response.data.data.id;

    // Wait for the run to complete (simplified polling)
    await new Promise(resolve => setTimeout(resolve, 5000));

    // Get the results
    const resultsUrl = `https://api.apify.com/v2/acts/clockworks~tiktok-comments-scraper/runs/${runId}/dataset/items`;
    const resultsResponse = await axios.get(resultsUrl, {
      headers: { 'Authorization': `Bearer ${token}` }
    });

    // Transform Apify format to our format
    return resultsResponse.data.map((item, index) => ({
      id: item.id || `tiktok_${index}`,
      author: item.userName || item.uniqueId || 'TikTok User',
      text: item.text || item.comment || '',
      replies: []
    }));
  } catch (error) {
    console.error('Apify fetch error:', error.message);
    return generateMockComments(videoId, maxResults);
  }
}

/**
 * Fetch comments using RapidAPI (placeholder)
 */
async function fetchWithRapidAPI(videoId, apiKey, maxResults) {
  try {
    // Note: Update this URL with actual RapidAPI endpoint
    const url = 'https://tiktok-scraper7.p.rapidapi.com/comments';

    const response = await axios.get(url, {
      params: {
        video_id: videoId,
        count: maxResults
      },
      headers: {
        'X-RapidAPI-Key': apiKey,
        'X-RapidAPI-Host': 'tiktok-scraper7.p.rapidapi.com'
      }
    });

    // Transform RapidAPI format to our format
    const comments = response.data.comments || response.data.data || [];
    return comments.map((comment, index) => ({
      id: comment.cid || comment.id || `tiktok_${index}`,
      author: comment.user?.nickname || comment.user?.unique_id || 'TikTok User',
      text: comment.text || comment.comment_text || '',
      replies: []
    }));
  } catch (error) {
    console.error('RapidAPI fetch error:', error.message);
    return generateMockComments(videoId, maxResults);
  }
}

/**
 * Generate mock comments for demonstration purposes
 */
function generateMockComments(videoId, count) {
  const mockComments = [
    { text: 'This is hilarious! 😂', author: 'user123' },
    { text: 'Love this content! Keep it up', author: 'fan_account' },
    { text: 'Where can I buy this?', author: 'curious_viewer' },
    { text: 'First! 🎉', author: 'speedster99' },
    { text: 'This is so relatable lol', author: 'everyday_user' },
    { text: 'Can you do a tutorial?', author: 'learner_2024' },
    { text: 'Check out my profile for similar content!!! Link in bio!!!', author: 'spammer123' },
    { text: 'This is fake and stupid', author: 'hater_account' },
    { text: '❤️❤️❤️', author: 'emoji_lover' },
    { text: 'How did you do that? Amazing!', author: 'impressed_viewer' },
    { text: 'Subscribe to my channel www.example.com', author: 'bot_account' },
    { text: 'This trend needs to stop', author: 'critic_user' },
    { text: 'Tag someone who needs to see this', author: 'social_butterfly' },
    { text: 'Part 2?? Please!', author: 'eager_fan' },
    { text: 'I tried this and it worked!', author: 'success_story' },
    { text: 'Why is everyone doing this?', author: 'confused_user' },
    { text: 'This deserves more views', author: 'supporter_account' },
    { text: 'You are so talented!', author: 'admirer_123' },
    { text: 'Can we collab?', author: 'creator_wannabe' },
    { text: 'I hate this so much', author: 'negative_nancy' }
  ];

  const comments = [];
  const actualCount = Math.min(count, mockComments.length);

  for (let i = 0; i < actualCount; i++) {
    const mock = mockComments[i % mockComments.length];
    comments.push({
      id: `tiktok_mock_${videoId}_${i}`,
      author: mock.author,
      text: mock.text,
      replies: []
    });
  }

  return comments;
}

/**
 * Extract video ID from TikTok URL
 */
function extractVideoId(url) {
  // Match patterns like:
  // https://www.tiktok.com/@username/video/1234567890
  // https://vm.tiktok.com/XXXXXXX/
  // https://www.tiktok.com/t/XXXXXXX/

  const patterns = [
    /tiktok\.com\/@[\w.-]+\/video\/(\d+)/,
    /vm\.tiktok\.com\/([\w]+)/,
    /tiktok\.com\/t\/([\w]+)/,
  ];

  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match) {
      return match[1];
    }
  }

  // If already just an ID
  if (/^\d+$/.test(url)) {
    return url;
  }

  return null;
}

module.exports = {
  fetchTikTokComments,
  extractVideoId
};

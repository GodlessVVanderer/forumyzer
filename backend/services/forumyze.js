const axios = require('axios');
const { categorizeInBatches } = require('./aiCategorizer');
const { flagUserForTimeout, handleRepeatOffender, isOnProbation } = require('./timeoutSystem');

async function fetchAllComments(videoId, apiKey) {
  const url = 'https://www.googleapis.com/youtube/v3/commentThreads';
  let allComments = [];
  let nextPageToken = null;
  let pageCount = 0;
  const maxPages = 50;

  console.log(`📥 Fetching comments for video ${videoId}...`);

  do {
    const params = { part: 'snippet,replies', videoId, maxResults: 100, key: apiKey, order: 'relevance' };
    if (nextPageToken) params.pageToken = nextPageToken;

    try {
      const response = await axios.get(url, { params, timeout: 10000 });
      const items = response.data.items || [];

      items.forEach(item => {
        const topComment = item.snippet.topLevelComment;
        const comment = {
          id: topComment.id,
          author: topComment.snippet.authorDisplayName,
          authorId: topComment.snippet.authorChannelId?.value || null,
          text: topComment.snippet.textOriginal,
          likeCount: topComment.snippet.likeCount || 0,
          publishedAt: topComment.snippet.publishedAt,
          replies: []
        };

        allComments.push(comment);

        if (item.replies && item.replies.comments) {
          comment.replies = item.replies.comments.map(reply => ({
            id: reply.id,
            author: reply.snippet.authorDisplayName,
            authorId: reply.snippet.authorChannelId?.value || null,
            text: reply.snippet.textOriginal,
            likeCount: reply.snippet.likeCount || 0,
            publishedAt: reply.snippet.publishedAt,
            isReply: true,
            parentId: topComment.id
          }));
        }
      });

      nextPageToken = response.data.nextPageToken;
      pageCount++;
      console.log(`📄 Page ${pageCount}: ${items.length} threads (Total: ${allComments.length})`);
      await new Promise(resolve => setTimeout(resolve, 100));

    } catch (error) {
      console.error(`❌ Error page ${pageCount + 1}:`, error.message);
      break;
    }
  } while (nextPageToken && pageCount < maxPages);

  console.log(`✅ Total fetched: ${allComments.length}`);
  return allComments;
}

async function processTimeoutFlags(categorized) {
  const timeoutEntries = [];
  for (const comment of categorized.spam) {
    if (!comment.authorId) continue;
    const entry = isOnProbation(comment.authorId) 
      ? await handleRepeatOffender(comment.authorId, comment.author, comment.text)
      : await flagUserForTimeout(comment.authorId, comment.author, comment.text, 'Spam');
    if (entry) timeoutEntries.push(entry);
  }
  return timeoutEntries;
}

function transformToThreads(categorized) {
  const threads = [];
  
  categorized.topics.forEach(topic => {
    topic.comments.forEach(comment => {
      threads.push({
        id: comment.id,
        author: comment.author,
        text: comment.text,
        category: 'genuine',
        topic: topic.title,
        replies: comment.replies || []
      });
    });
  });

  categorized.spam.forEach(c => threads.push({ ...c, category: 'spam', replies: c.replies || [] }));
  categorized.bots.forEach(c => threads.push({ ...c, category: 'bot', replies: c.replies || [] }));
  categorized.toxic.forEach(c => threads.push({ ...c, category: 'toxic', replies: c.replies || [] }));

  return threads;
}

async function forumyzeService(videoId) {
  const apiKey = process.env.YOUTUBE_API_KEY;
  if (!apiKey) throw new Error('YOUTUBE_API_KEY not configured');

  console.log(`🎬 Forumyze: ${videoId}`);
  
  const allComments = await fetchAllComments(videoId, apiKey);
  if (allComments.length === 0) {
    return { videoId, threads: [], stats: { totalComments: 0 }, forumyzedAt: new Date().toISOString() };
  }

  console.log(`🤖 AI categorizing ${allComments.length} comments...`);
  const categorized = await categorizeInBatches(allComments, 100);

  console.log(`⏱️ Processing timeouts...`);
  const timeoutEntries = await processTimeoutFlags(categorized);

  console.log(`🔄 Transforming to threads...`);
  const threads = transformToThreads(categorized);

  const stats = {
    totalComments: allComments.length,
    topicsFound: categorized.topics.length,
    spamFiltered: categorized.spam.length,
    botsDetected: categorized.bots.length,
    spamPercentage: ((categorized.spam.length / allComments.length) * 100).toFixed(1)
  };

  console.log(`✅ Complete:`, stats);

  return { 
    videoId, 
    threads,  // THIS IS WHAT FRONTEND NEEDS
    topics: categorized.topics, 
    timeout: timeoutEntries, 
    stats, 
    forumyzedAt: new Date().toISOString() 
  };
}

module.exports = forumyzeService;
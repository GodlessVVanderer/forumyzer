const { GoogleGenerativeAI } = require('@google/generative-ai');

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

/**
 * Use Gemini AI to intelligently categorize comments into discussion topics
 * and detect spam/bots
 */
async function categorizeCommentsWithAI(comments) {
  if (!comments || comments.length === 0) {
    return { topics: [], spam: [], bots: [], genuine: [] };
  }

  try {
    // Build prompt for AI analysis
    const commentTexts = comments.slice(0, 100).map((c, i) => 
      `${i + 1}. [${c.author}]: ${c.text.substring(0, 200)}`
    ).join('\n');

    const prompt = `Analyze these YouTube comments and organize them into discussion topics. Also identify spam and bot comments.

Comments:
${commentTexts}

Return a JSON object with this structure:
{
  "topics": [
    {
      "title": "Topic name",
      "description": "Brief description",
      "commentIds": [1, 5, 12],
      "sentiment": "positive|negative|neutral"
    }
  ],
  "spam": [2, 8],
  "bots": [15],
  "toxic": [3]
}

Rules:
- Group comments by actual discussion topics, not just keywords
- Identify spam (promotional links, fake engagement, scams)
- Identify bots (repetitive patterns, automated messages)
- Identify toxic comments (hate speech, harassment, extreme negativity)
- Use comment numbers (1-${Math.min(comments.length, 100)})
- Return ONLY valid JSON, no markdown`;

    const result = await model.generateContent(prompt);
    const response = result.response.text();
    
    // Extract JSON from markdown code blocks if present
    let jsonText = response;
    const jsonMatch = response.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (jsonMatch) {
      jsonText = jsonMatch[1];
    }

    const categorization = JSON.parse(jsonText.trim());

    // Map comment indices back to actual comment objects
    const organized = {
      topics: categorization.topics.map(topic => ({
        ...topic,
        comments: topic.commentIds
          .map(id => comments[id - 1])
          .filter(Boolean)
      })),
      spam: categorization.spam.map(id => comments[id - 1]).filter(Boolean),
      bots: categorization.bots.map(id => comments[id - 1]).filter(Boolean),
      toxic: categorization.toxic.map(id => comments[id - 1]).filter(Boolean),
      genuine: comments.filter((_, i) => {
        const idx = i + 1;
        return !categorization.spam.includes(idx) &&
               !categorization.bots.includes(idx) &&
               !categorization.toxic.includes(idx);
      })
    };

    console.log(`✅ AI categorized ${comments.length} comments into ${organized.topics.length} topics`);
    return organized;

  } catch (error) {
    console.error('❌ AI categorization failed:', error.message);
    // Fallback to simple categorization
    return {
      topics: [{
        title: 'All Comments',
        description: 'Unable to categorize - showing all comments',
        comments: comments,
        sentiment: 'neutral'
      }],
      spam: [],
      bots: [],
      toxic: [],
      genuine: comments
    };
  }
}

/**
 * Batch process large numbers of comments
 */
async function categorizeInBatches(comments, batchSize = 100) {
  const batches = [];
  for (let i = 0; i < comments.length; i += batchSize) {
    batches.push(comments.slice(i, i + batchSize));
  }

  console.log(`📦 Processing ${comments.length} comments in ${batches.length} batches`);

  const results = await Promise.all(
    batches.map((batch, i) => {
      console.log(`⏳ Processing batch ${i + 1}/${batches.length}...`);
      return categorizeCommentsWithAI(batch);
    })
  );

  // Merge all batch results
  const merged = {
    topics: [],
    spam: [],
    bots: [],
    toxic: [],
    genuine: []
  };

  results.forEach(result => {
    merged.topics.push(...result.topics);
    merged.spam.push(...result.spam);
    merged.bots.push(...result.bots);
    merged.toxic.push(...result.toxic);
    merged.genuine.push(...result.genuine);
  });

  console.log(`✅ Total topics found: ${merged.topics.length}`);
  console.log(`🗑️ Spam filtered: ${merged.spam.length}`);
  console.log(`🤖 Bots detected: ${merged.bots.length}`);
  console.log(`💀 Toxic comments: ${merged.toxic.length}`);

  return merged;
}

module.exports = {
  categorizeCommentsWithAI,
  categorizeInBatches
};

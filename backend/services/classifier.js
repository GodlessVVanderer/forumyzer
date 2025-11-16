/*
 * Very simple spam classifier. In a real application, replace this
 * module with a call to your AI model or an external API that
 * categorises comments into spam, bot, toxic, genuine, or question.
 */

const defaultCategories = ['spam', 'bot', 'toxic', 'genuine', 'question'];

/**
 * Classify a list of comments based on naive keyword detection.
 * @param {Array} comments Array of comment objects { id, author, text, replies }
 * @returns {Array} The same array with a `category` field added.
 */
function classifyComments(comments) {
  return comments.map(comment => {
    const text = comment.text.toLowerCase();
    let category = 'genuine';
    if (/http|www|\.com|subscribe/.test(text)) {
      category = 'spam';
    } else if (/bot|automated|robot/.test(text)) {
      category = 'bot';
    } else if (/hate|kill|stupid|idiot|racist|expletive/.test(text)) {
      category = 'toxic';
    } else if (/[\?]/.test(text)) {
      category = 'question';
    }
    return { ...comment, category };
  });
}

module.exports = { classifyComments, defaultCategories };
const { GoogleGenerativeAI } = require('@google/generative-ai');

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

/**
 * TIMEOUT SYSTEM
 * 
 * When users are flagged for spam/toxic behavior:
 * 1. AI generates a question about their behavior
 * 2. They're moved to TIMEOUT where community can see
 * 3. Community votes on whether to restore them
 * 4. If restored but spam again → 2 hour suspension
 */

// In-memory storage (replace with database in production)
const timeoutUsers = new Map();
const userVotes = new Map();
const suspensions = new Map();

/**
 * Flag a user and send them to TIMEOUT
 */
async function flagUserForTimeout(userId, username, violatingComment, reason) {
  // Check if user is already suspended
  if (isSuspended(userId)) {
    console.log(`⛔ User ${username} is currently suspended`);
    return null;
  }

  // Generate AI question about their behavior
  const question = await generateTimeoutQuestion(username, violatingComment, reason);

  const timeoutEntry = {
    userId,
    username,
    violatingComment,
    reason,
    question,
    userResponse: null,
    votes: { restore: 0, keep: 0 },
    flaggedAt: new Date().toISOString(),
    status: 'pending' // pending, restored, suspended
  };

  timeoutUsers.set(userId, timeoutEntry);
  userVotes.set(userId, { restore: new Set(), keep: new Set() });

  console.log(`⏱️ User ${username} sent to TIMEOUT: ${reason}`);
  return timeoutEntry;
}

/**
 * Generate AI question about user's behavior
 */
async function generateTimeoutQuestion(username, comment, reason) {
  const prompt = `A user named "${username}" was flagged for: ${reason}

Their comment: "${comment}"

Generate ONE direct question asking them to explain their behavior. The question should:
- Be respectful but direct
- Focus on the specific issue
- Allow them to explain their intentions
- Be under 200 characters

Return ONLY the question, nothing else.`;

  try {
    const result = await model.generateContent(prompt);
    const question = result.response.text().trim();
    return question;
  } catch (error) {
    console.error('❌ Failed to generate timeout question:', error.message);
    return `Why did you post this comment? Can you explain your intentions?`;
  }
}

/**
 * User responds to their timeout question
 */
function submitTimeoutResponse(userId, response) {
  const entry = timeoutUsers.get(userId);
  if (!entry) {
    throw new Error('User not in timeout');
  }

  entry.userResponse = response;
  entry.respondedAt = new Date().toISOString();

  console.log(`💬 User ${entry.username} responded to timeout question`);
  return entry;
}

/**
 * Community member votes on timeout user
 */
function voteOnTimeoutUser(userId, voterId, voteType) {
  if (!timeoutUsers.has(userId)) {
    throw new Error('User not in timeout');
  }

  const votes = userVotes.get(userId);
  const entry = timeoutUsers.get(userId);

  // Remove previous vote if exists
  votes.restore.delete(voterId);
  votes.keep.delete(voterId);

  // Add new vote
  if (voteType === 'restore') {
    votes.restore.add(voterId);
  } else {
    votes.keep.add(voterId);
  }

  // Update vote counts
  entry.votes.restore = votes.restore.size;
  entry.votes.keep = votes.keep.size;

  // Check if threshold reached (5 votes to restore, 10 votes to keep)
  if (entry.votes.restore >= 5) {
    restoreUser(userId);
  } else if (entry.votes.keep >= 10) {
    suspendUser(userId, 2 * 60 * 60 * 1000); // 2 hours
  }

  return entry;
}

/**
 * Restore user from timeout
 */
function restoreUser(userId) {
  const entry = timeoutUsers.get(userId);
  if (!entry) return;

  entry.status = 'restored';
  entry.restoredAt = new Date().toISOString();

  // Mark user as "on probation" - if they spam again, instant suspension
  entry.onProbation = true;

  console.log(`✅ User ${entry.username} restored from timeout`);
  return entry;
}

/**
 * Suspend user for a duration
 */
function suspendUser(userId, durationMs) {
  const entry = timeoutUsers.get(userId);
  if (!entry) return;

  const suspendUntil = Date.now() + durationMs;
  suspensions.set(userId, suspendUntil);

  entry.status = 'suspended';
  entry.suspendedAt = new Date().toISOString();
  entry.suspendUntil = new Date(suspendUntil).toISOString();

  console.log(`🚫 User ${entry.username} suspended until ${new Date(suspendUntil).toLocaleString()}`);
  return entry;
}

/**
 * Check if user is currently suspended
 */
function isSuspended(userId) {
  const suspendUntil = suspensions.get(userId);
  if (!suspendUntil) return false;

  if (Date.now() >= suspendUntil) {
    // Suspension expired
    suspensions.delete(userId);
    return false;
  }

  return true;
}

/**
 * Check if user is on probation (restored once already)
 */
function isOnProbation(userId) {
  const entry = timeoutUsers.get(userId);
  return entry?.onProbation === true;
}

/**
 * Get all users currently in timeout
 */
function getTimeoutUsers(status = 'pending') {
  const users = Array.from(timeoutUsers.values());
  
  if (status === 'all') {
    return users;
  }

  return users.filter(u => u.status === status);
}

/**
 * Get timeout entry for specific user
 */
function getTimeoutEntry(userId) {
  return timeoutUsers.get(userId);
}

/**
 * Handle repeat offender - if user was restored but spammed again
 */
async function handleRepeatOffender(userId, username, newViolation) {
  if (isOnProbation(userId)) {
    // Automatic 2 hour suspension for repeat offense
    console.log(`🚨 Repeat offender ${username} - instant suspension`);
    suspendUser(userId, 2 * 60 * 60 * 1000);
    
    return {
      action: 'suspended',
      reason: 'Repeat offense after restoration',
      duration: '2 hours'
    };
  }

  // First offense - send to timeout
  return flagUserForTimeout(userId, username, newViolation, 'Repeat spam/toxic behavior');
}

/**
 * Paid users can voluntarily enter TIMEOUT for visibility
 */
async function voluntaryTimeout(userId, username, topic, isPaidUser = false) {
  if (!isPaidUser) {
    throw new Error('Voluntary timeout is for paid users only');
  }

  const question = `What discussion topic would you like the community to engage with?`;
  
  const timeoutEntry = {
    userId,
    username,
    topic,
    reason: 'voluntary',
    question,
    userResponse: topic,
    votes: { engage: 0, skip: 0 },
    flaggedAt: new Date().toISOString(),
    status: 'voluntary',
    autoRestoreAt: new Date(Date.now() + 6 * 60 * 60 * 1000).toISOString() // 6 hours
  };

  timeoutUsers.set(userId, timeoutEntry);

  console.log(`⏰ Paid user ${username} voluntarily entered timeout for 6 hours`);
  return timeoutEntry;
}

module.exports = {
  flagUserForTimeout,
  submitTimeoutResponse,
  voteOnTimeoutUser,
  restoreUser,
  suspendUser,
  isSuspended,
  isOnProbation,
  getTimeoutUsers,
  getTimeoutEntry,
  handleRepeatOffender,
  voluntaryTimeout,
  generateTimeoutQuestion
};

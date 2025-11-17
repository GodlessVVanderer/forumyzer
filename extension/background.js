// Forumyzer background service worker
// Handles authentication, API requests and storage for the extension

// Runs when the extension is installed or updated
chrome.runtime.onInstalled.addListener(() => {
  console.log('Forumyzer background script installed');
});

/**
 * Obtain an OAuth token for the current user. If interactive is true,
 * Chrome will prompt the user to sign in. Returns a Promise that
 * resolves to the token string or rejects with an error.
 */
function getAuthToken(interactive = false) {
  return new Promise((resolve, reject) => {
    chrome.identity.getAuthToken({ interactive }, (token) => {
      if (chrome.runtime.lastError) {
        return reject(chrome.runtime.lastError);
      }
      resolve(token);
    });
  });
}

/**
 * Call the Forumyzer backend with the given method, path and body.
 * Automatically attaches the OAuth token in the Authorization header.
 */
async function callBackend(method, path, body) {
  const token = await getAuthToken(true);
  const backendUrl = process.env.VITE_BACKEND_URL || 'http://localhost:3000';
  const url = `${backendUrl}${path}`;
  const res = await fetch(url, {
    method,
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: body ? JSON.stringify(body) : undefined
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(err.error || `HTTP ${res.status}`);
  }
  return res.json();
}

// Listen for messages from content scripts and popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  (async () => {
    try {
      switch (request.action) {
        case 'getAuthToken': {
          const token = await getAuthToken(true);
          sendResponse({ token });
          break;
        }
        case 'forumizeVideo': {
          const { videoId, videoTitle, videoChannel, platform } = request;
          // Step 1: call backend to forumize comments
          const forumData = await callBackend('POST', '/api/forumize', {
            videoId,
            platform: platform || 'youtube' // default to youtube for backwards compatibility
          });
          // Step 2: persist forum to backend
          const saveRes = await callBackend('POST', '/api/forum/save', {
            videoId,
            videoTitle: videoTitle || '',
            videoChannel: videoChannel || '',
            forumData
          });
          // Step 3: store forum in chrome.storage
          chrome.storage.local.set({
            forumData: {
              id: saveRes.id,
              videoId,
              videoTitle,
              videoChannel,
              platform: forumData.platform || platform || 'youtube',
              threads: forumData.threads,
              stats: forumData.stats
            }
          });
          sendResponse({ data: forumData, forumId: saveRes.id });
          break;
        }
        case 'getAudioSummary': {
          const { forumId } = request;
          const audioRes = await callBackend('GET', `/api/forum/${forumId}/audio`);
          sendResponse({ audioUrl: audioRes.audioUrl });
          break;
        }
        default:
          sendResponse({ error: 'Unknown action' });
      }
    } catch (error) {
      sendResponse({ error: error.message });
    }
  })();
  return true; // indicates asynchronous response
});
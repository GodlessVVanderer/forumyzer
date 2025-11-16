// Forumyzer content script
// Injects a custom button into YouTube video pages and communicates
// with the background service worker to forumize the current video.

console.log('Forumyzer content script loaded');

// Wait for the document to be ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}

// Reinitialize when navigating within YouTube (single‑page app)
window.addEventListener('yt-navigate-finish', init);

function init() {
  const videoId = getVideoId();
  if (!videoId) return;
  addForumyzerButton(videoId);
}

function getVideoId() {
  const params = new URLSearchParams(window.location.search);
  return params.get('v');
}

function addForumyzerButton(videoId) {
  if (document.getElementById('forumyzer-btn')) return;
  const container = document.querySelector('#top-level-buttons-computed');
  if (!container) return;
  const btn = document.createElement('button');
  btn.id = 'forumyzer-btn';
  btn.textContent = '📋 Forumyzer';
  btn.style.cssText = `
    padding: 8px 16px;
    margin: 0 8px;
    background-color: #FF0033;
    color: white;
    border: none;
    border-radius: 20px;
    cursor: pointer;
    font-size: 14px;
    font-weight: bold;
  `;
  btn.addEventListener('click', () => {
    btn.disabled = true;
    btn.textContent = 'Loading...';
    // Extract video title and channel name from the page (if available)
    const titleElem = document.querySelector('h1.title yt-formatted-string');
    const channelElem = document.querySelector('ytd-channel-name a');
    const videoTitle = titleElem ? titleElem.textContent.trim() : '';
    const videoChannel = channelElem ? channelElem.textContent.trim() : '';
    chrome.runtime.sendMessage(
      {
        action: 'forumizeVideo',
        videoId,
        videoTitle,
        videoChannel
      },
      (response) => {
        btn.disabled = false;
        btn.textContent = '📋 Forumyzer';
        if (response.error) {
          alert('Forumyzer error: ' + response.error);
        } else {
          // Notify the user or open popup (optional)
          console.log('Forumyzer created forum', response);
        }
      }
    );
  });
  container.appendChild(btn);
}
// Forumyzer content script for TikTok
// Injects a custom button into TikTok video pages and communicates
// with the background service worker to forumize the current video.

console.log('Forumyzer TikTok content script loaded');

// Wait for the document to be ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}

// TikTok is a single-page app, so we need to observe URL changes
let lastUrl = location.href;
new MutationObserver(() => {
  const url = location.href;
  if (url !== lastUrl) {
    lastUrl = url;
    init();
  }
}).observe(document, { subtree: true, childList: true });

function init() {
  const videoId = getVideoId();
  if (!videoId) return;
  addForumyzerButton(videoId);
}

function getVideoId() {
  // Extract video ID from TikTok URL
  // Format: https://www.tiktok.com/@username/video/1234567890
  const match = window.location.pathname.match(/\/video\/(\d+)/);
  return match ? match[1] : null;
}

function addForumyzerButton(videoId) {
  // Remove existing button if present
  const existingBtn = document.getElementById('forumyzer-btn');
  if (existingBtn) {
    existingBtn.remove();
  }

  // Find the action button container
  // TikTok's layout: usually there's a right-side action bar with like, comment, share buttons
  // We'll try multiple selectors as TikTok's DOM structure can vary
  const possibleContainers = [
    'div[data-e2e="video-action-bar"]',
    'div[data-e2e="browse-video-action-bar"]',
    'div.video-card-actions',
    'div[class*="ActionItem"]',
  ];

  let container = null;
  for (const selector of possibleContainers) {
    container = document.querySelector(selector);
    if (container) break;
  }

  // If we can't find the action bar, try to insert it into the video container
  if (!container) {
    // Alternative: Insert as a floating button
    container = document.querySelector('div[data-e2e="video-detail"]') || document.body;
    if (!container) return;

    // Create a floating button
    const floatingContainer = document.createElement('div');
    floatingContainer.id = 'forumyzer-floating-container';
    floatingContainer.style.cssText = `
      position: fixed;
      bottom: 100px;
      right: 20px;
      z-index: 9999;
    `;
    container.appendChild(floatingContainer);
    container = floatingContainer;
  }

  const btn = document.createElement('button');
  btn.id = 'forumyzer-btn';
  btn.textContent = '📋 Forumyze';
  btn.style.cssText = `
    padding: 12px 20px;
    margin: 8px 0;
    background: linear-gradient(135deg, #FF0050 0%, #00F2EA 100%);
    color: white;
    border: none;
    border-radius: 24px;
    cursor: pointer;
    font-size: 14px;
    font-weight: bold;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
    transition: transform 0.2s, box-shadow 0.2s;
    display: block;
    width: 100%;
    max-width: 200px;
  `;

  btn.addEventListener('mouseenter', () => {
    btn.style.transform = 'scale(1.05)';
    btn.style.boxShadow = '0 6px 16px rgba(0, 0, 0, 0.2)';
  });

  btn.addEventListener('mouseleave', () => {
    btn.style.transform = 'scale(1)';
    btn.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.15)';
  });

  btn.addEventListener('click', () => {
    btn.disabled = true;
    btn.textContent = 'Loading...';

    // Extract video metadata
    const titleElem = document.querySelector('h1[data-e2e="video-desc"]') ||
                      document.querySelector('div[data-e2e="video-desc"]') ||
                      document.querySelector('span[data-e2e="video-desc"]');
    const authorElem = document.querySelector('span[data-e2e="video-author-uniqueid"]') ||
                       document.querySelector('a[data-e2e="video-author-link"]');

    const videoTitle = titleElem ? titleElem.textContent.trim() : '';
    const videoChannel = authorElem ? authorElem.textContent.trim().replace('@', '') : '';

    chrome.runtime.sendMessage(
      {
        action: 'forumizeVideo',
        videoId,
        videoTitle,
        videoChannel,
        platform: 'tiktok'
      },
      (response) => {
        btn.disabled = false;
        btn.textContent = '📋 Forumyze';
        if (response && response.error) {
          alert('Forumyzer error: ' + response.error);
        } else if (response) {
          // Notify the user or open popup (optional)
          console.log('Forumyzer created forum', response);
          // Show a success message
          showSuccessMessage();
        }
      }
    );
  });

  container.appendChild(btn);
}

function showSuccessMessage() {
  const message = document.createElement('div');
  message.textContent = '✓ Forum created! Open Forumyzer extension to view.';
  message.style.cssText = `
    position: fixed;
    top: 20px;
    right: 20px;
    background: #00F2EA;
    color: #000;
    padding: 16px 24px;
    border-radius: 12px;
    font-weight: bold;
    z-index: 10000;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
    animation: slideIn 0.3s ease-out;
  `;

  document.body.appendChild(message);

  setTimeout(() => {
    message.style.animation = 'slideOut 0.3s ease-in';
    setTimeout(() => message.remove(), 300);
  }, 3000);
}

// Add CSS animations
const style = document.createElement('style');
style.textContent = `
  @keyframes slideIn {
    from {
      transform: translateX(400px);
      opacity: 0;
    }
    to {
      transform: translateX(0);
      opacity: 1;
    }
  }

  @keyframes slideOut {
    from {
      transform: translateX(0);
      opacity: 1;
    }
    to {
      transform: translateX(400px);
      opacity: 0;
    }
  }
`;
document.head.appendChild(style);

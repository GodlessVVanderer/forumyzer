import React, { useEffect, useState } from 'react';
import ReactDOM from 'react-dom/client';
import ForumLibrary from './components/ForumLibrary';
import SettingsPanel from './components/SettingsPanel';
import ErrorBoundary from './components/ErrorBoundary';
import LandingPage from './components/LandingPage';
import { sanitizeText, extractVideoId, sanitizeErrorMessage, RateLimiter } from './utils/security';
import './styles.css';

const rateLimiter = new RateLimiter();

interface ForumyzedComment {
  id: string;
  author: string;
  text: string;
  category: string;
  topic?: string;
  replies?: ForumyzedComment[];
  upvotes?: number;
  downvotes?: number;
}

function WebApp() {
  const [tab, setTab] = useState<'home' | 'forumyze' | 'library' | 'settings'>('home');
  const [videoUrl, setVideoUrl] = useState('');
  const [currentForumyzed, setCurrentForumyzed] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showBlinds, setShowBlinds] = useState(false);
  const [activeCategory, setActiveCategory] = useState('all');
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [loadingAudio, setLoadingAudio] = useState(false);
  const [forumId, setForumId] = useState<string | null>(null);

  const handleForumyze = async () => {
    if (!rateLimiter.isAllowed('forumyze', 5, 60000)) {
      setError('Too many requests. Wait a minute.');
      return;
    }

    const videoId = extractVideoId(videoUrl);
    if (!videoId) {
      setError('Invalid YouTube URL');
      return;
    }

    setError(null);
    setShowBlinds(true);

    setTimeout(async () => {
      setLoading(true);
      try {
        const res = await fetch(`${import.meta.env.VITE_BACKEND_URL || 'http://localhost:3000'}/api/forumyze`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ videoId })
        });

        if (!res.ok) throw new Error('Failed to forumyze video');
        const forumyzedData = await res.json();

        const oEmbed = await fetch(`https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${videoId}&format=json`);
        if (oEmbed.ok) {
          const info = await oEmbed.json();
          forumyzedData.videoTitle = info.title;
          forumyzedData.videoChannel = info.author_name;
        }

        forumyzedData.videoId = videoId;
        setCurrentForumyzed(forumyzedData);

        const saveRes = await fetch(`${import.meta.env.VITE_BACKEND_URL || 'http://localhost:3000'}/api/forum/save`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            videoId,
            videoTitle: forumyzedData.videoTitle,
            videoChannel: forumyzedData.videoChannel,
            forumData: forumyzedData
          })
        });

        if (!saveRes.ok) throw new Error('Failed to save');
        const saved = await saveRes.json();
        setForumId(saved.id);
      } catch (err: any) {
        setError(sanitizeErrorMessage(err));
      } finally {
        setLoading(false);
        setShowBlinds(false);
      }
    }, 1500);
  };

  const handleSelectForumyzed = (forumyzedData: any) => {
    setCurrentForumyzed(forumyzedData);
    setForumId(forumyzedData.id);
    setTab('forumyze');
  };

  const ForumyzedCommentItem = ({ comment, depth = 0 }: { comment: ForumyzedComment; depth?: number }) => {
    const safeAuthor = sanitizeText(comment.author);
    const safeText = sanitizeText(comment.text);
    const safeCategory = sanitizeText(comment.category);

    return (
      <div className={`comment-wrapper ${comment.category === 'toxic' ? 'timeout-comment' : ''}`} style={{ marginLeft: depth * 32 }}>
        <div className="comment-author">
          <div className="avatar">{safeAuthor[0] || '?'}</div>
          <span className="comment-author-name">{safeAuthor}</span>
          <span className={`category-badge ${comment.category}`}>{safeCategory}</span>
          {comment.topic && <span className="topic-tag">💬 {sanitizeText(comment.topic)}</span>}
        </div>
        <div className="comment-text">{safeText}</div>
        {comment.replies?.map(reply => (
          <ForumyzedCommentItem key={reply.id} comment={reply} depth={depth + 1} />
        ))}
      </div>
    );
  };

  // Filter threads by category
  const getFilteredThreads = () => {
    if (!currentForumyzed?.threads) return [];

    if (activeCategory === 'all') {
      // Show topics grouped
      return currentForumyzed.threads.filter((t: any) => t.category === 'genuine');
    }
    
    return currentForumyzed.threads.filter((t: any) => t.category === activeCategory);
  };

  const getCountByCategory = (category: string) => {
    if (!currentForumyzed?.threads) return 0;
    return currentForumyzed.threads.filter((t: any) => t.category === category).length;
  };

  const filteredThreads = getFilteredThreads();

  // Group by topic for ALL tab
  const topicGroups = activeCategory === 'all' && currentForumyzed?.topics
    ? currentForumyzed.topics.map((topic: any) => ({
        title: topic.title,
        description: topic.description,
        sentiment: topic.sentiment,
        comments: currentForumyzed.threads.filter((t: any) => t.topic === topic.title)
      }))
    : [];

  return (
    <div className="app-container">
      {showBlinds && (
        <div className="blinds-overlay">
          <div className="blinds-container">
            {[...Array(8)].map((_, i) => (
              <div key={i} className="blind" style={{ animationDelay: `${i * 0.08}s` }} />
            ))}
          </div>
          <div className="blinds-text">FORUMYZER</div>
        </div>
      )}

      <div className="app-header">
        <div className="logo">
          <h1>FORUMYZER</h1>
        </div>
      </div>

      <div className="app-main">
        {tab === 'home' && <LandingPage onGetStarted={() => setTab('forumyze')} />}

        {tab === 'forumyze' && (
          <>
            <div className="input-section">
              <div className="url-input-wrapper">
                <span className="material-icons">link</span>
                <input
                  type="text"
                  placeholder="Paste YouTube URL here..."
                  value={videoUrl}
                  onChange={(e) => setVideoUrl(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleForumyze()}
                />
              </div>
              <button className="forumyze-button" onClick={handleForumyze} disabled={loading || !videoUrl}>
                {loading ? 'PROCESSING...' : 'FORUMYZE?'}
              </button>
            </div>

            {error && <div className="error-message">{error}</div>}

            {currentForumyzed && (
              <div className="content-area">
                <div className="video-container">
                  <iframe
                    src={`https://www.youtube.com/embed/${currentForumyzed.videoId}`}
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                  />
                </div>

                <div className="forum-container">
                  <div className="forum-header">
                    <div>
                      <h2 className="forum-title">{currentForumyzed.videoTitle || 'Forumyzed Video'}</h2>
                      <p style={{ color: 'var(--text-secondary)', fontSize: '13px', margin: 0 }}>
                        {currentForumyzed.videoChannel || ''}
                      </p>
                    </div>
                  </div>

                  {currentForumyzed.stats && (
                    <div className="forum-stats" style={{ padding: '16px', borderBottom: '1px solid var(--border-default)' }}>
                      <span>📊 {currentForumyzed.stats.totalComments} total</span>
                      <span>✅ {currentForumyzed.stats.genuinePercentage}% genuine</span>
                      <span>🗑️ {currentForumyzed.stats.spamPercentage}% spam</span>
                      <span>💬 {currentForumyzed.stats.topicsFound} topics</span>
                    </div>
                  )}

                  <div className="forum-tabs">
                    <button onClick={() => setActiveCategory('all')} className={`tab ${activeCategory === 'all' ? 'active' : ''}`}>
                      ALL
                    </button>
                    <button onClick={() => setActiveCategory('genuine')} className={`tab ${activeCategory === 'genuine' ? 'active' : ''}`}>
                      GENUINE ({getCountByCategory('genuine')})
                    </button>
                    <button onClick={() => setActiveCategory('spam')} className={`tab ${activeCategory === 'spam' ? 'active' : ''}`}>
                      SPAM ({getCountByCategory('spam')})
                    </button>
                    <button onClick={() => setActiveCategory('bot')} className={`tab ${activeCategory === 'bot' ? 'active' : ''}`}>
                      BOTS ({getCountByCategory('bot')})
                    </button>
                    <button onClick={() => setActiveCategory('toxic')} className={`tab timeout-tab ${activeCategory === 'toxic' ? 'active' : ''}`}>
                      ⏱️ TIMEOUT ({getCountByCategory('toxic')})
                    </button>
                  </div>

                  <div className="forum-posts">
                    {activeCategory === 'all' && topicGroups.length > 0 ? (
                      topicGroups.map((topic: any, idx: number) => (
                        <div key={idx} className="topic-thread">
                          <div className="topic-header">
                            <h3>{sanitizeText(topic.title)}</h3>
                            <p>{sanitizeText(topic.description)}</p>
                            <span>{topic.sentiment} · {topic.comments.length} comments</span>
                          </div>
                          {topic.comments.map((comment: any) => (
                            <ForumyzedCommentItem key={comment.id} comment={comment} />
                          ))}
                        </div>
                      ))
                    ) : filteredThreads.length > 0 ? (
                      filteredThreads.map((comment: any) => (
                        <ForumyzedCommentItem key={comment.id} comment={comment} />
                      ))
                    ) : (
                      <div className="empty-state">
                        <span className="material-icons">forum</span>
                        <h3>No {activeCategory} comments</h3>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
          </>
        )}

        {tab === 'library' && <ForumLibrary onSelectForumyzed={handleSelectForumyzed} />}
        {tab === 'settings' && <SettingsPanel />}
      </div>
    </div>
  );
}

const root = ReactDOM.createRoot(document.getElementById('root') as HTMLElement);
root.render(
  <React.StrictMode>
    <ErrorBoundary>
      <WebApp />
    </ErrorBoundary>
  </React.StrictMode>
);

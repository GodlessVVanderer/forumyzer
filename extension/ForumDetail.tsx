import React, { useState } from 'react';
import ExportMenu from './ExportMenu';
import UpgradePrompt from './UpgradePrompt';
import SettingsPanel from './SettingsPanel';

interface Comment {
  id: string;
  author: string;
  text: string;
  category: string;
  confidence?: number;
  shouldRemove?: boolean;
  classificationReason?: string;
  publishedAt?: string;
  likeCount?: number;
  replies?: Comment[];
}

interface ForumData {
  id?: string;
  videoId: string;
  videoTitle?: string;
  videoChannel?: string;
  threads: Comment[];
  stats?: any;
}

interface ForumDetailProps {
  forum: ForumData;
  onBack?: () => void;
  embedded?: boolean;
}

// Helper to map categories to colours (updated with new AI categories)
const categoryColors: Record<string, string> = {
  genuine: '#4CAF50',
  question: '#2196F3',
  spam: '#999',
  bot: '#FF9800',
  toxic: '#F44336',
  feedback: '#9C27B0',
  discussion: '#00BCD4'
};

// Category emoji mapping
const categoryEmojis: Record<string, string> = {
  genuine: '💚',
  question: '❓',
  spam: '🚫',
  bot: '🤖',
  toxic: '☠️',
  feedback: '💬',
  discussion: '🗣️'
};

export default function ForumDetail({ forum, onBack, embedded }: ForumDetailProps) {
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [audioLoading, setAudioLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const getCategoryColor = (category: string) => {
    return categoryColors[category] || '#666';
  };
  const renderThread = (thread: Comment, depth = 0) => {
    const paddingLeft = depth * 16;
    const emoji = categoryEmojis[thread.category] || '💬';

    return (
      <div
        key={thread.id}
        style={{
          marginBottom: 12,
          paddingLeft: paddingLeft + 12,
          borderLeft: `3px solid ${getCategoryColor(thread.category)}`,
        }}
      >
        <div style={{ marginBottom: 4, display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: '6px' }}>
          <strong style={{ fontSize: 13 }}>{thread.author}</strong>
          <span
            style={{
              fontSize: 11,
              color: getCategoryColor(thread.category),
              fontWeight: 'bold',
              backgroundColor: getCategoryColor(thread.category) + '20',
              padding: '2px 6px',
              borderRadius: '4px'
            }}
          >
            {emoji} {thread.category}
          </span>
          {thread.confidence && (
            <span style={{ fontSize: 10, color: '#999' }}>
              {Math.round(thread.confidence * 100)}% confidence
            </span>
          )}
          {thread.likeCount !== undefined && thread.likeCount > 0 && (
            <span style={{ fontSize: 11, color: '#999' }}>
              👍 {thread.likeCount}
            </span>
          )}
        </div>
        <p style={{ margin: '4px 0', fontSize: 13, lineHeight: 1.4 }}>
          {thread.text}
        </p>
        {thread.publishedAt && (
          <div style={{ fontSize: 10, color: '#999', marginTop: '4px' }}>
            {new Date(thread.publishedAt).toLocaleString()}
          </div>
        )}
        {thread.replies && thread.replies.map(r => renderThread(r, depth + 1))}
      </div>
    );
  };

  const handleGenerateAudio = () => {
    if (!forum.id) return;
    setAudioLoading(true);
    setError(null);
    chrome.runtime.sendMessage({ action: 'getAudioSummary', forumId: forum.id }, (res) => {
      setAudioLoading(false);
      if (res?.error) {
        setError(res.error);
        return;
      }
      setAudioUrl(res.audioUrl);
    });
  };

  return (
    <div style={{ padding: 12 }}>
      {!embedded && (
        <button
          onClick={onBack}
          style={{ marginBottom: 12, background: 'none', border: 'none', color: '#2196F3', cursor: 'pointer' }}
        >
          ← Back to Library
        </button>
      )}
      <h2 style={{ margin: '0 0 8px 0', color: '#FF0033' }}>{forum.videoTitle || 'Forum'}</h2>
      {forum.videoChannel && (
        <p style={{ margin: '0 0 12px 0', fontSize: 12, color: '#666' }}>{forum.videoChannel}</p>
      )}
      {forum.stats && (
        <div style={{
          fontSize: 12,
          marginBottom: 12,
          padding: '10px',
          backgroundColor: '#f8f8f8',
          borderRadius: '6px'
        }}>
          <div style={{ fontWeight: 'bold', marginBottom: '6px', color: '#333' }}>
            📊 Statistics: {forum.stats.totalComments} total comments
            {forum.stats.removedComments > 0 && (
              <span style={{ color: '#F44336', marginLeft: '8px' }}>
                (🚫 {forum.stats.removedComments} spam removed)
              </span>
            )}
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: '6px', fontSize: 11 }}>
            {forum.stats.genuinePercentage > 0 && (
              <div style={{ color: categoryColors.genuine }}>
                💚 {forum.stats.genuinePercentage}% genuine
              </div>
            )}
            {forum.stats.questionPercentage > 0 && (
              <div style={{ color: categoryColors.question }}>
                ❓ {forum.stats.questionPercentage}% questions
              </div>
            )}
            {forum.stats.discussionPercentage > 0 && (
              <div style={{ color: categoryColors.discussion }}>
                🗣️ {forum.stats.discussionPercentage}% discussion
              </div>
            )}
            {forum.stats.feedbackPercentage > 0 && (
              <div style={{ color: categoryColors.feedback }}>
                💬 {forum.stats.feedbackPercentage}% feedback
              </div>
            )}
            {forum.stats.spamPercentage > 0 && (
              <div style={{ color: categoryColors.spam }}>
                🚫 {forum.stats.spamPercentage}% spam
              </div>
            )}
            {forum.stats.botPercentage > 0 && (
              <div style={{ color: categoryColors.bot }}>
                🤖 {forum.stats.botPercentage}% bots
              </div>
            )}
            {forum.stats.toxicPercentage > 0 && (
              <div style={{ color: categoryColors.toxic }}>
                ☠️ {forum.stats.toxicPercentage}% toxic
              </div>
            )}
          </div>
        </div>
      )}
      {/* Export & Share menu */}
      {forum.id && forum.threads && (
        <ExportMenu forumId={forum.id} threads={forum.threads as any} />
      )}
      {/* Audio summary */}
      {forum.id && (
        <div style={{ marginBottom: 12 }}>
          <button
            onClick={handleGenerateAudio}
            disabled={audioLoading}
            style={{
              background: '#FF0033',
              color: 'white',
              border: 'none',
              padding: '6px 12px',
              borderRadius: 4,
              cursor: 'pointer',
              fontSize: 13
            }}
          >
            {audioLoading ? 'Generating Audio...' : '🎙️ Generate Podcast'}
          </button>
          {error && <p style={{ color: '#F44336', fontSize: 12 }}>{error}</p>}
          {audioUrl && (
            <audio controls style={{ width: '100%', marginTop: 8 }}>
              <source src={audioUrl} type="audio/mpeg" />
              Your browser does not support the audio element.
            </audio>
          )}
        </div>
      )}
      {/* Threads */}
      {forum.threads && forum.threads.length > 0 ? (
        <div>
          {forum.threads.map(thread => renderThread(thread))}
        </div>
      ) : (
        <p style={{ color: '#999' }}>No discussion threads available.</p>
      )}
    </div>
  );
}
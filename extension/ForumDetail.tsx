import React, { useState } from 'react';
import ExportMenu from './ExportMenu';
import UpgradePrompt from './UpgradePrompt';
import SettingsPanel from './SettingsPanel';

interface Comment {
  id: string;
  author: string;
  text: string;
  category: string;
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

// Helper to map categories to colours
const categoryColors: Record<string, string> = {
  genuine: '#4CAF50',
  question: '#2196F3',
  spam: '#999',
  bot: '#FF9800',
  toxic: '#F44336'
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
    return (
      <div
        key={thread.id}
        style={{
          marginBottom: 12,
          paddingLeft: paddingLeft + 12,
          borderLeft: `3px solid ${getCategoryColor(thread.category)}`,
        }}
      >
        <div style={{ marginBottom: 4 }}>
          <strong style={{ fontSize: 13 }}>{thread.author}</strong>
          <span
            style={{
              marginLeft: 8,
              fontSize: 11,
              color: getCategoryColor(thread.category),
              fontWeight: 'bold'
            }}
          >
            {thread.category}
          </span>
        </div>
        <p style={{ margin: '4px 0', fontSize: 13, lineHeight: 1.4 }}>
          {thread.text}
        </p>
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
        <div style={{ fontSize: 12, color: '#999', marginBottom: 12 }}>
          {forum.stats.totalComments} comments –
          {` ${forum.stats.genuinePercentage || 0}% genuine, ${forum.stats.questionPercentage || 0}% questions, ${forum.stats.spamPercentage || 0}% spam, ${forum.stats.botPercentage || 0}% bots, ${forum.stats.toxicPercentage || 0}% toxic`}
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
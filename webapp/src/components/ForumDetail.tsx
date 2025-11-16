import React, { useState } from 'react';
import ExportMenu from './ExportMenu';

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

interface Props {
  forum: ForumData;
}

const categoryColors: Record<string, string> = {
  genuine: '#4CAF50',
  question: '#2196F3',
  spam: '#999',
  bot: '#FF9800',
  toxic: '#F44336'
};

export default function ForumDetail({ forum }: Props) {
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [loadingAudio, setLoadingAudio] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const getColor = (cat: string) => categoryColors[cat] || '#666';
  const renderThread = (thread: Comment, depth = 0) => {
    return (
      <div
        key={thread.id}
        style={{
          marginBottom: 12,
          paddingLeft: depth * 16 + 12,
          borderLeft: `3px solid ${getColor(thread.category)}`
        }}
      >
        <div style={{ marginBottom: 4 }}>
          <strong style={{ fontSize: 14 }}>{thread.author}</strong>
          <span style={{ marginLeft: 8, fontSize: 11, color: getColor(thread.category), fontWeight: 'bold' }}>{thread.category}</span>
        </div>
        <p style={{ margin: '4px 0', fontSize: 14 }}>{thread.text}</p>
        {thread.replies && thread.replies.map(r => renderThread(r, depth + 1))}
      </div>
    );
  };

  const handleAudio = async () => {
    if (!forum.id) return;
    setLoadingAudio(true);
    setError(null);
    try {
      const res = await fetch(`${import.meta.env.VITE_BACKEND_URL}/api/forum/${forum.id}/audio`);
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || res.statusText);
      }
      const data = await res.json();
      setAudioUrl(data.audioUrl);
    } catch (err: any) {
      setError(err.message || 'Failed to generate audio');
    } finally {
      setLoadingAudio(false);
    }
  };

  return (
    <div>
      <h2 style={{ margin: '0 0 8px 0', color: '#FF0033' }}>{forum.videoTitle || 'Forum'}</h2>
      {forum.videoChannel && <p style={{ margin: '0 0 12px 0', color: '#666' }}>{forum.videoChannel}</p>}
      {forum.stats && (
        <p style={{ fontSize: 12, color: '#999' }}>
          {forum.stats.totalComments} comments – {forum.stats.genuinePercentage}% genuine, {forum.stats.questionPercentage}% questions, {forum.stats.spamPercentage}% spam, {forum.stats.botPercentage}% bots, {forum.stats.toxicPercentage}% toxic
        </p>
      )}
      {/* Export */}
      {forum.id && forum.threads && <ExportMenu forumId={forum.id} threads={forum.threads as any} />}
      {/* Audio */}
      {forum.id && (
        <div style={{ marginBottom: 12 }}>
          <button
            onClick={handleAudio}
            disabled={loadingAudio}
            style={{ background: '#FF0033', color: 'white', border: 'none', padding: '6px 12px', borderRadius: 4, cursor: 'pointer' }}
          >
            {loadingAudio ? 'Generating audio…' : '🎙️ Generate Podcast'}
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
        <div>{forum.threads.map(t => renderThread(t))}</div>
      ) : (
        <p>No threads.</p>
      )}
    </div>
  );
}
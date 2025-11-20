import React, { useEffect, useState } from 'react';
import { sanitizeText, sanitizeErrorMessage } from '../utils/security';

interface ForumyzedRecord {
  id: string;
  videoId: string;
  videoTitle: string;
  videoChannel: string;
  forumData: any;
  forumyzedAt: string;
  createdAt: string;
}

interface Props {
  onSelectForumyzed: (forumyzedData: any) => void;
}

/**
 * ForumLibrary - Display and search through user's saved forumyzed forums
 */
export default function ForumLibrary({ onSelectForumyzed }: Props) {
  const [forumyzedForums, setForumyzedForums] = useState<ForumyzedRecord[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadForumyzedLibrary() {
      try {
        setLoading(true);
        const res = await fetch(
          `${import.meta.env.VITE_BACKEND_URL || 'http://localhost:3000'}/api/forum/library`
        );
        if (!res.ok) {
          const data = await res.json();
          throw new Error(data.error || res.statusText);
        }
        const data = await res.json();
        setForumyzedForums(data);
      } catch (err: any) {
        setError(sanitizeErrorMessage(err));
        console.error('Forumyzed library load error:', err);
      } finally {
        setLoading(false);
      }
    }
    loadForumyzedLibrary();
  }, []);

  // Sanitize search input to prevent XSS
  const safeSearch = sanitizeText(search);

  // Filter forumyzed forums by title
  const filtered = forumyzedForums.filter(f =>
    f.videoTitle?.toLowerCase().includes(safeSearch.toLowerCase())
  );

  return (
    <div>
      <h2>📚 Forumyzed Forums Library</h2>
      <input
        type="text"
        placeholder="Search forumyzed forums..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        style={{ width: '100%', padding: 8, marginBottom: 12, fontSize: 16 }}
      />
      {error && <p style={{ color: '#F44336' }}>Error: {error}</p>}
      {loading && <p>Loading your forumyzed forums...</p>}
      {!loading && filtered.length === 0 && !error && (
        <p>No forumyzed forums found. Create one by forumyzing a video!</p>
      )}
      <div style={{ display: 'grid', gap: 12 }}>
        {filtered.map(forumyzedRecord => (
          <div
            key={forumyzedRecord.id}
            onClick={() =>
              onSelectForumyzed(
                forumyzedRecord.forumData
                  ? {
                    ...forumyzedRecord.forumData,
                    videoTitle: forumyzedRecord.videoTitle,
                    videoChannel: forumyzedRecord.videoChannel,
                    id: forumyzedRecord.id
                  }
                  : forumyzedRecord
              )
            }
            style={{
              border: '1px solid #eee',
              borderRadius: 8,
              padding: 12,
              cursor: 'pointer',
              backgroundColor: '#fff',
              boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
              transition: 'all 0.2s ease',
              ':hover': {
                boxShadow: '0 4px 8px rgba(0,0,0,0.1)'
              }
            }}
          >
            <strong>{sanitizeText(forumyzedRecord.videoTitle || forumyzedRecord.videoId)}</strong>
            <p style={{ fontSize: 14, color: '#666', margin: '4px 0' }}>
              {sanitizeText(forumyzedRecord.videoChannel || 'Unknown Channel')}
            </p>
            <p style={{ fontSize: 12, color: '#999' }}>
              Forumyzed: {new Date(forumyzedRecord.forumyzedAt).toLocaleDateString()}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}

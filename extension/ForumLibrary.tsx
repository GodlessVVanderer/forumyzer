import React, { useEffect, useState } from 'react';
import ForumDetail from './ForumDetail';

interface ForumRecord {
  id: string;
  videoId: string;
  videoTitle: string;
  videoChannel: string;
  forumData: any;
  createdAt: string;
  updatedAt?: string;
  stats?: any;
}

interface LibraryProps {
  onSelect?: () => void;
}

export default function ForumLibrary({ onSelect }: LibraryProps) {
  const [forums, setForums] = useState<ForumRecord[]>([]);
  const [selected, setSelected] = useState<ForumRecord | null>(null);
  const [search, setSearch] = useState('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Load saved forums from backend
    async function loadLibrary() {
      try {
        // Get OAuth token via background script
        const token = await new Promise<string>((resolve, reject) => {
          chrome.runtime.sendMessage({ action: 'getAuthToken' }, (res) => {
            if (res?.error) reject(res.error);
            else resolve(res.token);
          });
        });
        const backendUrl = process.env.VITE_BACKEND_URL || 'http://localhost:3000';
        const res = await fetch(`${backendUrl}/api/forum/library`, {
          headers: {
            Authorization: `Bearer ${token}`
          }
        });
        if (!res.ok) {
          const data = await res.json();
          throw new Error(data.error || res.statusText);
        }
        const data = await res.json();
        setForums(data);
      } catch (err: any) {
        console.error(err);
        setError(err.message || 'Failed to load library');
      }
    }
    loadLibrary();
  }, []);

  const filtered = forums.filter(f =>
    f.videoTitle?.toLowerCase().includes(search.toLowerCase())
  );

  if (selected) {
    return (
      <ForumDetail
        forum={selected.forumData ? { ...selected.forumData, videoTitle: selected.videoTitle, videoChannel: selected.videoChannel, id: selected.id } : selected}
        onBack={() => setSelected(null)}
      />
    );
  }

  return (
    <div style={{ padding: '12px' }}>
      <h2 style={{ margin: '0 0 12px 0', color: '#FF0033' }}>📚 Your Forums</h2>
      <input
        type="text"
        placeholder="Search your forums..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        style={{ width: '100%', padding: '8px', marginBottom: '12px', fontSize: '14px' }}
      />
      {error && <p style={{ color: '#F44336' }}>{error}</p>}
      {filtered.length === 0 && !error && (
        <p style={{ color: '#999' }}>No forums found.</p>
      )}
      <div style={{ display: 'grid', gap: '8px' }}>
        {filtered.map(forum => (
          <div
            key={forum.id}
            onClick={() => {
              setSelected(forum);
              if (onSelect) onSelect();
            }}
            style={{
              border: '1px solid #eee',
              borderRadius: '8px',
              padding: '10px',
              cursor: 'pointer',
              backgroundColor: '#fff',
              boxShadow: '0 1px 2px rgba(0,0,0,0.05)'
            }}
          >
            <strong>{forum.videoTitle || forum.videoId}</strong>
            <p style={{ fontSize: '12px', color: '#666', margin: '4px 0' }}>
              {forum.videoChannel || 'Unknown channel'}
            </p>
            <div style={{ fontSize: '12px', color: '#999' }}>
              {new Date(forum.createdAt).toLocaleDateString()} • {forum.forumData?.stats?.totalComments || 0} comments
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
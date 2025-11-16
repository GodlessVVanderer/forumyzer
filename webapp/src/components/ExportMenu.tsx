import React, { useState } from 'react';
import { exportForumAsJSON } from './exportForum';

interface Props {
  forumId: string;
  threads: any[];
}

export default function ExportMenu({ forumId, threads }: Props) {
  const [shareUrl, setShareUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const createShareLink = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${import.meta.env.VITE_BACKEND_URL}/api/forum/${forumId}/share`, { method: 'POST' });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || res.statusText);
      }
      const data = await res.json();
      setShareUrl(`${import.meta.env.VITE_BACKEND_URL}/api/forum/share/${data.shareToken}`);
    } catch (err: any) {
      setError(err.message || 'Failed to create share link');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ border: '1px solid #ddd', borderRadius: 8, padding: 12, marginBottom: 12, backgroundColor: '#fafafa' }}>
      <h3 style={{ margin: '0 0 8px 0' }}>📤 Export & Share</h3>
      <button onClick={() => exportForumAsJSON(forumId, threads)} style={buttonStyle}>📋 Export JSON</button>
      <button onClick={createShareLink} disabled={loading} style={buttonStyle}>
        {loading ? 'Creating link…' : '🔗 Create Share Link'}
      </button>
      {error && <p style={{ color: '#F44336', fontSize: 14 }}>{error}</p>}
      {shareUrl && (
        <div style={{ marginTop: 8, backgroundColor: '#f0f0f0', padding: 8, borderRadius: 4 }}>
          <input type="text" value={shareUrl} readOnly style={{ width: '100%', padding: 4, fontSize: 14, marginBottom: 4 }} />
          <button onClick={() => navigator.clipboard.writeText(shareUrl)} style={buttonStyle}>Copy Link</button>
        </div>
      )}
    </div>
  );
}

const buttonStyle: React.CSSProperties = {
  display: 'block',
  width: '100%',
  padding: '8px',
  margin: '4px 0',
  background: '#FF0033',
  color: 'white',
  border: 'none',
  borderRadius: 4,
  cursor: 'pointer',
  fontSize: 14
};
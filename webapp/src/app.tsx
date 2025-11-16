import React, { useEffect, useState } from 'react';
import ReactDOM from 'react-dom/client';
import ForumLibrary from './components/ForumLibrary';
import ForumDetail from './components/ForumDetail';
import SettingsPanel from './components/SettingsPanel';

function WebApp() {
  const [tab, setTab] = useState<'current' | 'library' | 'settings'>('library');
  const [currentForum, setCurrentForum] = useState<any>(null);

  useEffect(() => {
    // Optionally load last forum from localStorage
    const stored = localStorage.getItem('currentForum');
    if (stored) {
      setCurrentForum(JSON.parse(stored));
    }
  }, []);

  const handleSelectForum = (forum: any) => {
    setCurrentForum(forum);
    localStorage.setItem('currentForum', JSON.stringify(forum));
    setTab('current');
  };

  return (
    <div
      style={{
        maxWidth: 800,
        margin: '0 auto',
        padding: 24,
        fontFamily: 'system-ui, sans-serif',
        fontSize: 16
      }}
    >
      <h1 style={{ color: '#FF0033' }}>Forumyzer</h1>
      <div style={{ display: 'flex', marginBottom: 16 }}>
        <button onClick={() => setTab('library')} style={tab === 'library' ? tabActiveStyle : tabStyle}>Library</button>
        <button onClick={() => setTab('current')} style={tab === 'current' ? tabActiveStyle : tabStyle}>Current</button>
        <button onClick={() => setTab('settings')} style={tab === 'settings' ? tabActiveStyle : tabStyle}>Settings</button>
      </div>
      {tab === 'library' && <ForumLibrary onSelect={handleSelectForum} />}
      {tab === 'current' && currentForum && <ForumDetail forum={currentForum} />}
      {tab === 'current' && !currentForum && (
        <p>Select a forum from the library to view details.</p>
      )}
      {tab === 'settings' && <SettingsPanel />}
    </div>
  );
}

const tabStyle: React.CSSProperties = {
  marginRight: 12,
  padding: '8px 16px',
  background: '#f0f0f0',
  border: '1px solid #ddd',
  borderRadius: 4,
  cursor: 'pointer',
  fontSize: 16
};
const tabActiveStyle: React.CSSProperties = {
  ...tabStyle,
  borderBottom: '3px solid #FF0033',
  color: '#FF0033'
};

const root = ReactDOM.createRoot(document.getElementById('root') as HTMLElement);
root.render(
  <React.StrictMode>
    <WebApp />
  </React.StrictMode>
);
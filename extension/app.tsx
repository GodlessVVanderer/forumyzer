import React, { useEffect, useState } from 'react';
import ReactDOM from 'react-dom/client';
import ForumLibrary from './ForumLibrary';
import ForumDetail from './ForumDetail';
import SettingsPanel from './SettingsPanel';

// Main popup component. Renders current forum, library and settings tabs.
function PopupApp() {
  const [tab, setTab] = useState<'current' | 'library' | 'settings'>('current');
  const [currentForum, setCurrentForum] = useState<any>(null);

  // Load the most recent forum from chrome.storage on mount
  useEffect(() => {
    chrome.storage.local.get('forumData', (result) => {
      if (result.forumData) {
        setCurrentForum(result.forumData);
      }
    });
  }, []);

  const renderCurrent = () => {
    if (!currentForum) {
      return (
        <div style={{ padding: '12px' }}>
          <p style={{ fontSize: '14px', color: '#666' }}>
            Click the Forumyzer button on a YouTube video to generate a forum.
          </p>
        </div>
      );
    }
    return (
      <ForumDetail
        forum={currentForum}
        onBack={() => setTab('library')}
        embedded
      />
    );
  };

  return (
    <div
      style={{
        width: 500,
        maxHeight: 600,
        fontFamily: 'system-ui, sans-serif',
        fontSize: 14,
      }}
    >
      {/* Tabs */}
      <div
        style={{
          display: 'flex',
          borderBottom: '1px solid #eee',
          backgroundColor: '#f8f8f8',
        }}
      >
        <button
          onClick={() => setTab('current')}
          style={tab === 'current' ? tabActiveStyle : tabStyle}
        >
          Current
        </button>
        <button
          onClick={() => setTab('library')}
          style={tab === 'library' ? tabActiveStyle : tabStyle}
        >
          Library
        </button>
        <button
          onClick={() => setTab('settings')}
          style={tab === 'settings' ? tabActiveStyle : tabStyle}
        >
          Settings
        </button>
      </div>
      {/* Content */}
      <div style={{ overflowY: 'auto', maxHeight: 550 }}>
        {tab === 'current' && renderCurrent()}
        {tab === 'library' && <ForumLibrary onSelect={() => setTab('current')} />}
        {tab === 'settings' && <SettingsPanel />}
      </div>
    </div>
  );
}

const tabStyle: React.CSSProperties = {
  flex: 1,
  padding: '10px 0',
  border: 'none',
  background: 'none',
  cursor: 'pointer',
  fontWeight: 500,
  color: '#555',
};

const tabActiveStyle: React.CSSProperties = {
  ...tabStyle,
  borderBottom: '3px solid #FF0033',
  color: '#FF0033',
};

const root = ReactDOM.createRoot(document.getElementById('root') as HTMLElement);
root.render(
  <React.StrictMode>
    <PopupApp />
  </React.StrictMode>
);

export default PopupApp;
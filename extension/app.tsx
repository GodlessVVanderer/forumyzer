import React, { useEffect, useState } from 'react';
import ReactDOM from 'react-dom/client';
import ForumLibrary from './ForumLibrary';
import ForumDetail from './ForumDetail';
import SettingsPanel from './SettingsPanel';

// Main popup component. Renders current forum, library, live boards and settings tabs.
function PopupApp() {
  const [tab, setTab] = useState<'current' | 'live' | 'library' | 'settings'>('current');
  const [currentForum, setCurrentForum] = useState<any>(null);
  const [liveBoards, setLiveBoards] = useState<any>({});

  // Load the most recent forum from chrome.storage on mount
  useEffect(() => {
    chrome.storage.local.get(['forumData', 'liveBoards'], (result) => {
      if (result.forumData) {
        setCurrentForum(result.forumData);
      }
      if (result.liveBoards) {
        setLiveBoards(result.liveBoards);
      }
    });

    // Listen for live board updates
    const handleStorageChange = (changes: any, area: string) => {
      if (area === 'local' && changes.liveBoards) {
        setLiveBoards(changes.liveBoards.newValue || {});
      }
    };
    chrome.storage.onChanged.addListener(handleStorageChange);

    return () => {
      chrome.storage.onChanged.removeListener(handleStorageChange);
    };
  }, []);

  const renderCurrent = () => {
    if (!currentForum) {
      return (
        <div style={{ padding: '12px' }}>
          <p style={{ fontSize: '14px', color: '#666' }}>
            Click the <strong>📋 Forumyzer</strong> button on a YouTube video to generate a forum.
          </p>
          <p style={{ fontSize: '14px', color: '#666', marginTop: '8px' }}>
            For live streams, click the <strong style={{ color: '#CC0000' }}>🔴 Live Board</strong> button for real-time updates!
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

  const renderLiveBoards = () => {
    const boards = Object.values(liveBoards);
    if (boards.length === 0) {
      return (
        <div style={{ padding: '12px' }}>
          <h2 style={{ margin: '0 0 12px 0', color: '#CC0000' }}>🔴 Live Boards</h2>
          <p style={{ fontSize: '14px', color: '#666' }}>
            No active live boards. Click the <strong style={{ color: '#CC0000' }}>🔴 Live Board</strong> button on a live stream to start!
          </p>
        </div>
      );
    }
    return (
      <div style={{ padding: '12px' }}>
        <h2 style={{ margin: '0 0 12px 0', color: '#CC0000' }}>🔴 Live Boards</h2>
        <div style={{ display: 'grid', gap: '12px' }}>
          {boards.map((board: any, idx: number) => (
            <div
              key={idx}
              style={{
                border: '2px solid #CC0000',
                borderRadius: '8px',
                padding: '12px',
                backgroundColor: '#FFF5F5'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', marginBottom: '8px' }}>
                <span style={{ fontSize: '20px', marginRight: '8px' }}>🔴</span>
                <strong style={{ fontSize: '14px' }}>{board.videoTitle}</strong>
              </div>
              <p style={{ fontSize: '12px', color: '#666', margin: '4px 0' }}>
                {board.channelTitle}
              </p>
              <div style={{ fontSize: '12px', color: '#999', marginTop: '8px' }}>
                {board.stats?.totalComments || 0} messages • Updated: {new Date(board.lastUpdate).toLocaleTimeString()}
              </div>
              {board.stats && (
                <div style={{ fontSize: '11px', color: '#666', marginTop: '6px' }}>
                  💚 {board.stats.genuinePercentage || 0}% genuine •
                  ❓ {board.stats.questionPercentage || 0}% questions •
                  🗣️ {board.stats.discussionPercentage || 0}% discussion
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
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
          onClick={() => setTab('live')}
          style={tab === 'live' ? {
            ...tabActiveStyle,
            borderBottom: tab === 'live' ? '3px solid #CC0000' : undefined,
            color: tab === 'live' ? '#CC0000' : '#555'
          } : { ...tabStyle, position: 'relative' }}
        >
          🔴 Live
          {Object.keys(liveBoards).length > 0 && (
            <span style={{
              position: 'absolute',
              top: '4px',
              right: '4px',
              backgroundColor: '#CC0000',
              color: 'white',
              borderRadius: '10px',
              padding: '2px 6px',
              fontSize: '10px',
              fontWeight: 'bold'
            }}>
              {Object.keys(liveBoards).length}
            </span>
          )}
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
        {tab === 'live' && renderLiveBoards()}
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
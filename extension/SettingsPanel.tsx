import React, { useEffect, useState } from 'react';

interface FilterSettings {
  spamSensitivity: 'strict' | 'normal' | 'lenient';
  categories: {
    spam: boolean;
    bot: boolean;
    toxic: boolean;
    genuine: boolean;
    question: boolean;
  };
  customKeywords: string[];
}

const defaultSettings: FilterSettings = {
  spamSensitivity: 'normal',
  categories: {
    spam: false,
    bot: false,
    toxic: true,
    genuine: true,
    question: true
  },
  customKeywords: []
};

export default function SettingsPanel() {
  const [settings, setSettings] = useState<FilterSettings>(defaultSettings);
  const [savedMessage, setSavedMessage] = useState('');

  useEffect(() => {
    chrome.storage.sync.get('filterSettings', (result) => {
      if (result.filterSettings) {
        setSettings(result.filterSettings as FilterSettings);
      }
    });
  }, []);

  const handleSave = () => {
    chrome.storage.sync.set({ filterSettings: settings }, () => {
      setSavedMessage('Settings saved!');
      setTimeout(() => setSavedMessage(''), 2000);
    });
  };

  return (
    <div style={{ padding: '12px' }}>
      <h2 style={{ margin: '0 0 12px 0', color: '#FF0033' }}>⚙️ Settings</h2>
      {/* Spam Sensitivity */}
      <div style={{ marginBottom: 12 }}>
        <label>Spam Sensitivity: </label>
        <select
          value={settings.spamSensitivity}
          onChange={(e) => setSettings({ ...settings, spamSensitivity: e.target.value as any })}
          style={{ marginLeft: 8, padding: 4, fontSize: 14 }}
        >
          <option value="strict">Strict (hide more)</option>
          <option value="normal">Normal</option>
          <option value="lenient">Lenient (show more)</option>
        </select>
      </div>
      {/* Categories */}
      <div style={{ marginBottom: 12 }}>
        <h4 style={{ margin: '0 0 8px 0' }}>Show Categories:</h4>
        {Object.entries(settings.categories).map(([cat, checked]) => (
          <label key={cat} style={{ display: 'block', marginBottom: 6 }}>
            <input
              type="checkbox"
              checked={checked}
              onChange={(e) => setSettings({
                ...settings,
                categories: { ...settings.categories, [cat]: e.target.checked }
              })}
            />
            <span style={{ marginLeft: 6, textTransform: 'capitalize' }}>{cat}</span>
          </label>
        ))}
      </div>
      {/* Save button */}
      <button
        onClick={handleSave}
        style={{
          width: '100%',
          padding: '8px',
          background: '#FF0033',
          color: 'white',
          border: 'none',
          borderRadius: 4,
          fontSize: 14,
          cursor: 'pointer'
        }}
      >
        Save Settings
      </button>
      {savedMessage && <p style={{ color: '#4CAF50', marginTop: 8 }}>{savedMessage}</p>}
    </div>
  );
}
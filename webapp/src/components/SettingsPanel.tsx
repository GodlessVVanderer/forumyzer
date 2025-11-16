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
  const [savedMsg, setSavedMsg] = useState('');

  useEffect(() => {
    const stored = localStorage.getItem('filterSettings');
    if (stored) {
      setSettings(JSON.parse(stored));
    }
  }, []);

  const save = () => {
    localStorage.setItem('filterSettings', JSON.stringify(settings));
    setSavedMsg('Settings saved');
    setTimeout(() => setSavedMsg(''), 2000);
  };

  return (
    <div>
      <h2>⚙️ Settings</h2>
      {/* Spam sensitivity */}
      <div style={{ marginBottom: 12 }}>
        <label>Spam Sensitivity: </label>
        <select
          value={settings.spamSensitivity}
          onChange={(e) => setSettings({ ...settings, spamSensitivity: e.target.value as any })}
          style={{ marginLeft: 8, padding: 4, fontSize: 16 }}
        >
          <option value="strict">Strict</option>
          <option value="normal">Normal</option>
          <option value="lenient">Lenient</option>
        </select>
      </div>
      {/* Categories */}
      <div style={{ marginBottom: 12 }}>
        <h4>Show Categories</h4>
        {Object.entries(settings.categories).map(([cat, val]) => (
          <label key={cat} style={{ display: 'block', marginBottom: 6 }}>
            <input
              type="checkbox"
              checked={val}
              onChange={(e) => setSettings({
                ...settings,
                categories: { ...settings.categories, [cat]: e.target.checked }
              })}
            />
            <span style={{ marginLeft: 6, textTransform: 'capitalize' }}>{cat}</span>
          </label>
        ))}
      </div>
      <button
        onClick={save}
        style={{ padding: 8, background: '#FF0033', color: 'white', border: 'none', borderRadius: 4, fontSize: 16 }}
      >
        Save Settings
      </button>
      {savedMsg && <p style={{ color: '#4CAF50', marginTop: 8 }}>{savedMsg}</p>}
    </div>
  );
}
import React, { useEffect, useState } from 'react';
import { secureStorage } from '../utils/security';

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

/**
 * SettingsPanel - Manage forumyze filtering preferences
 */
export default function SettingsPanel() {
  const [settings, setSettings] = useState<FilterSettings>(defaultSettings);
  const [savedMsg, setSavedMsg] = useState('');

  useEffect(() => {
    // Load forumyze settings from secure storage
    const stored = secureStorage.getItem<FilterSettings>('forumyzedSettings', defaultSettings);
    setSettings(stored);
  }, []);

  const saveForumyzedSettings = () => {
    try {
      secureStorage.setItem('forumyzedSettings', settings);
      setSavedMsg('✅ Forumyze settings saved securely');
    } catch (err) {
      setSavedMsg('❌ Failed to save forumyze settings');
      console.error('Forumyzed settings save error:', err);
    }
    setTimeout(() => setSavedMsg(''), 3000);
  };

  return (
    <div>
      <h2>⚙️ Forumyze Settings</h2>

      {/* Spam sensitivity for forumyze classification */}
      <div style={{ marginBottom: 12 }}>
        <label>Spam Classification Sensitivity: </label>
        <select
          value={settings.spamSensitivity}
          onChange={(e) =>
            setSettings({ ...settings, spamSensitivity: e.target.value as any })
          }
          style={{ marginLeft: 8, padding: 4, fontSize: 16 }}
        >
          <option value="strict">Strict (aggressive spam detection)</option>
          <option value="normal">Normal (balanced)</option>
          <option value="lenient">Lenient (conservative spam detection)</option>
        </select>
      </div>

      {/* Show/hide forumyzed categories */}
      <div style={{ marginBottom: 12 }}>
        <h4>Forumyzed Categories to Display</h4>
        {Object.entries(settings.categories).map(([category, isVisible]) => (
          <label key={category} style={{ display: 'block', marginBottom: 6 }}>
            <input
              type="checkbox"
              checked={isVisible}
              onChange={(e) =>
                setSettings({
                  ...settings,
                  categories: { ...settings.categories, [category]: e.target.checked }
                })
              }
            />
            <span style={{ marginLeft: 6, textTransform: 'capitalize' }}>
              {category}
            </span>
          </label>
        ))}
      </div>

      <button
        onClick={saveForumyzedSettings}
        style={{
          padding: 8,
          background: '#FF0033',
          color: 'white',
          border: 'none',
          borderRadius: 4,
          fontSize: 16,
          cursor: 'pointer'
        }}
      >
        Save Forumyze Settings
      </button>
      {savedMsg && (
        <p style={{ color: savedMsg.includes('✅') ? '#4CAF50' : '#f44336', marginTop: 8 }}>
          {savedMsg}
        </p>
      )}
    </div>
  );
}

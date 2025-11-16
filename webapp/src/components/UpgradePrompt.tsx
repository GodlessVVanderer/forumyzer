import React from 'react';

interface Props {
  remaining: number;
  onUpgrade?: () => void;
}

export default function UpgradePrompt({ remaining, onUpgrade }: Props) {
  return (
    <div style={{ backgroundColor: '#FFF3CD', border: '1px solid #FFE69C', borderRadius: 8, padding: 12, marginBottom: 12 }}>
      <p style={{ margin: '0 0 8px 0', fontWeight: 'bold' }}>📊 {remaining} forumisations left this month</p>
      <button
        onClick={() => onUpgrade && onUpgrade()}
        style={{ background: '#FF0033', color: 'white', border: 'none', padding: '8px 16px', borderRadius: 4, cursor: 'pointer' }}
      >
        Upgrade to Premium
      </button>
    </div>
  );
}
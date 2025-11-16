import React from 'react';

interface UpgradePromptProps {
  remaining: number;
  onUpgrade?: () => void;
}

export default function UpgradePrompt({ remaining, onUpgrade }: UpgradePromptProps) {
  return (
    <div
      style={{
        backgroundColor: '#FFF3CD',
        border: '1px solid #FFE69C',
        borderRadius: 8,
        padding: 12,
        marginBottom: 12,
        fontSize: 14
      }}
    >
      <p style={{ margin: '0 0 8px 0', fontWeight: 'bold' }}>📊 {remaining} forumisations left this month</p>
      <button
        onClick={() => onUpgrade && onUpgrade()}
        style={{
          background: '#FF0033',
          color: 'white',
          border: 'none',
          padding: '8px 16px',
          borderRadius: 4,
          cursor: 'pointer'
        }}
      >
        Upgrade to Premium - $4.99/month
      </button>
    </div>
  );
}
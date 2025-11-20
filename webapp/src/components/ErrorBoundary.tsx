import React, { ReactNode, useState } from 'react';
import { sanitizeErrorMessage } from '../utils/security';

interface Props {
  children: ReactNode;
}

/**
 * ErrorBoundary - Catches React errors and displays user-friendly messages
 */
export default function ErrorBoundary({ children }: Props) {
  const [error, setError] = useState<string | null>(null);

  if (error) {
    return (
      <div
        style={{
          padding: 20,
          backgroundColor: '#ffebee',
          border: '1px solid #f44336',
          borderRadius: 8,
          color: '#c62828',
          fontFamily: 'sans-serif'
        }}
      >
        <h2>Something went wrong</h2>
        <p>{sanitizeErrorMessage(error)}</p>
        <button
          onClick={() => {
            setError(null);
            window.location.reload();
          }}
          style={{
            padding: '8px 16px',
            backgroundColor: '#f44336',
            color: 'white',
            border: 'none',
            borderRadius: 4,
            cursor: 'pointer',
            fontSize: 14
          }}
        >
          Reload App
        </button>
      </div>
    );
  }

  try {
    return <>{children}</>;
  } catch (err) {
    setError(err instanceof Error ? err.message : 'An unknown error occurred');
    return null;
  }
}

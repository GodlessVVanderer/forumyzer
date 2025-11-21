import React from 'react';
import './LandingPage.css';

const LandingPage: React.FC = () => {
  return (
    <div className="landing-page-simple">
      <div className="landing-center">
        <h1 className="landing-logo">FORUMYZER</h1>
        <p className="landing-tagline">Transform YouTube Comments into Intelligent Forums</p>

        <div className="landing-input-group">
          <input
            type="text"
            placeholder="Paste YouTube URL..."
            className="landing-input"
          />
          <button className="landing-button">FORUMYZE</button>
        </div>

        <div className="landing-features-simple">
          <div className="feature-item">✓ AI Categorization</div>
          <div className="feature-item">✓ Spam Filtering</div>
          <div className="feature-item">✓ Bot Detection</div>
        </div>

        <button className="landing-signin">Sign In for Pro Features</button>
      </div>
    </div>
  );
};

export default LandingPage;

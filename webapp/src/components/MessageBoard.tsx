import React, { useState } from 'react';
import { sanitizeText } from '../utils/security';

interface Topic {
  title: string;
  description: string;
  comments: Comment[];
  sentiment: 'positive' | 'negative' | 'neutral';
}

interface Comment {
  id: string;
  author: string;
  text: string;
  likeCount?: number;
  replies?: Comment[];
}

interface MessageBoardProps {
  topics: Topic[];
  spam: Comment[];
  bots: Comment[];
  toxic: Comment[];
  genuine: Comment[];
}

export default function MessageBoard({ topics, spam, bots, toxic, genuine }: MessageBoardProps) {
  const [expandedTopics, setExpandedTopics] = useState<Set<number>>(new Set([0]));
  const [filter, setFilter] = useState<'all' | 'spam' | 'bots' | 'toxic'>('all');

  const toggleTopic = (index: number) => {
    const newExpanded = new Set(expandedTopics);
    if (newExpanded.has(index)) {
      newExpanded.delete(index);
    } else {
      newExpanded.add(index);
    }
    setExpandedTopics(newExpanded);
  };

  const getSentimentColor = (sentiment: string) => {
    switch (sentiment) {
      case 'positive': return '#4caf50';
      case 'negative': return '#f44336';
      default: return '#aaaaaa';
    }
  };

  const CommentItem = ({ comment, depth = 0 }: { comment: Comment; depth?: number }) => {
    const [showReplies, setShowReplies] = useState(false);
    
    return (
      <div style={{ marginLeft: depth * 24 }}>
        <div className="comment-wrapper">
          <div className="comment-author">
            <div className="avatar">{sanitizeText(comment.author)[0] || '?'}</div>
            <span className="comment-author-name">{sanitizeText(comment.author)}</span>
            {comment.likeCount && comment.likeCount > 0 && (
              <span style={{ color: 'var(--text-tertiary)', fontSize: '12px' }}>
                👍 {comment.likeCount}
              </span>
            )}
          </div>
          <div className="comment-text">{sanitizeText(comment.text)}</div>
          {comment.replies && comment.replies.length > 0 && (
            <button 
              className="reply-toggle"
              onClick={() => setShowReplies(!showReplies)}
            >
              {showReplies ? '▼' : '▶'} {comment.replies.length} {comment.replies.length === 1 ? 'reply' : 'replies'}
            </button>
          )}
        </div>
        {showReplies && comment.replies?.map(reply => (
          <CommentItem key={reply.id} comment={reply} depth={depth + 1} />
        ))}
      </div>
    );
  };

  const displayContent = () => {
    switch (filter) {
      case 'spam':
        return (
          <div className="spam-section">
            <h3 style={{ color: 'var(--cat-spam)' }}>🗑️ Spam ({spam.length})</h3>
            {spam.map(comment => <CommentItem key={comment.id} comment={comment} />)}
          </div>
        );
      case 'bots':
        return (
          <div className="bots-section">
            <h3 style={{ color: 'var(--cat-bot)' }}>🤖 Bots ({bots.length})</h3>
            {bots.map(comment => <CommentItem key={comment.id} comment={comment} />)}
          </div>
        );
      case 'toxic':
        return (
          <div className="toxic-section hell-section">
            <h3 style={{ color: 'var(--hell-fire)' }}>🔥 HELL ({toxic.length})</h3>
            {toxic.map(comment => (
              <div key={comment.id} className="hell-comment">
                <CommentItem comment={comment} />
              </div>
            ))}
          </div>
        );
      default:
        return (
          <div className="topics-section">
            {topics.map((topic, index) => (
              <div key={index} className="topic-thread">
                <div 
                  className="topic-header"
                  onClick={() => toggleTopic(index)}
                  style={{ cursor: 'pointer' }}
                >
                  <span className="topic-expand-icon">
                    {expandedTopics.has(index) ? '▼' : '▶'}
                  </span>
                  <div className="topic-info">
                    <h3 className="topic-title">
                      {topic.title}
                      <span 
                        className="topic-sentiment"
                        style={{ color: getSentimentColor(topic.sentiment) }}
                      >
                        {topic.sentiment === 'positive' && '😊'}
                        {topic.sentiment === 'negative' && '😠'}
                        {topic.sentiment === 'neutral' && '😐'}
                      </span>
                    </h3>
                    <p className="topic-description">{topic.description}</p>
                    <span className="topic-count">{topic.comments.length} comments</span>
                  </div>
                </div>
                {expandedTopics.has(index) && (
                  <div className="topic-comments">
                    {topic.comments.map(comment => (
                      <CommentItem key={comment.id} comment={comment} />
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        );
    }
  };

  return (
    <div className="message-board">
      <div className="forum-tabs">
        <button
          onClick={() => setFilter('all')}
          className={`tab ${filter === 'all' ? 'active' : ''}`}
        >
          📁 TOPICS ({topics.length})
        </button>
        <button
          onClick={() => setFilter('spam')}
          className={`tab ${filter === 'spam' ? 'active' : ''}`}
        >
          🗑️ SPAM ({spam.length})
        </button>
        <button
          onClick={() => setFilter('bots')}
          className={`tab ${filter === 'bots' ? 'active' : ''}`}
        >
          🤖 BOTS ({bots.length})
        </button>
        <button
          onClick={() => setFilter('toxic')}
          className={`tab hell-tab ${filter === 'toxic' ? 'active' : ''}`}
        >
          🔥 HELL ({toxic.length})
        </button>
      </div>
      <div className="forum-posts">
        {displayContent()}
      </div>
    </div>
  );
}

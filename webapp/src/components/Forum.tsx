import React, { useState, useMemo } from 'react';
import Comment from './Comment';
import type { CommentData, CategoryKey, MessageBoardStats } from '../types';

interface ForumProps {
  comments: CommentData[];
  activeCategory: CategoryKey;
  stats: MessageBoardStats;
  onReply: (commentId: string, content: string) => void;
  onEdit: (commentId: string, newContent: string) => void;
  onDelete: (commentId: string) => void;
  onPin: (commentId: string) => void;
  highlightId?: string;
  isLive?: boolean;
}

const FORUM_CATEGORIES = {
  discussion: { name: 'Discussion', emoji: '🗣️', color: '#00BCD4', description: 'General discussions and conversations' },
  question: { name: 'Questions', emoji: '❓', color: '#2196F3', description: 'Questions from viewers' },
  feedback: { name: 'Feedback', emoji: '💡', color: '#FF9800', description: 'Constructive feedback and suggestions' },
  genuine: { name: 'Genuine', emoji: '👍', color: '#4CAF50', description: 'Positive and authentic comments' },
  bot: { name: 'Bot', emoji: '🤖', color: '#9E9E9E', description: 'Automated or bot-generated content' },
  spam: { name: 'Spam', emoji: '🚫', color: '#F44336', description: 'Spam and low-quality content' },
  toxic: { name: 'Toxic', emoji: '⚠️', color: '#E91E63', description: 'Harmful or offensive content' }
};

export default function Forum({
  comments,
  activeCategory,
  stats,
  onReply,
  onEdit,
  onDelete,
  onPin,
  highlightId,
  isLive = false
}: ForumProps) {
  const [sortBy, setSortBy] = useState<'newest' | 'oldest' | 'confidence' | 'replies'>('newest');
  const [filterSentiment, setFilterSentiment] = useState<'all' | 'positive' | 'negative' | 'neutral'>('all');
  const [minConfidence, setMinConfidence] = useState(0);
  const [expandAll, setExpandAll] = useState(false);

  // Filter comments by active category
  const categoryComments = useMemo(() => {
    return comments.filter(comment => comment.aiCategory === activeCategory);
  }, [comments, activeCategory]);

  // Apply sentiment filter
  const sentimentFiltered = useMemo(() => {
    if (filterSentiment === 'all') return categoryComments;
    return categoryComments.filter(comment =>
      comment.aiSentiment?.toLowerCase() === filterSentiment
    );
  }, [categoryComments, filterSentiment]);

  // Apply confidence filter
  const confidenceFiltered = useMemo(() => {
    return sentimentFiltered.filter(comment =>
      (comment.aiConfidence || 0) >= minConfidence
    );
  }, [sentimentFiltered, minConfidence]);

  // Sort comments
  const sortedComments = useMemo(() => {
    const sorted = [...confidenceFiltered];

    switch (sortBy) {
      case 'newest':
        return sorted.sort((a, b) =>
          new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime()
        );
      case 'oldest':
        return sorted.sort((a, b) =>
          new Date(a.publishedAt).getTime() - new Date(b.publishedAt).getTime()
        );
      case 'confidence':
        return sorted.sort((a, b) =>
          (b.aiConfidence || 0) - (a.aiConfidence || 0)
        );
      case 'replies':
        return sorted.sort((a, b) =>
          (b.replies?.length || 0) - (a.replies?.length || 0)
        );
      default:
        return sorted;
    }
  }, [confidenceFiltered, sortBy]);

  // Separate pinned comments
  const pinnedComments = sortedComments.filter(c => c.isPinned);
  const regularComments = sortedComments.filter(c => !c.isPinned);

  const categoryInfo = FORUM_CATEGORIES[activeCategory];
  const totalInCategory = categoryComments.length;
  const percentageInCategory = stats.totalComments > 0
    ? ((totalInCategory / stats.totalComments) * 100).toFixed(1)
    : '0.0';

  return (
    <div className="forum-container">
      {/* Category Header */}
      <div className="category-header" style={{ borderLeftColor: categoryInfo.color }}>
        <div className="category-title">
          <span className="category-emoji" style={{ fontSize: '2rem' }}>
            {categoryInfo.emoji}
          </span>
          <div>
            <h2>{categoryInfo.name}</h2>
            <p className="category-description">{categoryInfo.description}</p>
          </div>
        </div>

        <div className="category-stats">
          <div className="stat-box">
            <span className="stat-value">{totalInCategory}</span>
            <span className="stat-label">comments</span>
          </div>
          <div className="stat-box">
            <span className="stat-value">{percentageInCategory}%</span>
            <span className="stat-label">of total</span>
          </div>
          {isLive && (
            <div className="stat-box live-indicator">
              <span className="live-dot">🔴</span>
              <span className="stat-label">LIVE</span>
            </div>
          )}
        </div>
      </div>

      {/* Filters and Controls */}
      <div className="forum-controls">
        <div className="control-group">
          <label>
            <span>Sort by:</span>
            <select value={sortBy} onChange={(e) => setSortBy(e.target.value as any)}>
              <option value="newest">Newest First</option>
              <option value="oldest">Oldest First</option>
              <option value="confidence">Highest Confidence</option>
              <option value="replies">Most Replies</option>
            </select>
          </label>

          <label>
            <span>Sentiment:</span>
            <select value={filterSentiment} onChange={(e) => setFilterSentiment(e.target.value as any)}>
              <option value="all">All ({categoryComments.length})</option>
              <option value="positive">
                Positive ({categoryComments.filter(c => c.aiSentiment?.toLowerCase() === 'positive').length})
              </option>
              <option value="neutral">
                Neutral ({categoryComments.filter(c => c.aiSentiment?.toLowerCase() === 'neutral').length})
              </option>
              <option value="negative">
                Negative ({categoryComments.filter(c => c.aiSentiment?.toLowerCase() === 'negative').length})
              </option>
            </select>
          </label>

          <label>
            <span>Min Confidence: {(minConfidence * 100).toFixed(0)}%</span>
            <input
              type="range"
              min="0"
              max="100"
              value={minConfidence * 100}
              onChange={(e) => setMinConfidence(parseInt(e.target.value) / 100)}
              style={{
                background: `linear-gradient(to right, ${categoryInfo.color} 0%, ${categoryInfo.color} ${minConfidence * 100}%, #ddd ${minConfidence * 100}%, #ddd 100%)`
              }}
            />
          </label>
        </div>

        <div className="control-actions">
          <button
            className="btn-secondary"
            onClick={() => setExpandAll(!expandAll)}
          >
            {expandAll ? 'Collapse All' : 'Expand All'}
          </button>
        </div>
      </div>

      {/* Results Summary */}
      <div className="results-summary">
        Showing {sortedComments.length} of {totalInCategory} {categoryInfo.name.toLowerCase()} comments
        {sortedComments.length < totalInCategory && (
          <span className="filter-notice">
            ({totalInCategory - sortedComments.length} hidden by filters)
          </span>
        )}
      </div>

      {/* Pinned Comments */}
      {pinnedComments.length > 0 && (
        <div className="pinned-section">
          <h3>📌 Pinned Comments</h3>
          <div className="comments-list">
            {pinnedComments.map(comment => (
              <Comment
                key={comment.id}
                comment={comment}
                onReply={onReply}
                onEdit={onEdit}
                onDelete={onDelete}
                onPin={onPin}
                isHighlighted={comment.id === highlightId}
                forceExpanded={expandAll}
                categoryColor={categoryInfo.color}
              />
            ))}
          </div>
        </div>
      )}

      {/* Regular Comments */}
      <div className="comments-list">
        {regularComments.length > 0 ? (
          regularComments.map(comment => (
            <Comment
              key={comment.id}
              comment={comment}
              onReply={onReply}
              onEdit={onEdit}
              onDelete={onDelete}
              onPin={onPin}
              isHighlighted={comment.id === highlightId}
              forceExpanded={expandAll}
              categoryColor={categoryInfo.color}
            />
          ))
        ) : (
          <div className="empty-state">
            <span style={{ fontSize: '4rem', opacity: 0.3 }}>
              {categoryInfo.emoji}
            </span>
            <h3>No comments in this category yet</h3>
            <p>
              {totalInCategory > 0
                ? 'Try adjusting your filters to see more comments'
                : `No ${categoryInfo.name.toLowerCase()} comments have been posted`
              }
            </p>
          </div>
        )}
      </div>

      {/* Live Stream Auto-scroll Indicator */}
      {isLive && sortedComments.length > 0 && (
        <div className="live-footer">
          <span className="live-pulse">🔴</span>
          New messages will appear automatically
        </div>
      )}
    </div>
  );
}

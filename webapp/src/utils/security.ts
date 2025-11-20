import DOMPurify from 'dompurify';

/**
 * Sanitize HTML to prevent XSS attacks while preserving safe formatting
 */
export function sanitizeHTML(dirty: string): string {
  return DOMPurify.sanitize(dirty, {
    ALLOWED_TAGS: ['b', 'i', 'em', 'strong', 'a', 'br'],
    ALLOWED_ATTR: ['href', 'target'],
    ALLOWED_URI_REGEXP: /^https?:\/\//
  });
}

/**
 * Sanitize plain text (removes all HTML and scripts)
 */
export function sanitizeText(text: string): string {
  return DOMPurify.sanitize(text, { ALLOWED_TAGS: [] });
}

/**
 * Validate YouTube video ID format (11-12 alphanumeric chars with - and _)
 */
export function isValidVideoId(videoId: string): boolean {
  return /^[a-zA-Z0-9_-]{11}$/.test(videoId);
}

/**
 * Extract and validate YouTube video ID from URL
 */
export function extractVideoId(url: string): string | null {
  if (!url || typeof url !== 'string') return null;
  if (url.length > 2048) return null; // Max URL length

  // Match YouTube URL patterns (youtube.com/watch?v= or youtu.be/)
  const match = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&\n?#]+)/);
  const videoId = match ? match[1] : null;

  // Validate extracted ID format
  return videoId && isValidVideoId(videoId) ? videoId : null;
}

/**
 * Validate UUID v4 format
 */
export function isValidUUID(uuid: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(uuid);
}

/**
 * Secure localStorage wrapper with XSS protection for forumyzed data
 */
export const secureStorage = {
  setItem(key: string, value: any): void {
    try {
      const sanitizedKey = sanitizeText(key);
      // Prevent storing functions or RegExp objects
      if (typeof value === 'function' || value instanceof RegExp) {
        throw new Error('Cannot store functions or RegExp in storage');
      }
      const jsonString = JSON.stringify(value);
      localStorage.setItem(sanitizedKey, jsonString);
    } catch (err) {
      console.error('Failed to save to localStorage:', err);
    }
  },

  getItem<T>(key: string, defaultValue: T): T {
    try {
      const sanitizedKey = sanitizeText(key);
      const item = localStorage.getItem(sanitizedKey);
      if (!item) return defaultValue;

      const parsed = JSON.parse(item);

      // Validate parsed data doesn't contain dangerous content
      if (containsDangerousContent(parsed)) {
        console.warn('Potentially dangerous content detected in localStorage');
        localStorage.removeItem(sanitizedKey);
        return defaultValue;
      }

      return parsed as T;
    } catch (err) {
      console.error('Failed to read from localStorage:', err);
      return defaultValue;
    }
  },

  removeItem(key: string): void {
    try {
      const sanitizedKey = sanitizeText(key);
      localStorage.removeItem(sanitizedKey);
    } catch (err) {
      console.error('Failed to remove from localStorage:', err);
    }
  }
};

/**
 * Check if parsed JSON contains dangerous content (script injections, etc)
 */
function containsDangerousContent(obj: any): boolean {
  if (obj === null || obj === undefined) return false;

  if (typeof obj === 'string') {
    // Check for script tags, event handlers, javascript: protocol
    const dangerous = /<script|javascript:|onerror|onload|onclick/i.test(obj);
    return dangerous;
  }

  if (Array.isArray(obj)) {
    return obj.some(item => containsDangerousContent(item));
  }

  if (typeof obj === 'object') {
    return Object.values(obj).some(value => containsDangerousContent(value));
  }

  return false;
}

/**
 * Validate and sanitize API error messages
 */
export function sanitizeErrorMessage(error: any): string {
  if (!error) return 'An unknown error occurred';

  const message = error.message || error.error || String(error);

  // Remove any HTML/scripts
  const sanitized = sanitizeText(message);

  // Limit length to prevent DOS via error messages
  return sanitized.slice(0, 500);
}

/**
 * Client-side rate limiter for forumyze actions
 */
export class RateLimiter {
  private timestamps: Map<string, number[]> = new Map();

  /**
   * Check if action is allowed based on rate limit
   * @param key Action identifier (e.g., 'forumyze', 'podcast')
   * @param maxAttempts Maximum attempts allowed
   * @param windowMs Time window in milliseconds
   * @returns true if action is allowed, false if rate limited
   */
  isAllowed(key: string, maxAttempts: number, windowMs: number): boolean {
    const now = Date.now();
    const attempts = this.timestamps.get(key) || [];

    // Filter out attempts outside the time window
    const recentAttempts = attempts.filter(time => now - time < windowMs);

    if (recentAttempts.length >= maxAttempts) {
      return false;
    }

    // Record this attempt
    recentAttempts.push(now);
    this.timestamps.set(key, recentAttempts);

    return true;
  }

  /**
   * Reset rate limit for a specific key
   */
  reset(key: string): void {
    this.timestamps.delete(key);
  }

  /**
   * Reset all rate limits
   */
  resetAll(): void {
    this.timestamps.clear();
  }
}

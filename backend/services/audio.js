/*
 * Placeholder audio service. In production, replace this module with
 * a call to an external Text‑to‑Speech API (e.g. Google Cloud
 * Text‑to‑Speech) to generate an audio summary of the top
 * discussions. For now this returns a dummy audio file path.
 */

const path = require('path');

/**
 * Generate an audio summary for a forum.
 * @param {Array} threads Array of forum threads.
 * @param {Number} topN Number of comments to include in the summary.
 * @returns {String} URL or path to the generated audio file.
 */
async function generateAudioSummary(threads, topN = 5) {
  // Select top N comments from the threads (highest level only) based on category order
  const selected = threads.slice(0, topN).map(t => `${t.author} says: ${t.text}`);
  const textToSynthesize = selected.join('\n');
  // TODO: call external TTS API with textToSynthesize and save audio file
  // For now, return a static placeholder audio file located in the public folder
  return '/audio/placeholder-summary.mp3';
}

module.exports = { generateAudioSummary };
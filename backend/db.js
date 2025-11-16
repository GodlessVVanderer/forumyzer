/*
 * Simple JSON storage helper.
 *
 * In production, replace this module with a proper database client
 * (e.g. PostgreSQL, MongoDB or Firebase). For development and testing
 * purposes a JSON file suffices to demonstrate persistence.
 */

const fs = require('fs');
const path = require('path');

const DB_FILE = path.join(__dirname, 'db.json');

// Load data from JSON file
function load() {
  try {
    const raw = fs.readFileSync(DB_FILE, 'utf8');
    return JSON.parse(raw);
  } catch (err) {
    // If file doesn't exist or is invalid, return an empty structure
    return { forums: [], users: [], subscriptions: [] };
  }
}

// Save data to JSON file
function save(data) {
  fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2));
}

module.exports = { load, save };
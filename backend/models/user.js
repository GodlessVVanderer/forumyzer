const { v4: uuidv4 } = require('uuid');
const db = require('../db');

/**
 * User model. A simple record of signed‑in users. Replace with
 * proper OAuth & database integration in production.
 */
class UserModel {
  /**
   * Create or find a user by Google ID.
   * @param {Object} profile Contains googleId, email, name, picture.
   */
  static findOrCreate(profile) {
    const data = db.load();
    let user = data.users.find(u => u.googleId === profile.googleId);
    if (!user) {
      user = {
        id: uuidv4(),
        googleId: profile.googleId,
        email: profile.email,
        name: profile.name,
        picture: profile.picture,
        createdAt: new Date().toISOString(),
        subscriptionTier: 'free'
      };
      data.users.push(user);
      db.save(data);
    }
    return user;
  }

  /**
   * Find user by ID.
   */
  static findById(id) {
    const data = db.load();
    return data.users.find(u => u.id === id);
  }

  /**
   * Update user subscription tier.
   */
  static updateSubscription(id, tier) {
    const data = db.load();
    const user = data.users.find(u => u.id === id);
    if (user) {
      user.subscriptionTier = tier;
      db.save(data);
    }
    return user;
  }
}

module.exports = UserModel;
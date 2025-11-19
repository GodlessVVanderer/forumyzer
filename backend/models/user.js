const { v4: uuidv4 } = require('uuid');
const db = require('../db-async');

/**
 * User model. A simple record of signed‑in users. Replace with
 * proper OAuth & database integration in production.
 * All methods are async to use non-blocking file I/O.
 */
class UserModel {
  /**
   * Create or find a user by Google ID.
   * @param {Object} profile Contains googleId, email, name, picture.
   */
  static async findOrCreate(profile) {
    const data = await db.load();
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
      await db.save(data);
    }
    return user;
  }

  /**
   * Find user by ID.
   */
  static async findById(id) {
    const data = await db.load();
    return data.users.find(u => u.id === id);
  }

  /**
   * Update user subscription tier.
   */
  static async updateSubscription(id, tier) {
    const data = await db.load();
    const user = data.users.find(u => u.id === id);
    if (user) {
      user.subscriptionTier = tier;
      await db.save(data);
    }
    return user;
  }
}

module.exports = UserModel;
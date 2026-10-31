const jwt = require('jsonwebtoken');
const User = require('../models/User');

// Verifies the JWT and attaches the authenticated user to req.user.
// Loads the user fresh from the DB (not just the token payload) so that
// role changes / bans take effect immediately without waiting for token expiry.
exports.protect = async (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ message: 'Not authorized, no token provided' });
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    const user = await User.findById(decoded.id);
    if (!user) {
      return res.status(401).json({ message: 'Not authorized, user no longer exists' });
    }

    req.user = user; // full Mongoose document, minus password (select:false)
    next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ message: 'Session expired, please log in again' });
    }
    return res.status(401).json({ message: 'Not authorized, invalid token' });
  }
};

// Like `protect`, but never rejects the request — it just attaches req.user
// when a valid token is present, so a route can behave differently for
// logged-in viewers (e.g. "did I already vote on this?") while staying
// accessible to guests.
exports.optionalAuth = async (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return next();
  }

  try {
    const decoded = jwt.verify(authHeader.split(' ')[1], process.env.JWT_SECRET);
    const user = await User.findById(decoded.id);
    if (user) req.user = user;
  } catch (error) {
    // invalid/expired token on an optional route — proceed as a guest
  }

  next();
};

// Role-based access control.
// Usage: router.post('/announcements', protect, requireRole('faculty', 'admin'), handler)
exports.requireRole = (...allowedRoles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ message: 'Not authorized' });
    }

    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        message: `Access denied: requires role ${allowedRoles.join(' or ')}`,
      });
    }

    next();
  };
};

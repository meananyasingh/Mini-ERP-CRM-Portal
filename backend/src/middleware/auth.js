const jwt = require('jsonwebtoken');
const { User } = require('../models');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');

// Verifies the Bearer JWT, loads the current user, and attaches a minimal
// user object (no passwordHash) to req.user for downstream handlers.
const authenticate = asyncHandler(async (req, res, next) => {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;

  if (!token) {
    return next(new ApiError(401, 'Authentication token is required'));
  }

  let payload;
  try {
    payload = jwt.verify(token, process.env.JWT_SECRET);
  } catch (err) {
    return next(new ApiError(401, 'Invalid or expired token'));
  }

  const user = await User.findByPk(payload.id);
  if (!user) {
    return next(new ApiError(401, 'User associated with this token no longer exists'));
  }

  req.user = { id: user.id, name: user.name, email: user.email, role: user.role };
  next();
});

// Restricts a route to the given roles; must run after authenticate().
const authorize = (...roles) => (req, res, next) => {
  if (!req.user || !roles.includes(req.user.role)) {
    return next(new ApiError(403, 'You do not have permission to perform this action'));
  }
  next();
};

module.exports = { authenticate, authorize };

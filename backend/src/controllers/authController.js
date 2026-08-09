const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { User } = require('../models');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');
const { success } = require('../utils/response');

const PASSWORD_SALT_ROUNDS = 10;

// Shape returned for the authenticated user — passwordHash is never included.
function toAuthUser(user) {
  return { id: user.id, name: user.name, email: user.email, role: user.role };
}

// Shape returned for the user management endpoints (adds createdAt).
function toUserRecord(user) {
  return { id: user.id, name: user.name, email: user.email, role: user.role, createdAt: user.createdAt };
}

function signToken(user) {
  return jwt.sign({ id: user.id, role: user.role }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || '8h',
  });
}

// POST /api/auth/login
const login = asyncHandler(async (req, res, next) => {
  const { email, password } = req.body;

  const user = await User.findOne({ where: { email } });
  if (!user) {
    return next(new ApiError(401, 'Invalid email or password'));
  }

  const passwordMatches = await bcrypt.compare(password, user.passwordHash);
  if (!passwordMatches) {
    return next(new ApiError(401, 'Invalid email or password'));
  }

  const token = signToken(user);
  return success(res, { token, user: toAuthUser(user) });
});

// GET /api/auth/me
const me = asyncHandler(async (req, res, next) => {
  const user = await User.findByPk(req.user.id);
  if (!user) {
    return next(new ApiError(404, 'User not found'));
  }
  return success(res, toAuthUser(user));
});

// POST /api/auth/users (admin only)
const createUser = asyncHandler(async (req, res) => {
  const { name, email, password, role } = req.body;
  const passwordHash = await bcrypt.hash(password, PASSWORD_SALT_ROUNDS);
  const user = await User.create({ name, email, passwordHash, role });
  return success(res, toUserRecord(user), 201);
});

// GET /api/auth/users (admin only)
const listUsers = asyncHandler(async (req, res) => {
  const users = await User.findAll({
    attributes: ['id', 'name', 'email', 'role', 'createdAt'],
    order: [['createdAt', 'DESC']],
  });
  return success(res, users);
});

module.exports = { login, me, createUser, listUsers };

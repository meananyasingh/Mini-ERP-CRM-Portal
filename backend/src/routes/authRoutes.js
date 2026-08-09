const express = require('express');
const { body } = require('express-validator');
const validate = require('../middleware/validate');
const { authenticate, authorize } = require('../middleware/auth');
const authController = require('../controllers/authController');

const router = express.Router();

router.post(
  '/login',
  [
    body('email').isEmail().withMessage('A valid email is required'),
    body('password').notEmpty().withMessage('Password is required'),
  ],
  validate,
  authController.login
);

router.get('/me', authenticate, authController.me);

router.post(
  '/users',
  authenticate,
  authorize('admin'),
  [
    body('name').trim().notEmpty().withMessage('Name is required'),
    body('email').isEmail().withMessage('A valid email is required'),
    body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
    body('role')
      .isIn(['admin', 'sales', 'warehouse', 'accounts'])
      .withMessage('Role must be one of admin, sales, warehouse, accounts'),
  ],
  validate,
  authController.createUser
);

router.get('/users', authenticate, authorize('admin'), authController.listUsers);

module.exports = router;

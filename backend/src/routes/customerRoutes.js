const express = require('express');
const { body } = require('express-validator');
const validate = require('../middleware/validate');
const { authenticate, authorize } = require('../middleware/auth');
const customerController = require('../controllers/customerController');

const router = express.Router();

// Permission matrix (CONTRACT.md section 1): Customers & Follow-ups are
// CRUD for admin/sales, read-only for warehouse/accounts.
const canWrite = authorize('admin', 'sales');
const canRead = authorize('admin', 'sales', 'warehouse', 'accounts');

router.use(authenticate);

const customerValidators = [
  body('name').trim().notEmpty().withMessage('Name is required'),
  body('mobile').trim().notEmpty().withMessage('Mobile number is required'),
  body('email').optional({ checkFalsy: true }).isEmail().withMessage('Invalid email address'),
  body('customerType')
    .optional()
    .isIn(['Retail', 'Wholesale', 'Distributor'])
    .withMessage('Invalid customer type'),
  body('status').optional().isIn(['Lead', 'Active', 'Inactive']).withMessage('Invalid status'),
];

const customerUpdateValidators = [
  body('name').optional().trim().notEmpty().withMessage('Name cannot be empty'),
  body('mobile').optional().trim().notEmpty().withMessage('Mobile number cannot be empty'),
  body('email').optional({ checkFalsy: true }).isEmail().withMessage('Invalid email address'),
  body('customerType')
    .optional()
    .isIn(['Retail', 'Wholesale', 'Distributor'])
    .withMessage('Invalid customer type'),
  body('status').optional().isIn(['Lead', 'Active', 'Inactive']).withMessage('Invalid status'),
];

const followUpValidators = [
  body('note').trim().notEmpty().withMessage('Note is required'),
  body('followUpDate').optional({ checkFalsy: true }).isISO8601().withMessage('followUpDate must be a valid date'),
];

router.get('/', canRead, customerController.listCustomers);
router.get('/:id', canRead, customerController.getCustomer);
router.post('/', canWrite, customerValidators, validate, customerController.createCustomer);
router.put('/:id', canWrite, customerUpdateValidators, validate, customerController.updateCustomer);
router.get('/:id/followups', canRead, customerController.listFollowUps);
router.post('/:id/followups', canWrite, followUpValidators, validate, customerController.createFollowUp);

module.exports = router;

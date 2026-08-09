const express = require('express');
const { body } = require('express-validator');
const validate = require('../middleware/validate');
const { authenticate, authorize } = require('../middleware/auth');
const productController = require('../controllers/productController');

const router = express.Router();

// Permission matrix (CONTRACT.md section 1): Products & Stock movements are
// CRUD for admin/warehouse, read-only for sales/accounts.
const canWrite = authorize('admin', 'warehouse');
const canRead = authorize('admin', 'sales', 'warehouse', 'accounts');

router.use(authenticate);

const productValidators = [
  body('name').trim().notEmpty().withMessage('Name is required'),
  body('sku').trim().notEmpty().withMessage('SKU is required'),
  body('unitPrice').isFloat({ min: 0 }).withMessage('unitPrice must be a number >= 0'),
  body('currentStock').optional().isInt({ min: 0 }).withMessage('currentStock must be a non-negative integer'),
  body('minStockAlert').optional().isInt({ min: 0 }).withMessage('minStockAlert must be a non-negative integer'),
];

const productUpdateValidators = [
  body('name').optional().trim().notEmpty().withMessage('Name cannot be empty'),
  body('sku').optional().trim().notEmpty().withMessage('SKU cannot be empty'),
  body('unitPrice').optional().isFloat({ min: 0 }).withMessage('unitPrice must be a number >= 0'),
  body('minStockAlert').optional().isInt({ min: 0 }).withMessage('minStockAlert must be a non-negative integer'),
];

const stockAdjustValidators = [
  body('quantityChanged').isInt({ min: 1 }).withMessage('quantityChanged must be a positive integer'),
  body('movementType').isIn(['IN', 'OUT']).withMessage('movementType must be IN or OUT'),
  body('reason').trim().notEmpty().withMessage('Reason is required'),
];

router.get('/', canRead, productController.listProducts);
router.get('/:id', canRead, productController.getProduct);
router.post('/', canWrite, productValidators, validate, productController.createProduct);
router.put('/:id', canWrite, productUpdateValidators, validate, productController.updateProduct);
router.get('/:id/stock-movements', canRead, productController.listStockMovements);
router.post('/:id/stock-adjust', canWrite, stockAdjustValidators, validate, productController.stockAdjust);

module.exports = router;

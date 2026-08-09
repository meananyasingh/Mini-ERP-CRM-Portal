const express = require('express');
const { body } = require('express-validator');
const validate = require('../middleware/validate');
const { authenticate, authorize } = require('../middleware/auth');
const challanController = require('../controllers/challanController');

const router = express.Router();

// Permission matrix (CONTRACT.md section 1):
// - create/edit draft: admin & sales CRUD, warehouse & accounts read-only
// - confirm/cancel: admin & sales only
// - PDF view/download: all four roles
const canWrite = authorize('admin', 'sales');
const canConfirmOrCancel = authorize('admin', 'sales');
const canRead = authorize('admin', 'sales', 'warehouse', 'accounts');

router.use(authenticate);

const challanValidators = [
  body('customerId').isInt().withMessage('customerId is required'),
  body('items').isArray({ min: 1 }).withMessage('At least one item is required'),
  body('items.*.productId').isInt().withMessage('Each item requires a productId'),
  body('items.*.quantity').isInt({ min: 1 }).withMessage('Each item requires a quantity greater than 0'),
];

router.get('/', canRead, challanController.listChallans);
router.get('/:id', canRead, challanController.getChallan);
router.post('/', canWrite, challanValidators, validate, challanController.createChallan);
router.put('/:id', canWrite, challanValidators, validate, challanController.updateChallan);
router.post('/:id/confirm', canConfirmOrCancel, challanController.confirmChallan);
router.post('/:id/cancel', canConfirmOrCancel, challanController.cancelChallan);
router.get('/:id/pdf', canRead, challanController.downloadPdf);

module.exports = router;

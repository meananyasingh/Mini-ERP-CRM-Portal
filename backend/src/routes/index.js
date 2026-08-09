const express = require('express');
const authRoutes = require('./authRoutes');
const customerRoutes = require('./customerRoutes');
const productRoutes = require('./productRoutes');
const challanRoutes = require('./challanRoutes');

const router = express.Router();

router.use('/auth', authRoutes);
router.use('/customers', customerRoutes);
router.use('/products', productRoutes);
router.use('/challans', challanRoutes);

module.exports = router;

const { Op } = require('sequelize');
const sequelize = require('../config/db');
const { Product, StockMovement } = require('../models');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');
const { success, paginationMeta } = require('../utils/response');

// GET /api/products?search=&category=&lowStock=true&page=&limit=
const listProducts = asyncHandler(async (req, res) => {
  const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
  const limit = Math.max(parseInt(req.query.limit, 10) || 10, 1);
  const { search, category, lowStock } = req.query;

  const where = {};
  if (category) where.category = category;
  if (search) {
    where[Op.or] = [
      { name: { [Op.iLike]: `%${search}%` } },
      { sku: { [Op.iLike]: `%${search}%` } },
    ];
  }
  if (lowStock === 'true') {
    where[Op.and] = sequelize.where(sequelize.col('currentStock'), Op.lte, sequelize.col('minStockAlert'));
  }

  const { count, rows } = await Product.findAndCountAll({
    where,
    limit,
    offset: (page - 1) * limit,
    order: [['name', 'ASC']],
  });

  return success(res, rows, 200, paginationMeta(page, limit, count));
});

// GET /api/products/:id
const getProduct = asyncHandler(async (req, res, next) => {
  const product = await Product.findByPk(req.params.id);
  if (!product) {
    return next(new ApiError(404, 'Product not found'));
  }
  return success(res, product);
});

// POST /api/products
const createProduct = asyncHandler(async (req, res) => {
  const product = await Product.create(req.body);
  return success(res, product, 201);
});

// PUT /api/products/:id
const updateProduct = asyncHandler(async (req, res, next) => {
  const product = await Product.findByPk(req.params.id);
  if (!product) {
    return next(new ApiError(404, 'Product not found'));
  }
  await product.update(req.body);
  return success(res, product);
});

// GET /api/products/:id/stock-movements?page=&limit=
const listStockMovements = asyncHandler(async (req, res, next) => {
  const product = await Product.findByPk(req.params.id);
  if (!product) {
    return next(new ApiError(404, 'Product not found'));
  }

  const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
  const limit = Math.max(parseInt(req.query.limit, 10) || 10, 1);

  const { count, rows } = await StockMovement.findAndCountAll({
    where: { productId: product.id },
    limit,
    offset: (page - 1) * limit,
    order: [['createdAt', 'DESC']],
  });

  return success(res, rows, 200, paginationMeta(page, limit, count));
});

// POST /api/products/:id/stock-adjust — { quantityChanged, movementType, reason }
// Locks the product row and applies the delta inside a transaction so
// concurrent adjustments can never push currentStock below zero.
const stockAdjust = asyncHandler(async (req, res) => {
  const { quantityChanged, movementType, reason } = req.body;

  const updatedProduct = await sequelize.transaction(async (t) => {
    const product = await Product.findByPk(req.params.id, {
      transaction: t,
      lock: t.LOCK.UPDATE,
    });
    if (!product) {
      throw new ApiError(404, 'Product not found');
    }

    const delta = movementType === 'IN' ? quantityChanged : -quantityChanged;
    const nextStock = product.currentStock + delta;

    if (nextStock < 0) {
      throw new ApiError(400, 'Stock adjustment rejected', [
        {
          field: 'quantityChanged',
          message: `Insufficient stock for ${product.name}: available ${product.currentStock}, requested ${quantityChanged}`,
        },
      ]);
    }

    await product.update({ currentStock: nextStock }, { transaction: t });
    await StockMovement.create(
      {
        productId: product.id,
        quantityChanged,
        movementType,
        reason,
        createdBy: req.user.id,
      },
      { transaction: t }
    );

    return product;
  });

  return success(res, updatedProduct);
});

module.exports = {
  listProducts,
  getProduct,
  createProduct,
  updateProduct,
  listStockMovements,
  stockAdjust,
};

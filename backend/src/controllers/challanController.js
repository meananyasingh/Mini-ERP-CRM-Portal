const sequelize = require('../config/db');
const { Challan, ChallanItem, Customer, Product, StockMovement } = require('../models');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');
const { success, paginationMeta } = require('../utils/response');
const generateChallanNumber = require('../utils/challanNumber');
const streamChallanPdf = require('../utils/pdf');

const ITEM_INCLUDE = { model: ChallanItem, as: 'items' };

// Builds the { name, sku, unitPrice } snapshot and quantity/lineTotal rows
// for a set of requested items, keyed against currently loaded products.
function buildItemRows(items, productMap, challanId) {
  return items.map((item) => {
    const product = productMap.get(item.productId);
    const unitPrice = Number(product.unitPrice);
    return {
      challanId,
      productId: product.id,
      productSnapshot: { name: product.name, sku: product.sku, unitPrice },
      quantity: item.quantity,
      lineTotal: (unitPrice * item.quantity).toFixed(2),
    };
  });
}

// Loads the requested products and fails with a 400 listing any that don't exist.
async function loadProductsOrFail(items) {
  const productIds = [...new Set(items.map((item) => item.productId))];
  const products = await Product.findAll({ where: { id: productIds } });
  const productMap = new Map(products.map((p) => [p.id, p]));

  const missing = productIds.filter((id) => !productMap.has(id));
  if (missing.length) {
    throw new ApiError(
      400,
      'One or more products were not found',
      missing.map((id) => ({ field: 'productId', message: `Product ${id} not found` }))
    );
  }

  return productMap;
}

function buildCustomerSnapshot(customer) {
  return {
    name: customer.name,
    mobile: customer.mobile,
    businessName: customer.businessName,
    address: customer.address,
  };
}

// GET /api/challans?status=&customerId=&page=&limit=
const listChallans = asyncHandler(async (req, res) => {
  const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
  const limit = Math.max(parseInt(req.query.limit, 10) || 10, 1);
  const { status, customerId } = req.query;

  const where = {};
  if (status) where.status = status;
  if (customerId) where.customerId = customerId;

  const { count, rows } = await Challan.findAndCountAll({
    where,
    limit,
    offset: (page - 1) * limit,
    order: [['createdAt', 'DESC']],
  });

  return success(res, rows, 200, paginationMeta(page, limit, count));
});

// GET /api/challans/:id — includes items + customer snapshot
const getChallan = asyncHandler(async (req, res, next) => {
  const challan = await Challan.findByPk(req.params.id, { include: [ITEM_INCLUDE] });
  if (!challan) {
    return next(new ApiError(404, 'Challan not found'));
  }
  return success(res, challan);
});

// POST /api/challans — { customerId, items: [{ productId, quantity }] } -> Draft
const createChallan = asyncHandler(async (req, res, next) => {
  const { customerId, items } = req.body;

  const customer = await Customer.findByPk(customerId);
  if (!customer) {
    return next(new ApiError(404, 'Customer not found'));
  }
  const productMap = await loadProductsOrFail(items);

  const created = await sequelize.transaction(async (t) => {
    const challan = await Challan.create(
      {
        customerId,
        customerSnapshot: buildCustomerSnapshot(customer),
        totalQuantity: items.reduce((sum, item) => sum + item.quantity, 0),
        status: 'Draft',
        createdBy: req.user.id,
      },
      { transaction: t }
    );

    // The human-readable challan number depends on the row's own id, so it
    // can only be assigned after the insert.
    challan.challanNumber = generateChallanNumber(challan.id);
    await challan.save({ transaction: t });

    await ChallanItem.bulkCreate(buildItemRows(items, productMap, challan.id), { transaction: t });

    return challan;
  });

  const result = await Challan.findByPk(created.id, { include: [ITEM_INCLUDE] });
  return success(res, result, 201);
});

// PUT /api/challans/:id — replace items (Draft only)
const updateChallan = asyncHandler(async (req, res, next) => {
  const challan = await Challan.findByPk(req.params.id);
  if (!challan) {
    return next(new ApiError(404, 'Challan not found'));
  }
  if (challan.status !== 'Draft') {
    return next(new ApiError(409, 'Only draft challans can be edited'));
  }

  const { customerId, items } = req.body;
  const customer = await Customer.findByPk(customerId);
  if (!customer) {
    return next(new ApiError(404, 'Customer not found'));
  }
  const productMap = await loadProductsOrFail(items);

  await sequelize.transaction(async (t) => {
    await ChallanItem.destroy({ where: { challanId: challan.id }, transaction: t });
    await ChallanItem.bulkCreate(buildItemRows(items, productMap, challan.id), { transaction: t });

    await challan.update(
      {
        customerId,
        customerSnapshot: buildCustomerSnapshot(customer),
        totalQuantity: items.reduce((sum, item) => sum + item.quantity, 0),
      },
      { transaction: t }
    );
  });

  const result = await Challan.findByPk(challan.id, { include: [ITEM_INCLUDE] });
  return success(res, result);
});

// POST /api/challans/:id/confirm
// Locks every involved product row, verifies stock, then decrements stock
// and records an OUT movement per item — all inside a single transaction so
// a shortfall on any item rolls back the whole confirmation.
const confirmChallan = asyncHandler(async (req, res, next) => {
  const confirmed = await sequelize.transaction(async (t) => {
    const challan = await Challan.findByPk(req.params.id, {
      include: [ITEM_INCLUDE],
      transaction: t,
    });
    if (!challan) {
      throw new ApiError(404, 'Challan not found');
    }
    if (challan.status !== 'Draft') {
      throw new ApiError(409, 'Only draft challans can be confirmed');
    }

    const productIds = challan.items.map((item) => item.productId);
    const products = await Product.findAll({
      where: { id: productIds },
      transaction: t,
      lock: t.LOCK.UPDATE,
    });
    const productMap = new Map(products.map((p) => [p.id, p]));

    const shortages = challan.items
      .filter((item) => {
        const product = productMap.get(item.productId);
        return !product || product.currentStock < item.quantity;
      })
      .map((item) => {
        const product = productMap.get(item.productId);
        return {
          field: 'productId',
          message: `Insufficient stock for ${product ? product.name : item.productId}: available ${
            product ? product.currentStock : 0
          }, requested ${item.quantity}`,
        };
      });

    if (shortages.length) {
      // Do not partially apply — bail out before any stock is touched.
      throw new ApiError(400, 'Insufficient stock for one or more items', shortages);
    }

    for (const item of challan.items) {
      const product = productMap.get(item.productId);
      await product.update({ currentStock: product.currentStock - item.quantity }, { transaction: t });
      await StockMovement.create(
        {
          productId: product.id,
          quantityChanged: item.quantity,
          movementType: 'OUT',
          reason: `Challan ${challan.challanNumber} confirmed`,
          createdBy: req.user.id,
        },
        { transaction: t }
      );
    }

    await challan.update({ status: 'Confirmed' }, { transaction: t });
    return challan;
  });

  const result = await Challan.findByPk(confirmed.id, { include: [ITEM_INCLUDE] });
  return success(res, result);
});

// POST /api/challans/:id/cancel
// Draft -> Cancelled has no stock impact. Confirmed -> Cancelled restocks
// every item with an IN movement, inside a transaction.
const cancelChallan = asyncHandler(async (req, res, next) => {
  const cancelled = await sequelize.transaction(async (t) => {
    const challan = await Challan.findByPk(req.params.id, {
      include: [ITEM_INCLUDE],
      transaction: t,
    });
    if (!challan) {
      throw new ApiError(404, 'Challan not found');
    }
    if (challan.status === 'Cancelled') {
      throw new ApiError(409, 'Challan is already cancelled');
    }

    if (challan.status === 'Confirmed') {
      const productIds = challan.items.map((item) => item.productId);
      const products = await Product.findAll({
        where: { id: productIds },
        transaction: t,
        lock: t.LOCK.UPDATE,
      });
      const productMap = new Map(products.map((p) => [p.id, p]));

      for (const item of challan.items) {
        const product = productMap.get(item.productId);
        await product.update({ currentStock: product.currentStock + item.quantity }, { transaction: t });
        await StockMovement.create(
          {
            productId: product.id,
            quantityChanged: item.quantity,
            movementType: 'IN',
            reason: `Challan ${challan.challanNumber} cancelled — stock reverted`,
            createdBy: req.user.id,
          },
          { transaction: t }
        );
      }
    }

    await challan.update({ status: 'Cancelled' }, { transaction: t });
    return challan;
  });

  const result = await Challan.findByPk(cancelled.id, { include: [ITEM_INCLUDE] });
  return success(res, result);
});

// GET /api/challans/:id/pdf
const downloadPdf = asyncHandler(async (req, res, next) => {
  const challan = await Challan.findByPk(req.params.id, { include: [ITEM_INCLUDE] });
  if (!challan) {
    return next(new ApiError(404, 'Challan not found'));
  }
  streamChallanPdf(challan, res);
});

module.exports = {
  listChallans,
  getChallan,
  createChallan,
  updateChallan,
  confirmChallan,
  cancelChallan,
  downloadPdf,
};

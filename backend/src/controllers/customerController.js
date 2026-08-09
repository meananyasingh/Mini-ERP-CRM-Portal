const { Op } = require('sequelize');
const { Customer, FollowUp } = require('../models');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');
const { success, paginationMeta } = require('../utils/response');

// GET /api/customers?search=&status=&customerType=&page=&limit=
const listCustomers = asyncHandler(async (req, res) => {
  const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
  const limit = Math.max(parseInt(req.query.limit, 10) || 10, 1);
  const { search, status, customerType } = req.query;

  const where = {};
  if (status) where.status = status;
  if (customerType) where.customerType = customerType;
  if (search) {
    where[Op.or] = [
      { name: { [Op.iLike]: `%${search}%` } },
      { mobile: { [Op.iLike]: `%${search}%` } },
      { email: { [Op.iLike]: `%${search}%` } },
      { businessName: { [Op.iLike]: `%${search}%` } },
    ];
  }

  const { count, rows } = await Customer.findAndCountAll({
    where,
    limit,
    offset: (page - 1) * limit,
    order: [['createdAt', 'DESC']],
  });

  return success(res, rows, 200, paginationMeta(page, limit, count));
});

// GET /api/customers/:id — includes recent follow-ups
const getCustomer = asyncHandler(async (req, res, next) => {
  const customer = await Customer.findByPk(req.params.id, {
    include: [
      {
        model: FollowUp,
        as: 'followUps',
        separate: true,
        limit: 5,
        order: [['createdAt', 'DESC']],
      },
    ],
  });
  if (!customer) {
    return next(new ApiError(404, 'Customer not found'));
  }
  return success(res, customer);
});

// POST /api/customers
const createCustomer = asyncHandler(async (req, res) => {
  const customer = await Customer.create({ ...req.body, createdBy: req.user.id });
  return success(res, customer, 201);
});

// PUT /api/customers/:id
const updateCustomer = asyncHandler(async (req, res, next) => {
  const customer = await Customer.findByPk(req.params.id);
  if (!customer) {
    return next(new ApiError(404, 'Customer not found'));
  }
  await customer.update(req.body);
  return success(res, customer);
});

// GET /api/customers/:id/followups
const listFollowUps = asyncHandler(async (req, res, next) => {
  const customer = await Customer.findByPk(req.params.id);
  if (!customer) {
    return next(new ApiError(404, 'Customer not found'));
  }
  const followUps = await FollowUp.findAll({
    where: { customerId: customer.id },
    order: [['createdAt', 'DESC']],
  });
  return success(res, followUps);
});

// POST /api/customers/:id/followups — { note, followUpDate }
const createFollowUp = asyncHandler(async (req, res, next) => {
  const customer = await Customer.findByPk(req.params.id);
  if (!customer) {
    return next(new ApiError(404, 'Customer not found'));
  }

  const { note, followUpDate } = req.body;
  const followUp = await FollowUp.create({
    customerId: customer.id,
    note,
    followUpDate: followUpDate || null,
    createdBy: req.user.id,
  });

  // A scheduled follow-up date rolls forward onto the customer record too.
  if (followUpDate) {
    await customer.update({ nextFollowUpDate: followUpDate });
  }

  return success(res, followUp, 201);
});

module.exports = {
  listCustomers,
  getCustomer,
  createCustomer,
  updateCustomer,
  listFollowUps,
  createFollowUp,
};

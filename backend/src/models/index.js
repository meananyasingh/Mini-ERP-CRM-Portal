const sequelize = require('../config/db');
const User = require('./User');
const Customer = require('./Customer');
const FollowUp = require('./FollowUp');
const Product = require('./Product');
const StockMovement = require('./StockMovement');
const Challan = require('./Challan');
const ChallanItem = require('./ChallanItem');

// --- User relations ---
User.hasMany(Customer, { foreignKey: 'createdBy', as: 'customers' });
Customer.belongsTo(User, { foreignKey: 'createdBy', as: 'creator' });

User.hasMany(FollowUp, { foreignKey: 'createdBy', as: 'followUps' });
FollowUp.belongsTo(User, { foreignKey: 'createdBy', as: 'creator' });

User.hasMany(StockMovement, { foreignKey: 'createdBy', as: 'stockMovements' });
StockMovement.belongsTo(User, { foreignKey: 'createdBy', as: 'creator' });

User.hasMany(Challan, { foreignKey: 'createdBy', as: 'challans' });
Challan.belongsTo(User, { foreignKey: 'createdBy', as: 'creator' });

// --- Customer <-> FollowUp ---
Customer.hasMany(FollowUp, { foreignKey: 'customerId', as: 'followUps' });
FollowUp.belongsTo(Customer, { foreignKey: 'customerId', as: 'customer' });

// --- Customer <-> Challan ---
Customer.hasMany(Challan, { foreignKey: 'customerId', as: 'challans' });
Challan.belongsTo(Customer, { foreignKey: 'customerId', as: 'customer' });

// --- Product <-> StockMovement ---
Product.hasMany(StockMovement, { foreignKey: 'productId', as: 'stockMovements' });
StockMovement.belongsTo(Product, { foreignKey: 'productId', as: 'product' });

// --- Challan <-> ChallanItem ---
Challan.hasMany(ChallanItem, { foreignKey: 'challanId', as: 'items' });
ChallanItem.belongsTo(Challan, { foreignKey: 'challanId', as: 'challan' });

// --- Product <-> ChallanItem ---
Product.hasMany(ChallanItem, { foreignKey: 'productId', as: 'challanItems' });
ChallanItem.belongsTo(Product, { foreignKey: 'productId', as: 'product' });

module.exports = {
  sequelize,
  User,
  Customer,
  FollowUp,
  Product,
  StockMovement,
  Challan,
  ChallanItem,
};

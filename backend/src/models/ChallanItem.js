const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const ChallanItem = sequelize.define(
  'ChallanItem',
  {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    challanId: { type: DataTypes.INTEGER, allowNull: false },
    productId: { type: DataTypes.INTEGER, allowNull: false },
    // { name, sku, unitPrice } captured when the item is added, so historical
    // challans render correctly even if the product changes later.
    productSnapshot: { type: DataTypes.JSONB, allowNull: false },
    quantity: {
      type: DataTypes.INTEGER,
      allowNull: false,
      validate: { min: 1 },
    },
    lineTotal: { type: DataTypes.DECIMAL(10, 2), allowNull: false },
  },
  {
    tableName: 'challan_items',
    timestamps: true,
    updatedAt: false,
  }
);

module.exports = ChallanItem;

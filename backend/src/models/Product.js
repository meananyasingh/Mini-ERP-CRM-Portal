const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const Product = sequelize.define(
  'Product',
  {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    name: { type: DataTypes.STRING, allowNull: false },
    sku: { type: DataTypes.STRING, allowNull: false, unique: true },
    category: { type: DataTypes.STRING, allowNull: true },
    unitPrice: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      validate: { min: 0 },
    },
    // Stock is only ever mutated through stock-adjust or challan confirm/cancel,
    // each guarded by a transaction that prevents it from going negative.
    currentStock: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
      validate: { min: 0 },
    },
    minStockAlert: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
    location: { type: DataTypes.STRING, allowNull: true },
  },
  {
    tableName: 'products',
    timestamps: true,
  }
);

module.exports = Product;

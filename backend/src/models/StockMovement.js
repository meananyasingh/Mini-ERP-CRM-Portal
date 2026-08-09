const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const StockMovement = sequelize.define(
  'StockMovement',
  {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    productId: { type: DataTypes.INTEGER, allowNull: false },
    // Always a positive magnitude; direction is carried by movementType.
    quantityChanged: {
      type: DataTypes.INTEGER,
      allowNull: false,
      validate: { min: 1 },
    },
    movementType: { type: DataTypes.ENUM('IN', 'OUT'), allowNull: false },
    reason: { type: DataTypes.STRING, allowNull: false },
    createdBy: { type: DataTypes.INTEGER, allowNull: true },
  },
  {
    tableName: 'stock_movements',
    timestamps: true,
    updatedAt: false,
  }
);

module.exports = StockMovement;

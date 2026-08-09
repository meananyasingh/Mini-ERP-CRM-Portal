const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const Challan = sequelize.define(
  'Challan',
  {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    // Assigned right after insert, once the id is known (see utils/challanNumber.js).
    challanNumber: { type: DataTypes.STRING, allowNull: true, unique: true },
    customerId: { type: DataTypes.INTEGER, allowNull: false },
    // { name, mobile, businessName, address } captured at creation time.
    customerSnapshot: { type: DataTypes.JSONB, allowNull: false },
    totalQuantity: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
    status: {
      type: DataTypes.ENUM('Draft', 'Confirmed', 'Cancelled'),
      allowNull: false,
      defaultValue: 'Draft',
    },
    createdBy: { type: DataTypes.INTEGER, allowNull: true },
  },
  {
    tableName: 'challans',
    timestamps: true,
  }
);

module.exports = Challan;

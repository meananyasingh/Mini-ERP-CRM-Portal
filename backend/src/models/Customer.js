const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const Customer = sequelize.define(
  'Customer',
  {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    name: { type: DataTypes.STRING, allowNull: false },
    mobile: { type: DataTypes.STRING, allowNull: false },
    email: { type: DataTypes.STRING, allowNull: true, validate: { isEmail: true } },
    businessName: { type: DataTypes.STRING, allowNull: true },
    gstNumber: { type: DataTypes.STRING, allowNull: true },
    customerType: {
      type: DataTypes.ENUM('Retail', 'Wholesale', 'Distributor'),
      allowNull: false,
      defaultValue: 'Retail',
    },
    address: { type: DataTypes.TEXT, allowNull: true },
    status: {
      type: DataTypes.ENUM('Lead', 'Active', 'Inactive'),
      allowNull: false,
      defaultValue: 'Lead',
    },
    nextFollowUpDate: { type: DataTypes.DATEONLY, allowNull: true },
    notes: { type: DataTypes.TEXT, allowNull: true },
    createdBy: { type: DataTypes.INTEGER, allowNull: true },
  },
  {
    tableName: 'customers',
    timestamps: true,
  }
);

module.exports = Customer;

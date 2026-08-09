const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const FollowUp = sequelize.define(
  'FollowUp',
  {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    customerId: { type: DataTypes.INTEGER, allowNull: false },
    note: { type: DataTypes.TEXT, allowNull: false },
    // Next scheduled follow-up date; when set, the controller also syncs it
    // onto Customer.nextFollowUpDate (CONTRACT.md section 4).
    followUpDate: { type: DataTypes.DATEONLY, allowNull: true },
    createdBy: { type: DataTypes.INTEGER, allowNull: true },
  },
  {
    tableName: 'follow_ups',
    timestamps: true,
    updatedAt: false,
  }
);

module.exports = FollowUp;

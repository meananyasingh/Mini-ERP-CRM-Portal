// Standalone seed script — run with `npm run seed`.
// Idempotent: existing rows (matched by email/mobile/sku) are left untouched.
require('dotenv').config();

const bcrypt = require('bcryptjs');
const sequelize = require('./config/db');
const { User, Customer, Product } = require('./models');

const PASSWORD_SALT_ROUNDS = 10;
const DEFAULT_PASSWORD = 'Password@123';

const ROLE_USERS = [
  { name: 'Admin User', email: 'admin@erp.test', role: 'admin' },
  { name: 'Sales User', email: 'sales@erp.test', role: 'sales' },
  { name: 'Warehouse User', email: 'warehouse@erp.test', role: 'warehouse' },
  { name: 'Accounts User', email: 'accounts@erp.test', role: 'accounts' },
];

const SAMPLE_CUSTOMERS = [
  {
    name: 'Rahul Sharma',
    mobile: '9876543210',
    email: 'rahul@example.com',
    businessName: 'Sharma Traders',
    customerType: 'Wholesale',
    status: 'Active',
  },
  {
    name: 'Priya Verma',
    mobile: '9123456780',
    email: 'priya@example.com',
    customerType: 'Retail',
    status: 'Lead',
  },
  {
    name: 'Global Distributors',
    mobile: '9988776655',
    email: 'contact@globaldist.com',
    businessName: 'Global Distributors Pvt Ltd',
    customerType: 'Distributor',
    status: 'Active',
  },
];

const SAMPLE_PRODUCTS = [
  { name: 'Steel Rod 12mm', sku: 'SR-12MM', category: 'Raw Material', unitPrice: 450.0, currentStock: 500, minStockAlert: 50, location: 'Warehouse A' },
  { name: 'Cement Bag 50kg', sku: 'CB-50KG', category: 'Construction', unitPrice: 380.0, currentStock: 20, minStockAlert: 30, location: 'Warehouse B' },
  { name: 'Paint - White 20L', sku: 'PW-20L', category: 'Finishing', unitPrice: 2500.0, currentStock: 15, minStockAlert: 10, location: 'Warehouse A' },
];

async function seedUsers() {
  for (const roleUser of ROLE_USERS) {
    const existing = await User.findOne({ where: { email: roleUser.email } });
    if (existing) {
      console.log(`User already exists, skipping: ${roleUser.email}`);
      continue;
    }
    const passwordHash = await bcrypt.hash(DEFAULT_PASSWORD, PASSWORD_SALT_ROUNDS);
    const created = await User.create({ ...roleUser, passwordHash });
    console.log(`Created user: ${created.email} (${created.role})`);
  }
}

async function seedCustomers(createdBy) {
  for (const customer of SAMPLE_CUSTOMERS) {
    const existing = await Customer.findOne({ where: { mobile: customer.mobile } });
    if (existing) {
      console.log(`Customer already exists, skipping: ${customer.name}`);
      continue;
    }
    await Customer.create({ ...customer, createdBy });
    console.log(`Created customer: ${customer.name}`);
  }
}

async function seedProducts() {
  for (const product of SAMPLE_PRODUCTS) {
    const existing = await Product.findOne({ where: { sku: product.sku } });
    if (existing) {
      console.log(`Product already exists, skipping: ${product.sku}`);
      continue;
    }
    await Product.create(product);
    console.log(`Created product: ${product.sku}`);
  }
}

async function run() {
  try {
    await sequelize.authenticate();
    await sequelize.sync({ alter: true });

    await seedUsers();

    const admin = await User.findOne({ where: { email: 'admin@erp.test' } });
    await seedCustomers(admin.id);
    await seedProducts();

    console.log('Seeding complete.');
    process.exit(0);
  } catch (err) {
    console.error('Seeding failed:', err);
    process.exit(1);
  }
}

run();

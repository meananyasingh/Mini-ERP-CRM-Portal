require('dotenv').config();

const http = require('http');
const app = require('./app');
const sequelize = require('./config/db');
require('./models'); // registers associations before sync

const PORT = process.env.PORT || 4000;

async function start() {
  try {
    await sequelize.authenticate();
    console.log('Database connection established.');

    // This project uses sequelize.sync({ alter: true }) instead of migration
    // files — it's a case-study backend without a migration pipeline, and
    // `alter` (never `force`) keeps existing data intact across restarts
    // while bringing the schema in line with the models.
    await sequelize.sync({ alter: true });
    console.log('Database schema synchronized.');

    http.createServer(app).listen(PORT, () => {
      console.log(`Server listening on port ${PORT}`);
    });
  } catch (err) {
    console.error('Failed to start server:', err.message);
    process.exit(1);
  }
}

start();

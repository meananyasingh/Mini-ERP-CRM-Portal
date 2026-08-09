const { Sequelize } = require('sequelize');

// Single Sequelize instance for the whole app, built from DATABASE_URL.
// The actual connection is only opened when sequelize.authenticate()/sync()
// is called from server.js — requiring this module never talks to the network.
//
// Hosted Postgres providers (Neon, Supabase, Render Postgres) require SSL
// and reject plain connections; a local docker-compose Postgres has no SSL
// configured at all. Rather than hardcoding one or the other, DB_SSL opts
// into SSL — set it to "true" in production/hosted env vars, leave unset
// for local development.
const useSsl = process.env.DB_SSL === 'true';

const sequelize = new Sequelize(process.env.DATABASE_URL, {
  dialect: 'postgres',
  logging: false,
  dialectOptions: useSsl
    ? { ssl: { require: true, rejectUnauthorized: false } }
    : {},
});

module.exports = sequelize;

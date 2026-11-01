/**
 * Knex Configuration - TEMPLATE FOR PHASE 2
 *
 * INSTRUCTIONS:
 * 1. Copy this file to knexfile.js
 * 2. Update database credentials
 * 3. Ensure PostgreSQL is installed and running
 *
 * DO NOT USE YET - This is for Phase 2 only
 */

export default {
  development: {
    client: 'pg',
    connection: {
      host: process.env.DB_HOST || 'localhost',
      port: process.env.DB_PORT || 5432,
      user: process.env.DB_USER || 'postgres',
      password: process.env.DB_PASSWORD || 'postgres',
      database: process.env.DB_NAME || 'reputation_manager_dev'
    },
    migrations: {
      directory: './migrations',
      extension: 'js'
    },
    seeds: {
      directory: './seeds'
    }
  },

  staging: {
    client: 'pg',
    connection: {
      host: process.env.DB_HOST,
      port: process.env.DB_PORT || 5432,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME
    },
    migrations: {
      directory: './migrations',
      extension: 'js'
    }
  },

  production: {
    client: 'pg',
    connection: {
      host: process.env.DB_HOST,
      port: process.env.DB_PORT || 5432,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME,
      ssl: process.env.DB_SSL === 'true'
    },
    migrations: {
      directory: './migrations',
      extension: 'js'
    },
    pool: {
      min: 2,
      max: 10
    }
  }
};

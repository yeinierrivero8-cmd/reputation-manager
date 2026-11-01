/**
 * Knex Configuration for ReputationManager
 *
 * IMPORTANTE: PostgreSQL debe estar instalado y ejecutándose antes de usar esto
 *
 * Development: Conexión local a reputation_manager_dev
 * Staging: Conexión a base de datos staging
 * Production: Conexión a base de datos producción
 */

export default {
  development: {
    client: 'pg',
    connection: {
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT || '5433'),
      user: process.env.DB_USER || 'postgres',
      password: process.env.DB_PASSWORD || 'postgres',
      database: process.env.DB_NAME || 'reputation_manager_dev'
    },
    migrations: {
      directory: './migrations',
      extension: 'js',
      loadExtensions: ['.js']
    },
    seeds: {
      directory: './seeds',
      extension: 'js',
      loadExtensions: ['.js']
    },
    pool: {
      min: 2,
      max: 10,
      acquireTimeoutMillis: 30000,
      idleTimeoutMillis: 30000,
      reapIntervalMillis: 1000
    }
  },

  staging: {
    client: 'pg',
    connection: {
      host: process.env.DB_HOST,
      port: process.env.DB_PORT ? parseInt(process.env.DB_PORT) : 5432,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME || 'reputation_manager_staging'
    },
    migrations: {
      directory: './migrations',
      extension: 'js',
      loadExtensions: ['.js']
    },
    pool: {
      min: 2,
      max: 10
    }
  },

  production: {
    client: 'pg',
    connection: {
      host: process.env.DB_HOST,
      port: process.env.DB_PORT ? parseInt(process.env.DB_PORT) : 5432,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME || 'reputation_manager',
      ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false
    },
    migrations: {
      directory: './migrations',
      extension: 'js',
      loadExtensions: ['.js']
    },
    pool: {
      min: 2,
      max: 20,
      acquireTimeoutMillis: 30000,
      idleTimeoutMillis: 30000,
      reapIntervalMillis: 1000
    }
  }
};

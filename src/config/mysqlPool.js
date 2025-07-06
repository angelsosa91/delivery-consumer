const mysql = require('mysql2/promise');
const dbConfig = require('./database');
const logger = require('../utils/logger');

let pool;

function createPool() {
  if (!pool) {
    logger.info('🧩 Creando pool de conexiones MySQL compartido...');
    pool = mysql.createPool({
      host: dbConfig.host,
      user: dbConfig.user,
      password: dbConfig.password,
      database: dbConfig.database,
      port: dbConfig.port,
      ssl: {
        rejectUnauthorized: false // o usa certificados reales aquí
      },
      timezone: dbConfig.timezone,
      waitForConnections: true,
      connectionLimit: dbConfig.connectionLimit,
      queueLimit: dbConfig.queueLimit
    });
  }
  return pool;
}

module.exports = createPool();

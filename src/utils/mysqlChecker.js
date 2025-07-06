const logger = require('./logger');
const mysql = require('mysql2/promise');
const dbConfig = require('../config/database');

async function verifyDatabaseConnection() {
  logger.info('Verificando conexión a MySQL...');

  try {
    const connection = await mysql.createConnection({
      host: dbConfig.host,
      user: dbConfig.user,
      password: dbConfig.password,
      database: dbConfig.database,
      port: dbConfig.port,
      ssl: {
        rejectUnauthorized: false,
      },
      connectTimeout: 5000,
    });

    await connection.execute('SELECT 1');
    await connection.end();

    logger.info('✅ Conexión a MySQL verificada exitosamente.');
  } catch (error) {
    logger.error('❌ Falló la conexión inicial a MySQL:', error.message);
    throw error;
  }
}

module.exports = verifyDatabaseConnection;

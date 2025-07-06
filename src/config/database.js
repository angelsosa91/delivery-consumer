const logger = require('../utils/logger');

const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  port: parseInt(process.env.DB_PORT || '3306', 10),
  password: process.env.DB_PASS || '',
  database: process.env.DB_NAME || 'ahoraite',
  apiDatabase: process.env.DB_API_NAME || 'ahoraite_api',
  
  // Opciones de conexión
  connectionLimit: 10,
  waitForConnections: true,
  queueLimit: 0,
  connectTimeout: 10000,
  timezone: '+00:00'
};

logger.debug('DB Config (sin credenciales):', {
  host: dbConfig.host,
  database: dbConfig.database,
  apiDatabase: dbConfig.apiDatabase
});

module.exports = dbConfig;
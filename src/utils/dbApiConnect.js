const mysql = require('mysql2/promise');
const baseConfig = require('../config/database');

const getApiConnection = async () => {
  const dbConfig = { ...baseConfig, database: baseConfig.database };
  return await mysql.createConnection(dbConfig);
};

module.exports = getApiConnection;

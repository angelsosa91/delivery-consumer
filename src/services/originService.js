const mysql = require('mysql2/promise');
const logger = require('../utils/logger');
const dbConfig = require('../config/database');

class OriginService {
  constructor() {
    this.pool = mysql.createPool({
      host: dbConfig.host,
      user: dbConfig.user,
      password: dbConfig.password,
      database: dbConfig.database,
      timezone: dbConfig.timezone,
      waitForConnections: true,
      connectionLimit: dbConfig.connectionLimit,
      queueLimit: dbConfig.queueLimit
    });
  }

  async processOrigin(originData) {
    if (!originData || !originData.id) {
      throw new Error('Datos de origen inválidos');
    }
    
    logger.info(`Procesando origen con ID: ${originData.id}`);
    
    let connection;
    try {
      // Obtener conexión del pool
      connection = await this.pool.getConnection();
      logger.debug(`Conexión a base de datos establecida`);
      
      // Iniciar transacción
      await connection.beginTransaction();
      logger.debug(`Transacción iniciada`);

      // Consultar si existe origen sincronizado
      const [rows] = await connection.execute(
        `SELECT name, phone, address, email, latitude, longitude, 
         user_id, status, references, default, sync_id 
         FROM ??.origin 
         WHERE id = ?`,
        [dbConfig.apiDatabase, originData.id]
      );
      
      const origin = rows.length > 0 ? rows[0] : null;
      let originId;
      
      if (origin && origin.sync_id && origin.sync_id > 0) {
        // Actualizar origen existente
        originId = await this.updateExistingOrigin(connection, origin);
      } else {
        // Insertar nuevo origen
        originId = await this.insertNewOrigin(connection, originData.id);
      }

      // Confirmar transacción
      await connection.commit();
      logger.info(`Transacción completada con éxito para el origen ${originData.id}`);
      
      return { success: true, originId };
      
    } catch (error) {
      logger.error(`Error procesando origen ${originData.id}: ${error.message}`);
      
      // Revertir transacción en caso de error
      if (connection) {
        try {
          await connection.rollback();
          logger.info('Transacción revertida');
        } catch (rollbackError) {
          logger.error(`Error al revertir la transacción: ${rollbackError.message}`);
        }
      }
      
      throw error;
    } finally {
      // Liberar la conexión al pool
      if (connection) {
        try {
          await connection.release();
        } catch (err) {
          logger.error(`Error al liberar la conexión: ${err.message}`);
        }
      }
    }
  }

  async updateExistingOrigin(connection, origin) {
    const [resultUpdate] = await connection.execute(
      `UPDATE ??.mp_origen 
       SET nombre = ?, telefono = ?, direccion = ?, correo = ?, 
           latitud = ?, longitud = ?, id_users = ?, estado = ?, 
           referencia = ?, predeterminado = ? 
       WHERE id = ?`,
      [
        dbConfig.database,
        origin.name, 
        origin.phone, 
        origin.address, 
        origin.email, 
        origin.latitude, 
        origin.longitude, 
        origin.user_id, 
        origin.status, 
        origin.references, 
        origin.default,
        origin.sync_id
      ]
    );
    
    if (resultUpdate.affectedRows === 0) {
      throw new Error(`No se encontró el origen con ID ${origin.sync_id} en la base de datos de destino`);
    }
    
    logger.info(`Origen actualizado con ID local: ${origin.sync_id}`);
    return origin.sync_id;
  }

  async insertNewOrigin(connection, originId) {
    // Insertar origen
    const [resultInsert] = await connection.execute(
      `INSERT INTO ??.mp_origen (
        nombre, telefono, direccion, correo, latitud, longitud, 
        id_users, estado, referencia, predeterminado
      ) 
      SELECT 
        name, phone, address, email, latitude, longitude, 
        user_id, status, references, default
      FROM ??.origin 
      WHERE id = ?`,
      [dbConfig.database, dbConfig.apiDatabase, originId]
    );
    
    if (resultInsert.affectedRows === 0) {
      throw new Error(`No se encontró el origen con ID ${originId} en la base de datos de origen`);
    }
    
    const lastId = resultInsert.insertId;
    logger.info(`Origen insertado con ID local: ${lastId}`);
    
    // Actualizar sync_id en la base de datos de origen
    await this.updateSyncId(connection, originId, lastId);
    
    return lastId;
  }

  async updateSyncId(connection, originId, syncId) {
    const [resultUpdate] = await connection.execute(
      `UPDATE ??.origin SET sync_id = ? WHERE id = ?`,
      [dbConfig.apiDatabase, syncId, originId]
    );

    if (resultUpdate.affectedRows === 0) {
      throw new Error(`No se actualizó el origen con ID ${originId} en la base de datos de origen`);
    }

    logger.info(`Sync ID actualizado para origen ${originId}: ${syncId}`);
  }
}

module.exports = new OriginService();
const mysql = require('mysql2/promise');
const logger = require('../utils/logger');
const dbConfig = require('../config/database');

class CustomerService {
  constructor() {
    this.pool = mysql.createPool({
      host: dbConfig.host,
      user: dbConfig.user,
      password: dbConfig.password,
      database: dbConfig.database,
      port: dbConfig.port,
      timezone: dbConfig.timezone,
      waitForConnections: true,
      connectionLimit: dbConfig.connectionLimit,
      queueLimit: dbConfig.queueLimit
    });
  }

  async processCustomer(customerData) {
    if (!customerData || !customerData.id) {
      throw new Error('Datos de cliente inválidos');
    }
    
    logger.info(`Procesando cliente con ID: ${customerData.id}`);
    
    let connection;
    try {
      // Obtener conexión del pool
      connection = await this.pool.getConnection();
      logger.debug(`Conexión a base de datos establecida`);
      
      // Iniciar transacción
      await connection.beginTransaction();
      logger.debug(`Transacción iniciada`);

      // Consultar si existe cliente sincronizado
      const [rows] = await connection.execute(
        `SELECT c.full_name, c.phone, c.address, c.email, c.latitude, c.longitude, c.user_id, c.status, c.references, c.sync_id FROM ${dbConfig.apiDatabase}.customer c WHERE c.id = ?`, [customerData.id]
      );
      
      const cliente = rows.length > 0 ? rows[0] : null;
      
      let customerId;
      
      if (cliente && cliente.sync_id && cliente.sync_id > 0) {
        // Actualizar cliente existente
        customerId = await this.updateExistingCustomer(connection, cliente);
      } else {
        // Insertar nuevo cliente
        customerId = await this.insertNewCustomer(connection, customerData.id);
      }

      // Confirmar transacción
      await connection.commit();
      logger.info(`Transacción completada con éxito para el cliente ${customerData.id}`);
      
      return { success: true, customerId };
      
    } catch (error) {
      logger.error(`Error procesando cliente ${customerData.id}: ${error.message}`);
      
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

  async updateExistingCustomer(connection, cliente) {
    const [resultUpdate] = await connection.execute(
      `UPDATE ${dbConfig.database}.mp_clientes 
       SET nombre = ?, telefono = ?, direccion = ?, correo = ?, 
           latitud = ?, longitud = ?, id_users = ?, estado = ?, referencia = ? 
       WHERE id = ?`,
      [
        cliente.full_name, 
        cliente.phone, 
        cliente.address, 
        cliente.email, 
        cliente.latitude, 
        cliente.longitude, 
        cliente.user_id, 
        cliente.status, 
        cliente.references, 
        cliente.sync_id
      ]
    );
    
    if (resultUpdate.affectedRows === 0) {
      throw new Error(`No se encontró el cliente con ID ${cliente.sync_id} en la base de datos de origen`);
    }
    
    logger.info(`Cliente actualizado con ID local: ${cliente.sync_id}`);
    return cliente.sync_id;
  }

  async insertNewCustomer(connection, customerId) {
    // Insertar cliente
    const [resultInsert] = await connection.execute(
      `INSERT INTO ${dbConfig.database}.mp_clientes (
        nombre, telefono, direccion, correo, latitud, longitud, id_users, estado, referencia
      ) 
      SELECT 
        c.full_name, c.phone, c.address, c.email, c.latitude, c.longitude, c.user_id, c.status, c.references
      FROM ${dbConfig.apiDatabase}.customer c
      WHERE id = ?`,
      [customerId]
    );
    
    if (resultInsert.affectedRows === 0) {
      throw new Error(`No se encontró el cliente con ID ${customerId} en la base de datos de origen`);
    }
    
    const lastId = resultInsert.insertId;
    logger.info(`Cliente insertado con ID local: ${lastId}`);
    
    // Actualizar sync_id en la base de datos de origen
    await this.updateSyncId(connection, customerId, lastId);
    
    return lastId;
  }

  async updateSyncId(connection, customerId, syncId) {
    const [resultUpdate] = await connection.execute(
      `UPDATE ${dbConfig.apiDatabase}.customer SET sync_id = ? WHERE id = ?`,
      [syncId, customerId]
    );

    if (resultUpdate.affectedRows === 0) {
      throw new Error(`No se actualizó el cliente con ID ${customerId} en la base de datos de origen`);
    }

    logger.info(`Sync ID actualizado para cliente ${customerId}: ${syncId}`);
  }
}

module.exports = new CustomerService();
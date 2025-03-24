const mysql = require('mysql2/promise');
const logger = require('../utils/logger');
const dbConfig = require('../config/database');

class OrderService {
  // Procesar un pedido recibido desde la cola
  async processOrder(orderData) {
    if (!orderData || !orderData.id) {
      throw new Error('Datos de pedido inválidos');
    }
    
    logger.info(`Procesando pedido con ID: ${orderData.id}`);
    
    let connection;
    try {
      // Crear conexión a la base de datos
      connection = await mysql.createConnection({
        host: dbConfig.host,
        user: dbConfig.user,
        password: dbConfig.password,
        database: dbConfig.database,
        timezone: dbConfig.timezone
      });
      
      logger.debug(`Conexión a base de datos establecida`);
      
      // Iniciar transacción
      await connection.beginTransaction();
      logger.debug(`Transacción iniciada`);
      
      // Insertar pedido
      const [resultInsert] = await connection.execute(
        `INSERT INTO ${dbConfig.database}.pedidos (
          nombreReceptor, telefonoReceptor, descripcionEnvio, formaPago, emisorTelefono, 
          idUser, distancia, monto, latitudDesde, longitudDesde, latitudHasta, longitudHasta, 
          tiempo, idaYvuelta, factura, exenta, factura_ruc, factura_razonsocial, medio, 
          tipoServicio, fechaProgramada, tipo_pedido, depositoBilletera, depositoBancario, 
          envio_empresa, categoria_vehiculo
        ) 
        SELECT 
          receiver_name, receiver_phone, description, payment_method, sender_phone, 
          user_id, distance, amount, latitude_from, longitude_from, latitude_to, longitude_to, 
          delivery_time, with_return, invoice, invoice_exempt, invoice_doc, invoice_name, 
          'WEB', service_type, scheduled_date, order_type, wallet, bank, 1, 'MOTOCICLETA'
        FROM ${dbConfig.apiDatabase}.orders 
        WHERE id = ?`,
        [orderData.id]
      );
      
      if (resultInsert.affectedRows === 0) {
        throw new Error(`No se encontró el pedido con ID ${orderData.id} en la base de datos de origen`);
      }
      
      const lastId = resultInsert.insertId;
      logger.info(`Pedido insertado con ID local: ${lastId}`);
      
      // Insertar referencias del pedido
      try {
        const [resultRef] = await connection.execute(
          `INSERT INTO ${dbConfig.database}.pedidos_referencias (id_pedidos, nro_doc, estado) 
          SELECT ?, document_number, status 
          FROM ${dbConfig.apiDatabase}.orders_references 
          WHERE order_id = ?`,
          [lastId, orderData.id]
        );
        
        logger.info(`Referencias insertadas: ${resultRef.affectedRows}`);
      } catch (refError) {
        logger.warn(`No se pudieron insertar referencias: ${refError.message}`);
        // Continuamos con el proceso aunque fallen las referencias
      }
      
      // Confirmar transacción
      await connection.commit();
      logger.info(`Transacción completada con éxito para el pedido ${orderData.id}`);
      
      return { success: true, orderId: lastId };
      
    } catch (error) {
      logger.error(`Error procesando pedido ${orderData.id}: ${error.message}`);
      
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
      // Cerrar la conexión a la base de datos
      if (connection) {
        try {
          await connection.end();
        } catch (err) {
          logger.error(`Error al cerrar la conexión: ${err.message}`);
        }
      }
    }
  }
}

module.exports = new OrderService();
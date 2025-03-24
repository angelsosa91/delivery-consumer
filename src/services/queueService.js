const amqp = require('amqplib');
const logger = require('../utils/logger');
const config = require('../config/rabbitmq');

// Clase para gestionar la conexión y operaciones con RabbitMQ
class QueueService {
  constructor() {
    this.connection = null;
    this.channel = null;
    this.connected = false;
    this.connecting = false;
  }

  // Conectar con RabbitMQ
  async connect() {
    if (this.connected || this.connecting) return;
    
    this.connecting = true;
    
    try {
      logger.info(`Conectando a RabbitMQ en ${config.host}:${config.port}...`);
      
      this.connection = await amqp.connect({
        hostname: config.host,
        port: config.port,
        username: config.user,
        password: config.pass,
        heartbeat: config.options.heartbeat,
        timeout: config.options.connection_timeout
      });
      
      this.connection.on('error', err => {
        logger.error('Error en la conexión RabbitMQ:', err.message);
        this.connected = false;
        this.reconnect();
      });
      
      this.connection.on('close', () => {
        logger.warn('Conexión a RabbitMQ cerrada');
        this.connected = false;
        this.reconnect();
      });
      
      this.channel = await this.connection.createChannel();
      await this.channel.assertQueue(config.queue, { durable: true });
      await this.channel.prefetch(1);
      
      this.connected = true;
      this.connecting = false;
      
      logger.info('Conexión exitosa a RabbitMQ');
      return this.channel;
      
    } catch (error) {
      this.connected = false;
      this.connecting = false;
      logger.error('Error conectando a RabbitMQ:', error.message);
      this.reconnect();
      throw error;
    }
  }

  // Reconectar automáticamente
  reconnect() {
    if (!this.connected && !this.connecting) {
      logger.info('Intentando reconectar a RabbitMQ en 10 segundos...');
      setTimeout(() => this.connect(), 10000);
    }
  }

  // Consumir mensajes
  async consume(callback) {
    if (!this.connected) {
      await this.connect();
    }
    
    logger.info(`Esperando mensajes en la cola '${config.queue}'...`);
    
    return this.channel.consume(config.queue, async (msg) => {
      if (msg) {
        try {
          const messageContent = msg.content.toString();
          const data = JSON.parse(messageContent);
          
          logger.info(`Mensaje recibido: ${JSON.stringify(data)}`);
          
          await callback(data);
          this.channel.ack(msg);
          
        } catch (error) {
          logger.error('Error procesando mensaje:', error);
          
          // Rechazar mensaje con requeue después de un retraso
          setTimeout(() => {
            try {
              this.channel.nack(msg, false, true);
            } catch (err) {
              logger.error('Error al rechazar mensaje:', err);
            }
          }, 5000);
        }
      }
    });
  }

  // Cerrar conexiones
  async close() {
    try {
      if (this.channel) {
        await this.channel.close();
      }
      if (this.connection) {
        await this.connection.close();
      }
      this.connected = false;
      logger.info('Conexión a RabbitMQ cerrada correctamente');
    } catch (error) {
      logger.error('Error al cerrar la conexión RabbitMQ:', error);
    }
  }
}

module.exports = new QueueService();
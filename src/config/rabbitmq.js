const logger = require('../utils/logger');

const rabbitmqConfig = {
  host: process.env.RABBITMQ_HOST || 'localhost',
  port: parseInt(process.env.RABBITMQ_PORT || '5672', 10),
  user: process.env.RABBITMQ_USER || 'guest',
  pass: process.env.RABBITMQ_PASS || 'guest',
  queue: process.env.RABBITMQ_QUEUE || 'orders_queue',
  
  // Opciones de conexión
  options: {
    heartbeat: 60,
    connection_timeout: 10000
  }
};

logger.debug('RabbitMQ Config (sin credenciales):', {
  host: rabbitmqConfig.host,
  port: rabbitmqConfig.port,
  queue: rabbitmqConfig.queue
});

module.exports = rabbitmqConfig;
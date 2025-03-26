require('dotenv').config();
const path = require('path');
const fs = require('fs');
const queueService = require('./src/services/queueService');
const orderService = require('./src/services/orderService');
const customerService = require('./src/services/customerService');
const originService = require('./src/services/originService');
const logger = require('./src/utils/logger');

// Asegurarse de que exista el directorio de logs
const logsDir = path.join(__dirname, 'logs');
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir);
}

// Función principal
async function main() {
  try {
    logger.info('🚀 Iniciando los consumidor de RabbitMQ para las colas');
    
    // Iniciar consumidor para pedidos
    await queueService.consumeQueue('order_queue', async (orderData) => {
      await orderService.processOrder(orderData);
    });

    // Iniciar consumidor para clientes
    await queueService.consumeQueue('customer_queue', async (customerData) => {
      await customerService.processCustomer(customerData);
    });

    // Iniciar consumidor para orígenes
    await queueService.consumeQueue('origin_queue', async (originData) => {
      await originService.processOrigin(originData);
    });
    
    logger.info('👂 Consumidores activos y esperando mensajes...');
    
  } catch (error) {
    logger.error('Error al iniciar los consumidores:', error);
    process.exit(1);
  }
}

// Iniciar aplicación
main();

// Manejar señales para cerrar limpiamente
process.on('SIGINT', async () => {
  logger.info('Recibida señal SIGINT, cerrando conexiones...');
  await queueService.close();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  logger.info('Recibida señal SIGTERM, cerrando conexiones...');
  await queueService.close();
  process.exit(0);
});

// Manejo de errores no capturados
process.on('uncaughtException', (error) => {
  logger.error('Error no capturado:', error);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  logger.error('Promesa rechazada no manejada:', reason);
});

require('dotenv').config();
const path = require('path');
const fs = require('fs');
const queueService = require('./src/services/queueService');
const orderService = require('./src/services/orderService');
const logger = require('./src/utils/logger');

// Asegurarse de que exista el directorio de logs
const logsDir = path.join(__dirname, 'logs');
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir);
}

// Función principal
async function main() {
  try {
    logger.info('🚀 Iniciando consumidor de RabbitMQ para pedidos');
    
    // Conectar a RabbitMQ
    await queueService.connect();
    
    // Consumir mensajes
    await queueService.consume(async (data) => {
      try {
        await orderService.processOrder(data);
        logger.info(`✅ Pedido ${data.id} procesado correctamente`);
      } catch (error) {
        logger.error(`❌ Error al procesar pedido ${data.id}: ${error.message}`);
        throw error; // Propagar el error para que se reintente el mensaje
      }
    });
    
    logger.info('👂 Consumidor activo y esperando mensajes...');
    
  } catch (error) {
    logger.error('Error fatal en el consumidor:', error);
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
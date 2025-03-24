FROM node:18-alpine

# Crear directorio de la aplicación
WORKDIR /usr/src/app

# Instalar dependencias
COPY package*.json ./
RUN npm ci --only=production

# Crear directorio de logs y establecer permisos
RUN mkdir -p logs && chmod -R 755 logs

# Copiar código fuente
COPY . .

# Establecer node_env a producción
ENV NODE_ENV=production

# Iniciar la aplicación
CMD ["node", "consumer.js"]
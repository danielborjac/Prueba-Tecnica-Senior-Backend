FROM node:22-alpine

WORKDIR /usr/src/app

# Copiar archivos de dependencias
COPY package*.json ./

# Instalar dependencias (incluyendo dev para nodemon)
RUN npm install

# Copiar código fuente
COPY . .

# Exponer puerto
EXPOSE 3002

# Variables de entorno por defecto
ENV NODE_ENV=development
ENV PORT=3002

# Comando de inicio (se puede override en docker-compose)
CMD ["npm", "run", "dev"]
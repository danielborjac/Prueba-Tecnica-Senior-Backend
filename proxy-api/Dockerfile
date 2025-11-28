FROM node:22-alpine

WORKDIR /usr/src/app

# Copiar package.json
COPY package*.json ./

# Instalar dependencias
RUN npm install

# Copiar código
COPY . .

# Exponer puerto
EXPOSE 3000

ENV NODE_ENV=development
ENV PORT=3000

CMD ["npm", "start"]
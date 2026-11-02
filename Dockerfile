FROM node:18-alpine

WORKDIR /app

COPY server/package*.json ./

RUN npm ci --only=production

COPY server/src ./src
COPY server/migrations ./migrations
COPY server/knexfile.js ./
COPY server/.env.production ./

EXPOSE 5005

CMD ["node", "src/index.js"]

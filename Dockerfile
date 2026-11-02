FROM node:18-alpine

WORKDIR /app

COPY server/package*.json ./

RUN npm ci --only=production

COPY server/src ./src
COPY server/migrations ./migrations
COPY server/knexfile.js ./

# Set fallback environment variables if not provided by Railway
ENV NODE_ENV=production
ENV PORT=5005
ENV DB_HOST=postgres.railway.internal
ENV DB_PORT=5432
ENV DB_NAME=railway

EXPOSE 5005

CMD ["node", "src/index.js"]

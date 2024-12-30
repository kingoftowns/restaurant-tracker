FROM node:18-alpine as builder

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY src/ ./src
COPY public/ ./public
COPY routes/ ./routes
COPY models/ ./models
COPY tailwind.config.js ./
COPY server.js ./

RUN npm run build

FROM node:18-alpine
WORKDIR /app
COPY --from=builder /app/build ./build
COPY --from=builder /app/server.js ./
COPY --from=builder /app/routes ./routes
COPY --from=builder /app/models ./models
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package*.json ./

EXPOSE 5001
CMD ["node", "server.js"]
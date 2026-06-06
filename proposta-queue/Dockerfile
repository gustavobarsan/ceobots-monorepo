# Build stage
FROM node:20-alpine AS builder

WORKDIR /usr/src/app

COPY package*.json ./
COPY proposta-queue/package*.json ./proposta-queue/

RUN npm ci --workspace=proposta-queue

COPY proposta-queue/ ./proposta-queue/

RUN npm run build --workspace=proposta-queue

# Production stage
FROM node:20-alpine

WORKDIR /usr/src/app

COPY package*.json ./
COPY proposta-queue/package*.json ./proposta-queue/

RUN npm ci --omit=dev --workspace=proposta-queue

COPY --from=builder /usr/src/app/proposta-queue/dist ./proposta-queue/dist

EXPOSE 3000

CMD ["node", "proposta-queue/dist/main"]

# Build stage
FROM node:20-bookworm AS builder

WORKDIR /usr/src/app

COPY package*.json ./
COPY rpa-imp-c6/package*.json ./rpa-imp-c6/

RUN npm ci --workspace=rpa-imp-c6

COPY rpa-imp-c6/ ./rpa-imp-c6/

RUN npm run build --workspace=rpa-imp-c6

# Production stage
FROM mcr.microsoft.com/playwright:v1.49.0-noble

WORKDIR /usr/src/app

COPY package*.json ./
COPY rpa-imp-c6/package*.json ./rpa-imp-c6/

RUN npm ci --omit=dev --workspace=rpa-imp-c6

COPY --from=builder /usr/src/app/rpa-imp-c6/dist ./rpa-imp-c6/dist

EXPOSE 3001

ENV PLAYWRIGHT_BROWSERS_PATH=/ms-playwright
ENV PORT=3001

CMD ["node", "rpa-imp-c6/dist/main"]

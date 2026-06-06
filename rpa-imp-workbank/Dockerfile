# Build stage
FROM node:20-bookworm AS builder

WORKDIR /usr/src/app

COPY package*.json ./
COPY rpa-imp-workbank/package*.json ./rpa-imp-workbank/

RUN npm ci --workspace=rpa-imp-workbank

COPY rpa-imp-workbank/ ./rpa-imp-workbank/

RUN npm run build --workspace=rpa-imp-workbank

# Production stage
FROM mcr.microsoft.com/playwright:v1.49.0-noble

WORKDIR /usr/src/app

COPY package*.json ./
COPY rpa-imp-workbank/package*.json ./rpa-imp-workbank/

RUN npm ci --omit=dev --workspace=rpa-imp-workbank

COPY --from=builder /usr/src/app/rpa-imp-workbank/dist ./rpa-imp-workbank/dist

EXPOSE 3002

ENV PLAYWRIGHT_BROWSERS_PATH=/ms-playwright
ENV PORT=3002

CMD ["node", "rpa-imp-workbank/dist/main"]

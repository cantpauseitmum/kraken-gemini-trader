# Build Stage
FROM node:20-alpine AS builder

WORKDIR /app

# Copy dependency configs
COPY package.json package-lock.json* ./
RUN npm install

# Copy source code
COPY . .

# Build Vite frontend
RUN npm run build

# Production Stage
FROM node:20-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000

COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/server ./server
COPY --from=builder /app/tsconfig.json ./tsconfig.json

# Persistent data volume
VOLUME ["/app/data"]

EXPOSE 3000 3001

CMD ["npx", "tsx", "server/index.ts"]

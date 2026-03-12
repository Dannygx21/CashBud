FROM node:20-alpine

WORKDIR /app

# Install deps (package.json lives at project root)
COPY package*.json ./
RUN npm ci --omit=dev

# Copy source
COPY api/  ./api/
COPY db/   ./db/
COPY seed/ ./seed/

ENV NODE_ENV=production

EXPOSE 3001

CMD ["node", "api/server.cjs"]

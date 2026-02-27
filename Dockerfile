FROM node:18-alpine

# Build tools needed for native modules (better-sqlite3)
RUN apk add --no-cache python3 make g++

WORKDIR /app

# Copy package files first (for layer caching)
COPY backend/package.json backend/package-lock.json* ./backend/

# Install dependencies INSIDE the container (compiles native modules for Linux)
RUN cd backend && npm install --production

# Copy backend source (node_modules excluded via .dockerignore)
COPY backend/ ./backend/

# Copy frontend
COPY frontend/ ./frontend/

# Create data and backup dirs
RUN mkdir -p /app/data /app/backup

# Expose port
EXPOSE 3000

# Environment
ENV NODE_ENV=production
ENV PORT=3000
ENV DATA_DIR=/app/data
ENV BACKUP_DIR=/app/backup

# Start
CMD ["node", "backend/server.js"]

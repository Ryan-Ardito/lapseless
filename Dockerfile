# Stage 1: Install all dependencies
FROM oven/bun:1 AS deps
WORKDIR /app

# Install root deps (Vite, React, etc.)
COPY package.json bun.lock ./
RUN bun install --frozen-lockfile

# Install server deps with bun
COPY server/package.json server/bun.lock* server/
RUN cd server && bun install --frozen-lockfile

# Stage 2: Build frontend
FROM deps AS build
WORKDIR /app
ARG VITE_API_URL
ENV VITE_API_URL=${VITE_API_URL}
COPY . .
RUN bun run build

# Stage 3: Production runtime
FROM oven/bun:1 AS runtime
WORKDIR /app

# Copy server source and install production deps
COPY server/ server/
RUN cd server && bun install --frozen-lockfile --production

# Copy built frontend
COPY --from=build /app/dist dist/

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD bun -e "fetch('http://localhost:3000/health').then(r => process.exit(r.ok ? 0 : 1)).catch(() => process.exit(1))"

CMD ["sh", "-c", "cd server && bun run src/db/migrate.ts && bun run src/index.ts"]

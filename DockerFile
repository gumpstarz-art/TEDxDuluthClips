FROM oven/bun:1.1 as base
WORKDIR /app

# Copy dependency definitions and install
COPY package.json bun.lock* ./
RUN bun install

# Copy source code and build production assets
COPY . .
RUN bun run build || true

# Expose app port
EXPOSE 3000
ENV PORT=3000

CMD ["bun", "run", "server.ts"]

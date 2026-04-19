FROM oven/bun:1

WORKDIR /app

COPY package.json bun.lock ./
RUN bun install --frozen-lockfile
RUN bun run drizzle:push

COPY . .

# Keep the SQLite target directory available even before the bind mount exists.
RUN mkdir -p /app/.data

ENV NODE_ENV=production


CMD ["bun", "run", "start"]

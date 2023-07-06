FROM node:20.3-alpine

# Setup workspace
WORKDIR /app
ENV DATABASE_URL=postgresql://postgres:postgres@pgsql:5432/postgres?schema=public

# Copy runtime files
COPY ./config/config.jsonc ./config/config.jsonc
COPY docker_run.sh .
COPY locales ./locales

# Prisma builds
COPY prisma ./prisma
RUN npx prisma generate --schema=./prisma/docker.prisma

# Install dependencies
COPY package.json .
RUN npm install

# Transpile the source
COPY tsconfig.json .
COPY src ./src
RUN npm run build

# Start the server
ENTRYPOINT ["./docker_run.sh"]
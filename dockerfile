FROM node:20.3-alpine

# Setup workspace
WORKDIR /app
ENV DATABASE_URL=postgresql://postgres:postgres@pgsql:5432/postgres?schema=public

# Copy runtime files
COPY ./config/ ./temp_config
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

# Setup Bash
RUN apk add --no-cache bash
RUN chmod +x ./docker_run.sh

# Start the server
ENTRYPOINT ["./docker_run.sh"]
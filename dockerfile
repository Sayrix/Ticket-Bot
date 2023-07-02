FROM node:20.3-alpine

# Setup workspace
WORKDIR /app
ENV DATABASE_URL="postgresql://postgres:postgres@db:5432/postgres?schema=public"

# Install dependencies
COPY package.json .
RUN npm install

# Update the database with docker.prisma
COPY prisma ./prisma
RUN npx prisma db push --schema=./prisma/schema.prisma

# Transpile the source
COPY tsconfig.json .
COPY src ./src
COPY ./config/config.jsonc ./config/config.jsonc
RUN npm run build

# Start the server
CMD ["npm", "start"]
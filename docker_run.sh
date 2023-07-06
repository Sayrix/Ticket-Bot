#!/bin/bash

# Move config file is found during build process
if [ -f "./temp_config.jsonc" ]; then
    mv ./temp_config.jsonc ./config/config.jsonc
fi

# Exit if config not found
if [ ! -f "./config/config.jsonc" ]; then
    echo "Config file not found. Exiting..."
    exit 1
fi

npx prisma db push --schema=./prisma/docker.prisma
npm run start
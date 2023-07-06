#!/bin/bash

# Move config file is found during build process
if [ -f "./temp_config.jsonc" ]; then
    mv ./temp_config.jsonc ./config/config.jsonc
fi

npx prisma db push --schema=./prisma/docker.prisma
npm run start
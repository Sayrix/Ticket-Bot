#!/bin/bash

# Setup the config files
if [ ! -f "./config/config.json" ]; then
    if [ -f "./temp_config/config.jsonc" ]; then
        # Config already setup by the user
        echo "Pre-build config detected, moving to config folder...";
        mv ./temp_config/config.jsonc ./config/config.jsonc
    else
        # Config not setup by the user
        echo "Config not detected, creating config...";
        echo "Make sure to edit the config file in /opt/ticket-bot/config/config.jsonc before starting the bot again.";
        mv ./temp_config/config.example.jsonc ./config/config.jsonc
        exit 1;
    fi
fi

npx prisma db push --schema=./prisma/docker.prisma
npm run start
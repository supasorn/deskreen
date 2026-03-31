#!/bin/bash

# Script to run Deskreen with the remote URL configured

# Load .env file if it exists
if [ -f .env ]; then
    export $(cat .env | grep -v '^#' | xargs)
    echo "✓ Loaded .env file"
    echo "  DESKREEN_REMOTE_URL=${DESKREEN_REMOTE_URL}"
else
    echo "⚠ No .env file found. Creating one with your URL..."
    echo "DESKREEN_REMOTE_URL=https://www.supasorn.com/dr.php" > .env
    export DESKREEN_REMOTE_URL=https://www.supasorn.com/dr.php
    echo "✓ Created .env file"
fi

echo ""
echo "Starting Deskreen..."
echo "When Deskreen starts, it will automatically send the connection URL to:"
echo "  → ${DESKREEN_REMOTE_URL}"
echo ""
echo "You can then access your Deskreen session by visiting:"
echo "  → https://www.supasorn.com/dr.php"
echo ""

npm run dev

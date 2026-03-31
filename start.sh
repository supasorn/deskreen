#!/bin/bash

# Simple script to start Deskreen with dr.php integration
# (Run 'npm run build' once first if you made code changes)

# Load .env file
if [ -f .env ]; then
    export $(cat .env | grep -v '^#' | xargs)
    echo "✓ DESKREEN_REMOTE_URL=${DESKREEN_REMOTE_URL}"
else
    export DESKREEN_REMOTE_URL=https://www.supasorn.com/dr.php
    echo "DESKREEN_REMOTE_URL=https://www.supasorn.com/dr.php" > .env
    echo "✓ Created .env"
fi

echo ""
echo "Starting Deskreen..."
echo "Your sessions will be accessible at: https://www.supasorn.com/dr.php"
echo ""

# Export and start
export DESKREEN_REMOTE_URL
pnpm start

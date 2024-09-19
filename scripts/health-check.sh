#!/bin/bash

HEALTH_CHECK_URL="http://localhost:3111/health"
MAX_ATTEMPTS=60
INTERVAL=1

attempt=0
while [ $attempt -lt $MAX_ATTEMPTS ]; do
    response=$(curl -s -o /dev/null -w "%{http_code}" $HEALTH_CHECK_URL)
    if [ $response -eq 200 ]; then
        echo "🚀 relayer ready in $attempt seconds"
        exit 0
    fi

    echo "waiting for relayer starting up... ($attempt\s)"

    sleep $INTERVAL
    attempt=$((attempt+1))
done

echo "❌ relayer failed to start in $MAX_ATTEMPTS seconds"
exit 1
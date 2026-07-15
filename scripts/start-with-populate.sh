#!/bin/sh

echo "Starting Vendure backend..."
node dist/index.js &

sleep 15

echo "Running data population..."
node scripts/populate-data.js

wait

#!/bin/sh

echo "Initializing default tax zone..."
npx ts-node src/init-default-tax-zone.ts

echo "Starting Vendure server..."
npm start
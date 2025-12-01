#!/usr/bin/env bash
set -euo pipefail

echo "=== NestJS Backend Deployment Script ==="

echo "1) Clean install, prisma generate, build..."
cd ..

npm ci
npx prisma generate
npm run build

echo "2) Create deploy bundle..."
rm -rf deploy && mkdir deploy
cp package.json package-lock.json deploy/
cp -r dist prisma deploy/
# cp environments/production/ecosystem.config.js deploy/
# cp environments/production/apache.conf deploy/
# [ -f ".env.production" ] && cp .env.production deploy/.env
cp -r node_modules deploy/

echo "3) Install only production deps inside deploy/ ..."
( cd deploy && npm prune --omit=dev )

echo "4) Zip -> backend-deploy.zip ..."
rm -f backend-deploy.zip
# zip -r backend-deploy.zip deploy

echo "Done. Upload backend-deploy.zip to cPanel ~/apps/backend and Extract there."

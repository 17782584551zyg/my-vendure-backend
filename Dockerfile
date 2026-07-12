# Build timestamp: 2026-07-09
FROM node:20-alpine AS builder

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci --legacy-peer-deps

COPY . .
RUN npm run build
RUN cd admin-ui && ../node_modules/.bin/ng build --configuration production

FROM node:20-alpine AS production

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci --legacy-peer-deps --only=production

COPY --from=builder /app/dist ./dist
COPY --from=builder /app/static ./static
COPY --from=builder /app/admin-ui/dist ./admin-ui/dist

RUN mkdir -p /app/static/assets && chown -R node:node /app/static

USER node

EXPOSE 3002

CMD ["npm", "start"]
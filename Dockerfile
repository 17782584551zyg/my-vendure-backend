# Build timestamp: 2026-07-09
FROM node:20-alpine AS builder

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY . .
RUN npm run build

RUN npx vendure build

FROM node:20-alpine AS production

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci --omit=dev

COPY --from=builder /app/dist ./dist
COPY --from=builder /app/static ./static
COPY --from=builder /app/admin-ui/dist ./admin-ui/dist

EXPOSE 3002

CMD ["npm", "start"]
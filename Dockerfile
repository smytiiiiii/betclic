# syntax=docker/dockerfile:1
FROM node:22-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json prisma.config.ts ./
COPY prisma ./prisma
RUN npm ci

FROM node:22-alpine AS build
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
ENV NEXT_TELEMETRY_DISABLED=1
RUN npm run db:generate && npm run build

FROM node:22-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production NEXT_TELEMETRY_DISABLED=1 PORT=3000 HOSTNAME=0.0.0.0
RUN addgroup -S kairos && adduser -S kairos -G kairos && mkdir -p /app/.data && chown kairos:kairos /app/.data
COPY --from=build --chown=kairos:kairos /app/.next/standalone ./
COPY --from=build --chown=kairos:kairos /app/.next/static ./.next/static
COPY --from=build --chown=kairos:kairos /app/public ./public
USER kairos
EXPOSE 3000
CMD ["node", "server.js"]

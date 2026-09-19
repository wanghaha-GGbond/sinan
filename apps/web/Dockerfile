FROM node:22-bookworm-slim AS dependencies
WORKDIR /app

COPY package.json package-lock.json ./
COPY apps/web/package.json apps/web/package.json
COPY apps/ios/package.json apps/ios/package.json
COPY packages/shared/package.json packages/shared/package.json
RUN npm ci

FROM node:22-bookworm-slim AS builder
WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1
ARG NEXT_PUBLIC_APP_URL=https://sinanapp.cn
ARG NEXT_PUBLIC_APP_ENV=production
ARG NEXT_PUBLIC_API_ENABLED=true
ARG LAUNCH_SCOPE_ONLY=true
ARG NEXT_PUBLIC_PULSE_ENABLED=false
ARG NEXT_PUBLIC_ICP_FILING_NUMBER=
ENV NEXT_PUBLIC_APP_URL=$NEXT_PUBLIC_APP_URL \
    NEXT_PUBLIC_APP_ENV=$NEXT_PUBLIC_APP_ENV \
    NEXT_PUBLIC_API_ENABLED=$NEXT_PUBLIC_API_ENABLED \
    LAUNCH_SCOPE_ONLY=$LAUNCH_SCOPE_ONLY \
    NEXT_PUBLIC_PULSE_ENABLED=$NEXT_PUBLIC_PULSE_ENABLED \
    NEXT_PUBLIC_ICP_FILING_NUMBER=$NEXT_PUBLIC_ICP_FILING_NUMBER
COPY --from=dependencies /app/node_modules ./node_modules
COPY . .
RUN npm run build --workspace=@sinan/web

FROM node:22-bookworm-slim AS migrator-dependencies
WORKDIR /app

# The migrator does not need Expo, React Native, or the Next.js build toolchain.
# Keep only workspace production dependencies and add the pinned Drizzle CLI.
COPY package.json package-lock.json ./
COPY apps/web/package.json apps/web/package.json
COPY apps/ios/package.json apps/ios/package.json
COPY packages/shared/package.json packages/shared/package.json
RUN npm ci --omit=dev --ignore-scripts \
  && npm install --no-save --omit=dev --ignore-scripts drizzle-kit@0.31.10

FROM node:22-bookworm-slim AS migrator
WORKDIR /app
ENV NODE_ENV=production

COPY --from=migrator-dependencies /app/node_modules ./node_modules
COPY package.json package-lock.json ./
COPY apps/web/package.json apps/web/package.json
COPY apps/ios/package.json apps/ios/package.json
COPY packages/shared/package.json packages/shared/package.json
COPY apps/web/drizzle.config.ts apps/web/drizzle.config.ts
COPY apps/web/src/db/migrations apps/web/src/db/migrations

CMD ["npm", "run", "db:migrate", "--workspace=@sinan/web"]

FROM node:22-bookworm-slim AS runner
WORKDIR /app
ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    HOSTNAME=0.0.0.0 \
    PORT=3000

RUN groupadd --system --gid 1001 nodejs \
  && useradd --system --uid 1001 --gid nodejs nextjs

COPY --from=builder --chown=nextjs:nodejs /app/apps/web/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/apps/web/public ./apps/web/public
COPY --from=builder --chown=nextjs:nodejs /app/apps/web/.next/static ./apps/web/.next/static

USER nextjs
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:3000/api/health/live').then(r=>{if(!r.ok)process.exit(1)}).catch(()=>process.exit(1))"
CMD ["node", "apps/web/server.js"]

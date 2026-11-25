# RentARide: one image for the web app, the worker and migrations.
#   docker build --build-arg NEXT_SERVER_ACTIONS_ENCRYPTION_KEY=... -t rentaride .
# Debian (glibc) rather than Alpine: sharp and argon2 ship prebuilt binaries for it.

FROM node:24-bookworm-slim AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --no-audit --no-fund

FROM node:24-bookworm-slim AS build
WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1
# Keeps Server Action IDs stable across builds and instances (base64, 32 bytes).
ARG NEXT_SERVER_ACTIONS_ENCRYPTION_KEY
ENV NEXT_SERVER_ACTIONS_ENCRYPTION_KEY=$NEXT_SERVER_ACTIONS_ENCRYPTION_KEY
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build

FROM node:24-bookworm-slim AS runner
WORKDIR /app
ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    PORT=3000 \
    HOSTNAME=0.0.0.0
# tsx runs the worker and migrations, so the full dependency tree stays.
COPY --from=build --chown=node:node /app ./
USER node
EXPOSE 3000
# The app answers /api/health with 200 only when Postgres and Redis respond.
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:3000/api/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"
CMD ["npm", "run", "start", "--", "-p", "3000"]

# syntax=docker/dockerfile:1
#
# Modern POS frontend (Next.js standalone output) - multi-stage production image
#
# NEXT_PUBLIC_* values are inlined into the JS bundle at build time, so the API
# URL is a build argument: build one image per environment.
#   docker build -t top-frontend \
#     --build-arg NEXT_PUBLIC_API_URL=https://api.example.com/api/v1 ./top-frontend
#   docker run -p 3001:3000 top-frontend

ARG NODE_VERSION=22

# ---- deps --------------------------------------------------------------------
FROM node:${NODE_VERSION}-bookworm-slim AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --no-audit --no-fund

# ---- build -------------------------------------------------------------------
FROM deps AS build
ARG NEXT_PUBLIC_API_URL
ARG NEXT_PUBLIC_APP_NAME="Modern POS"
ARG NEXT_PUBLIC_APP_VERSION="1.0.0"
ENV NEXT_PUBLIC_API_URL=${NEXT_PUBLIC_API_URL} \
    NEXT_PUBLIC_APP_NAME=${NEXT_PUBLIC_APP_NAME} \
    NEXT_PUBLIC_APP_VERSION=${NEXT_PUBLIC_APP_VERSION} \
    NEXT_TELEMETRY_DISABLED=1
COPY . .
RUN test -n "$NEXT_PUBLIC_API_URL" \
    || (echo "ERROR: --build-arg NEXT_PUBLIC_API_URL is required" >&2 && exit 1)
RUN npm run build

# ---- runtime: standalone server, non-root ------------------------------------
FROM node:${NODE_VERSION}-bookworm-slim AS runtime
ENV NODE_ENV=production \
    PORT=3000 \
    HOSTNAME=0.0.0.0 \
    NEXT_TELEMETRY_DISABLED=1
WORKDIR /app

# The standalone server does not include public/ and .next/static by default
COPY --from=build --chown=node:node /app/.next/standalone ./
COPY --from=build --chown=node:node /app/.next/static ./.next/static
COPY --from=build --chown=node:node /app/public ./public

USER node
EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:'+(process.env.PORT||3000)+'/auth/login').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

CMD ["node", "server.js"]

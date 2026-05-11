# ─────────────────────────────────────────────────────────────────────────────
# frontend/Dockerfile
# ME ESG Analytics — React dashboard (multi-stage build)
# ─────────────────────────────────────────────────────────────────────────────

# ══════════════════════════════════════════════════════════════════════════════
# Stage 1 — Build
#   node:18-alpine keeps the build image lean; the final image only carries nginx
# ══════════════════════════════════════════════════════════════════════════════
FROM node:18-alpine AS builder

WORKDIR /app

# Copy dependency manifests first — leverages Docker layer caching so
# npm install only re-runs when package.json / package-lock.json change
COPY package.json package-lock.json* ./

RUN npm ci --prefer-offline

# Copy the rest of the source and build
COPY . .

# The API base URL is baked in at build time.
# Override with: docker build --build-arg VITE_API_URL=https://api.example.com
ARG VITE_API_URL=http://localhost:8000
ENV VITE_API_URL=${VITE_API_URL}

RUN npm run build

# ══════════════════════════════════════════════════════════════════════════════
# Stage 2 — Serve
#   nginx:alpine — ~25 MB final image, production-hardened
# ══════════════════════════════════════════════════════════════════════════════
FROM nginx:alpine AS production

# Remove default nginx content
RUN rm -rf /usr/share/nginx/html/*

# Copy the Vite build output from Stage 1
COPY --from=builder /app/dist /usr/share/nginx/html

# Custom nginx config: enable HTML5 history API routing (React Router)
# and add basic security / caching headers
COPY nginx.conf /etc/nginx/conf.d/default.conf

# nginx runs as root inside the container (standard); ports below 1024
# require root. We expose 80 and map to host 3000 in docker-compose.
EXPOSE 80

HEALTHCHECK --interval=30s --timeout=5s --retries=3 \
    CMD wget -qO- http://localhost/ || exit 1

CMD ["nginx", "-g", "daemon off;"]

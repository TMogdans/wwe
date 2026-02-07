# Build Stage
FROM node:22-alpine AS build
WORKDIR /app

# Enable pnpm
RUN corepack enable pnpm

# Copy workspace config files first (for better layer caching)
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml ./
COPY packages/backend/package.json packages/backend/
COPY packages/frontend/package.json packages/frontend/

# Install dependencies
RUN pnpm install --frozen-lockfile

# Copy source code
COPY packages/ packages/

# Build frontend and backend
RUN pnpm build

# Runtime Stage
FROM gcr.io/distroless/nodejs22-debian12:nonroot
WORKDIR /app

# Copy backend build output
COPY --from=build /app/packages/backend/dist ./

# Copy frontend build output as "public" directory for static serving
COPY --from=build /app/packages/frontend/dist ./public

ENV NODE_ENV=production
ENV PORT=3000
ENV RECIPES_DIR=/data/rezepte

EXPOSE 3000

CMD ["index.js"]

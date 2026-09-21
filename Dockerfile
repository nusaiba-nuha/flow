# syntax=docker/dockerfile:1

# Node 22 to match .nvmrc. Alpine because this image only needs a package manager
# and a bundler.
ARG NODE_VERSION=22-alpine

# Dependencies once, shared by every later stage, so a source change does not
# reinstall node_modules.
FROM node:${NODE_VERSION} AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

# Development: Vite with hot reload, bound to all interfaces so the host can
# reach it through the published port.
FROM deps AS dev
WORKDIR /app
COPY . .
EXPOSE 5173
CMD ["npm", "run", "dev", "--", "--host", "0.0.0.0"]

# Build: the static bundle.
FROM deps AS build
WORKDIR /app
COPY . .
# Vite inlines VITE_* at build time, so a remote payload URL has to arrive here
# rather than at container start.
ARG VITE_PAYLOAD_URL=""
ENV VITE_PAYLOAD_URL=$VITE_PAYLOAD_URL
RUN npm run build

# Production: nginx serving the bundle. No Node, no node_modules, a few megabytes.
FROM nginx:1.27-alpine AS prod
COPY --from=build /app/dist /usr/share/nginx/html
COPY docker/nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80

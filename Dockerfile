# syntax=docker/dockerfile:1
ARG NODE_VERSION=22-alpine

# Dependencies once, so a source change does not reinstall them.
FROM node:${NODE_VERSION} AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

FROM deps AS dev
WORKDIR /app
COPY . .
EXPOSE 5173
CMD ["npm", "run", "dev", "--", "--host", "0.0.0.0"]

FROM deps AS build
WORKDIR /app
COPY . .
# Vite inlines VITE_* at build time, so it arrives here, not at container start.
ARG VITE_PAYLOAD_URL=""
ENV VITE_PAYLOAD_URL=$VITE_PAYLOAD_URL
RUN npm run build

FROM nginx:1.27-alpine AS prod
COPY --from=build /app/dist /usr/share/nginx/html
COPY docker/nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80

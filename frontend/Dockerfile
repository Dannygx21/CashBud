# ── Build stage ───────────────────────────────────────────────────────────────
FROM node:20-alpine AS build

WORKDIR /app

COPY frontend/package*.json ./
RUN npm ci

COPY frontend/ ./

# Bake the sub-path into the build
ARG REACT_APP_API_URL=/cashbuddy/api
ARG REACT_APP_BASENAME=/cashbuddy
ARG PUBLIC_URL=/cashbuddy

ENV REACT_APP_API_URL=$REACT_APP_API_URL
ENV REACT_APP_BASENAME=$REACT_APP_BASENAME
ENV PUBLIC_URL=$PUBLIC_URL

RUN npm run build

# ── Serve stage ───────────────────────────────────────────────────────────────
FROM nginx:alpine

COPY --from=build /app/build /usr/share/nginx/html
COPY frontend/nginx.conf     /etc/nginx/conf.d/default.conf

EXPOSE 80

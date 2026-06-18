# Stage 1 — build the Vite SPA
FROM node:20-alpine AS builder

WORKDIR /app

COPY app/package*.json ./
RUN npm ci --prefer-offline

COPY app/ .

# VITE_API_URL is injected at build time so the JS bundle knows where to call the API.
# With nginx proxying /api/ → backend:8000/, set this to /api (no trailing slash).
ARG VITE_API_URL=/api
ENV VITE_API_URL=$VITE_API_URL

RUN npm run build

# Stage 2 — serve with nginx
FROM nginx:1.27-alpine

COPY --from=builder /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]

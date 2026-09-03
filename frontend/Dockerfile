# Stage 1: Build the React production assets
FROM node:22-alpine AS builder

WORKDIR /app

# Copy dependency configs
COPY package.json package-lock.json ./

# Install packages
RUN npm ci

# Cache-invalidation hook for frontend rebuilds
ARG CACHEBUST=1

# Copy the rest of the frontend source code
COPY . .

# Set Vite production api url argument/env if needed
ARG VITE_API_URL=/api/v1
ENV VITE_API_URL=$VITE_API_URL

# Build production bundle
RUN npm run build

# Stage 2: Serve the build directory with a hardened non-root Nginx
FROM nginx:1.27.1-alpine AS runner

# Copy customized nginx configuration
COPY nginx.conf /etc/nginx/nginx.conf

# Copy build files from build stage to nginx folder
COPY --from=builder /app/dist /usr/share/nginx/html

# Adjust file ownership and set up write permissions for non-root Nginx execution
RUN touch /var/run/nginx.pid && \
    chown -R nginx:nginx /var/run/nginx.pid /usr/share/nginx/html /var/cache/nginx /var/log/nginx /etc/nginx

# Switch to the non-root 'nginx' user
USER nginx

EXPOSE 8080

HEALTHCHECK --interval=30s --timeout=5s --start-period=5s --retries=3 \
  CMD wget --spider -q http://127.0.0.1:8080/health || exit 1

CMD ["nginx", "-g", "daemon off;"]

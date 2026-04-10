# Stage 1: Build React app
FROM node:18-alpine AS builder
WORKDIR /build

# Define the build argument
ARG VITE_API_URL
COPY . .
RUN touch .env.production
RUN echo "VITE_API_URL=$VITE_API_URL" > .env.production
RUN npm install
RUN npm run build

# Stage 2: Serve with Nginx
FROM nginx:alpine
COPY --from=builder /build/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Optional: Prepare directory for certificates if they are mounted via volume
RUN mkdir -p /etc/nginx/certs

EXPOSE 80
EXPOSE 443

CMD ["nginx", "-g", "daemon off;"]

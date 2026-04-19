# Stage 1: Build
FROM node:20-alpine AS build

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .
ARG VITE_API_URL=/api`nARG VITE_ENCRYPTION_KEY=supersecretencryptionkey`nENV VITE_API_URL=$VITE_API_URL`nENV VITE_ENCRYPTION_KEY=$VITE_ENCRYPTION_KEY`nRUN npm run build

# Stage 2: Serve
FROM nginx:alpine

RUN mkdir -p /usr/share/nginx/html/radar && COPY --from=build /app/dist /usr/share/nginx/html/radar/
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]

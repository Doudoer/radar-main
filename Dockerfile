# Stage 1: Build
FROM node:20-alpine AS build

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .

# Inyectar variables en el build de Vite
ARG VITE_API_URL=/api
ARG VITE_ENCRYPTION_KEY=supersecretencryptionkey
ENV VITE_API_URL=$VITE_API_URL
ENV VITE_ENCRYPTION_KEY=$VITE_ENCRYPTION_KEY

RUN npm run build

# Stage 2: Serve
FROM nginx:alpine

# Creamos el directorio y luego copiamos (instrucciones separadas)
RUN mkdir -p /usr/share/nginx/html/radar
COPY --from=build /app/dist /usr/share/nginx/html/radar/
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]

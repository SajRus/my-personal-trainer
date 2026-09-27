# ---- build: compila la PWA (e fa girare i test) --------------------------------
FROM node:20-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
# BASE_PATH permette di servire l'app sotto una sottocartella (es. /trainer/)
ARG BASE_PATH=/
ENV BASE_PATH=${BASE_PATH}
RUN npm test && npm run build

# ---- run: nginx serve i file statici ----------------------------------------------
FROM nginx:1.27-alpine
COPY deploy/nginx.conf /etc/nginx/conf.d/default.conf
COPY deploy/security-headers.conf /etc/nginx/snippets/security-headers.conf
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 80
HEALTHCHECK --interval=30s --timeout=3s CMD wget -qO- http://127.0.0.1/ >/dev/null || exit 1

FROM node:23-alpine

WORKDIR /build
COPY ./sigmadsp/package.json .
COPY ./sigmadsp/package-lock.json .
RUN npm i

COPY ./sigmadsp /build
RUN npm run build

FROM nginx:1.26.0-alpine
COPY mime.types /etc/nginx/mime.types
COPY --from=0 /build/dist /usr/share/nginx/html

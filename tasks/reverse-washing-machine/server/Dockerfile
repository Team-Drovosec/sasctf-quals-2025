FROM node:23-alpine

WORKDIR /build
COPY ./washing-machine/package.json .
COPY ./washing-machine/package-lock.json .
RUN npm i

COPY ./washing-machine /build
RUN npm run build

FROM nginx:1.26.0-alpine
COPY --from=0 /build/dist/index.html /usr/share/nginx/html

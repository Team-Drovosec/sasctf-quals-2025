FROM node:23-alpine

ENV STORAGE_HOST="https://gigastorage.task.sasc.tf"
ENV UPLOAD_KEY="something_random_whatever_29391"

WORKDIR /app
COPY *.json .
RUN npm install

COPY app.js .
COPY config ./config
COPY models ./models
COPY views ./views
COPY public ./public

RUN sed -ri -e 's!%STORAGE_HOST%!'"${STORAGE_HOST}"'!g' public/js/main.js

CMD node app.js
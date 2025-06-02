FROM caddy:2.10-alpine

RUN apk add --no-cache \
    python3-dev \
    py3-pip 

WORKDIR /app
COPY index.html ./
COPY Caddyfile ./

RUN chmod 666 /app/index.html

COPY flag.sh /
RUN chmod 0000 /flag.sh

CMD while true; do sh -c 'caddy run --config /app/Caddyfile'; done

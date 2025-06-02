FROM alpine:latest

RUN apk update && \
    apk add --no-cache python3 py3-pip gcc musl-dev

RUN pip3 install flask==3.1.0 --break-system-packages

WORKDIR /
COPY flag.txt /
RUN chmod 400 /flag.txt

COPY tung.c /
RUN gcc -o tung tung.c && \
    chmod 6111 tung && \
    rm tung.c

WORKDIR /app
COPY app.py .

RUN adduser -D patapim
USER patapim

CMD ["python3", "app.py"]

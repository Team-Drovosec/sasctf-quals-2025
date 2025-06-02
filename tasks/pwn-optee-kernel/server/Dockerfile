FROM ubuntu:22.04

RUN apt-get update && \
    apt-get --assume-yes --no-install-recommends install socat build-essential libssl-dev libpixman-1-dev libepoxy-dev libsnappy-dev libcapstone4 libcapstone-dev curl xxd libpng16-16 libjpeg8-dev libsdl2-dev libsdl2-2.0-0 libgtk-3-0 libusb-1.0-0 && \
    apt-get clean && \
    rm -rf /var/lib/apt/lists/*

COPY ./app /app
WORKDIR /app

RUN chmod +x start.sh && \
    chmod +x check_pow.sh && \
    chmod +x run_qemu_if_pow.sh

CMD ["sh", "start.sh"]
FROM python:3.10-slim

# Install required tools for building Node.js native modules
RUN apt update && \
    apt install -y curl gnupg build-essential python3 make gcc g++ && \
    curl -fsSL https://deb.nodesource.com/setup_18.x | bash - && \
    apt install -y nodejs && \
    apt clean

RUN apt install -y gcc-riscv64-unknown-elf git build-essential gperf texinfo libtool && \
    git clone https://sourceware.org/git/newlib-cygwin.git && \
    cd newlib-cygwin && mkdir build && cd build && \
    ../configure \
        --with-newlib \
        --with-headers=/opt/riscv/riscv64-unknown-elf/include \
        --disable-libstdcxx-pch \
        --disable-shared \
        --disable-threads \
        --enable-languages=c \
        --target=riscv64-unknown-elf \
        --prefix=/opt/riscv && \
    make -j$(nproc) && \
    make install

WORKDIR /app

# Python deps
COPY requirements.txt .
RUN pip install -r requirements.txt

COPY package.json .

# Node deps
RUN npm install

# Copy full app
COPY . .

RUN riscv64-unknown-elf-gcc \
    -I/opt/riscv/riscv64-unknown-elf/include \
    -L/opt/riscv/riscv64-unknown-elf/lib \
    -march=rv64g -mabi=lp64 \
    -O0 \
    -c hash.c -o hash_riscv64.o

RUN riscv64-unknown-elf-gcc \
    -nostdlib -nostartfiles \
    -Wl,--entry=reversible_transform \
    -static \
    -o hash_riscv64 \
    hash_riscv64.o

RUN gcc -o hash_main hash.c hash_main.c

ARG TARGET_KEY
ENV TARGET_KEY_ENV=$TARGET_KEY

RUN python3 gen.py hash_riscv64 `./hash_main $TARGET_KEY` > dissasm_gen.txt

# Compile contract
RUN node compile.js
RUN chmod +x *.sh


CMD ["./entrypoint.sh"]

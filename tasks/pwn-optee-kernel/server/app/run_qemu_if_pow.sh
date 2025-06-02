#!/bin/sh

if ! ./check_pow.sh; then
    exit 1
fi

# Create a temporary log file
OPTEE_LOG=$(mktemp /tmp/optee.XXXXXXXXXXXX.log)

# Ensure the log file is removed on script exit
trap 'rm -f "$OPTEE_LOG"' EXIT

cd ./bin

LD_LIBRARY_PATH=$(realpath ../) timeout 90 ../qemu-system-aarch64 \
    -nographic \
    -smp 2 -cpu max,sme=on,pauth-impdef=on -d unimp \
    -semihosting-config enable=on,target=native -m 1057 \
    -bios bl1.bin \
    -initrd rootfs.cpio.gz \
    -kernel Image \
    -append 'console=ttyAMA0,38400 keep_bootcon root=/dev/vda2 ' \
    -netdev user,id=vmnic -device virtio-net-device,netdev=vmnic \
    -machine virt,acpi=off,secure=on,mte=off,gic-version=3,virtualization=false \
    -serial stdio -serial file:"$OPTEE_LOG" \
    -monitor null

cat "$OPTEE_LOG"
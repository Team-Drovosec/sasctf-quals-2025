#!/bin/sh

while [ true ]; do
	socat TCP-LISTEN:46464,fork,reuseaddr EXEC:'./run_qemu_if_pow.sh'
done;
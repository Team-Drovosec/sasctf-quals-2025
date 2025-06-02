#!/bin/sh

while [ true ]; do
	socat TCP-LISTEN:45454,fork,reuseaddr EXEC:'./run_qemu_if_pow.sh'
done;
#!/bin/sh

while [ true ]; do
	socat TCP-LISTEN:2640,fork,reuseaddr EXEC:'./chall.elf'
done;
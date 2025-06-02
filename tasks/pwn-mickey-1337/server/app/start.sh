#!/bin/sh

while [ true ]; do
	socat TCP-LISTEN:1337,fork,reuseaddr EXEC:'./chall.elf'
done;
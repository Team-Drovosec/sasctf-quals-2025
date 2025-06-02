all : pososix2

PREFIX:=../buildroot/output/host/bin/riscv32-buildroot-linux-uclibc-
CC:=$(PREFIX)gcc
OBJDUMP:=$(PREFIX)objdump

# Note:  regymm says to do -fPIE -pie -static, instead of -fPIC
CFLAGS:=-mabi=ilp32 -fPIE -pie -static -march=rv32ima -Og -s -g -ffunction-sections -fdata-sections
LDFLAGS:=-Wl,-elf2flt=-r -Wl,-gc-sections

C_S+=pososix2.c

test : deploy
	make -C .. toolchain
	make -C ../mini-rv32ima mini-rv32ima
	../mini-rv32ima/mini-rv32ima -f ../buildroot/output/images/Image

pososix2 : pososix2.c
	$(CC) $(CFLAGS) $(C_S) $(LDFLAGS) -o $@
	$(OBJDUMP) -S $@.gdb > $@.S

deploy : pososix2
	cp $^ ../buildroot/output/target/home/ctf/
	cp flag.enc ../buildroot/output/target/home/ctf
	# cp serial.key ../buildroot/output/target/root

rebuild :
	make -C.. toolchain 

clean :
	rm -rf pososix2 *.gdb *.S

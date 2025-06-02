all : pososix1

PREFIX:=../buildroot/output/host/bin/riscv32-buildroot-linux-uclibc-
CC:=$(PREFIX)gcc
OBJDUMP:=$(PREFIX)objdump

# Note:  regymm says to do -fPIE -pie -static, instead of -fPIC
CFLAGS:=-mabi=ilp32 -fPIE -pie -static -march=rv32ima -Ofast -s -g -ffunction-sections -fdata-sections
LDFLAGS:=-Wl,-elf2flt=-r -Wl,-gc-sections

C_S+=pososix1.c md5.c

test : deploy
	make -C .. toolchain
	make -C ../mini-rv32ima mini-rv32ima
	../mini-rv32ima/mini-rv32ima -f ../buildroot/output/images/Image

pososix1 : pososix1.c md5.c
	$(CC) $(CFLAGS) $(C_S) $(LDFLAGS) -o $@
	$(OBJDUMP) -S $@.gdb > $@.S

deploy : pososix1
	cp $^ ../buildroot/output/target/home/ctf/

rebuild :
	make -C.. toolchain 

clean :
	rm -rf pososix1 *.gdb *.S

# Overview

Security settings of the provided ELF binary:
```bash
$ pwn checksec chall.elf        
[*] 'chall.elf'
    Arch:       amd64-64-little
    RELRO:      Partial RELRO       🟥
    Stack:      No canary found     🟥
    NX:         NX enabled          🟩
    PIE:        No PIE (0x400000)   🟥
    Stripped:   No                  🟥

```

Application functionality:
- Create "signs of attention" – either compliments (strings) or NFTs (integers)
- Edit signs of attention
- "Play" (i.e., trigger) the signs of attention

According to the Dockerfile, the flag is stored on the filesystem at `/app/flag.txt`.

# Vulnerability

The application lacks type checks when editing signs of attention, leading to a type confusion vulnerability.
```c
void __fastcall edit_nft(struct_sign *sign)
{
  printf("Reenter the cost of the NFT: ");
  __isoc99_scanf(" %d", &sign->value);
  getchar();
}

```
```c
void __fastcall edit_compliment(struct_sign *sign)
{
  printf("Reenter the compliment text (max 256 chars): ");
  fgets((char *)sign->value, 255, stdin);
}

```
An attacker can create a NFT with a cost of `0xAABBCC00`, and then edit it as a compliment. This results in writing data to the memory address `0xAABBCC00`, effectively giving an arbitrary write primitive.

# Exploitation

Attack plan:
1. Use the *arbitrary write* to gain *arbitrary read*:
	1. Redirect `strlen()` to `puts()` for leaking
		1. Create a "compliment" (sign of attention) to trigger strlen()
		2. Reinterpret the compliment as a NFT and write the address `GOT@strlen`
		3. Reinterpret it back as a compliment to write `PLT@puts` to `GOT@strlen`
2. Leak libc address
	1. Modify the NFT to point to `GOT@printf`
	2. Play the compliment — `strlen()` (now puts) leaks `GOT@printf`
3. Get a shell
	1. Redirect `strlen()` to `system()`
		1. Create another compliment
		2. Reinterpret it as a NFT to point to `GOT@strlen`
		3. Reinterpret again as a compliment to write `libc@system` to `GOT@strlen`
	2. Trigger `system("/bin/bash")`:
		1. Reuse the compliment as a NFT to point to writable memory
		2. Reinterpret it as a compliment to write `'/bin/bash\x00'`
		3. Trigger `strlen()` — now `system('/bin/bash')` is executed
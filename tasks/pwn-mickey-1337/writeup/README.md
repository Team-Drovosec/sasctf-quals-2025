# Overview

Security settings of the provided ELF binary:
```bash
$ pwn checksec chall.elf        
[*] 'chall.elf'
    Arch:       amd64-64-little
    RELRO:      Partial RELRO       🟥
    Stack:      Canary found        🟩
    NX:         NX enabled          🟩
    PIE:        No PIE (0x400000)   🟥
    Stripped:   No                  🟥

```

Application functionality:
- Spawn a child process and read input into the stack
- Terminate the current process and return control to the parent

According to the Dockerfile, the flag is located at `/app/flag.txt`.

# Vulnerability

When creating a copy (i.e. spawning a child), the application reads more data than the allocated buffer can hold, resulting in a classic buffer overflow.

```c
void __fastcall make_copy()
{
  ...
  char buf[24];
  ...
  else
  {
    ...
    read(0, buf, 0x64uLL); //  <-- Buffer Overflow
  }
}

```

Although a stack canary is present, the application's process forking logic allows the canary to be leaked byte-by-byte by crashing only the child process. This opens the door to stack-based ROP chain exploitation.

# Exploitation

Attack plan:
1. Leak the stack canary:
	1. Spawn a child process and overwrite one byte of the canary with a guessed value.
	2. If the guess is wrong, the child crashes and the parent tries again.
    3. If the guess is correct, the process doesn’t crash - record the byte.
    4. Repeat the process for each byte of the canary.
2. Leak libc addresses:
	1. Use a gadget from the `make_copy()` function to read the value of `GOT@getpid` into a writable memory section.
	2. Use a gadget from the `intro()` function to print the contents of that memory region, leaking the libc address of `getpid`.
3. Get a shell:
	1. Construct a ROP chain using libc gadgets to call `execve("/bin/sh", NULL, NULL)`.
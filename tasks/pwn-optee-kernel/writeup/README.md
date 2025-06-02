# Overview

In this task participants are given a vulnerable OP-TEE Kernel that implements custom `SAS` syscall. The goal is to get `ACE` in the kernel and call custom `SMC` handler that will return the flag.

# Vulnerability

The vulnerability in this task is quite straightforward. The `SAS` syscall allows userspace to allocate and free memory, but it does not properly handle the case where a user tries to write to a freed memory region. This leads to a Use-After-Free (UAF) vulnerability.

# Exploitation

As we all know, to exploit a UAF vulnerability, we need to:

1. Read source code of the allocator, understand how it works, ...
2. Nope, not really, we have first-fit logic, that also applies here.

So, by correctly allocating and freeing memory, we can make sure that some interesting objects are allocated at the same address as freed ones. One possible object you could use is the `TEE_AllocateOperation` object with the `TEE_ALG_SHA512` algorithm, as it has a virtual function table that allows us to call arbitrary functions in the kernel.

So if we allocate a bunch of memory entries using the syscall, then free them, and finally allocate a bunch of `TEE_AllocateOperation` objects, we can make sure that the freed memory is reused for the new allocations. This way, we can control the contents of the `TEE_AllocateOperation`, and as so we can control its virtual function table.

Finally, we can call `TEE_DigestUpdate` on the modified object, which will trigger a call through the virtual function table giving us the ability to execute arbitrary code in the kernel context.

As the final step, we just need to call the convenient wrapper-function `sas_do_smc_healthcheck` with the appropriate parameters to get the flag.

P.S. The provided exploit is not reliable, and might need to be re-executed multiple times to work.

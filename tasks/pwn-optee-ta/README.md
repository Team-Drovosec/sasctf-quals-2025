## Title

Trust Issues

## Description

```
Target system is a secure-world Trustlet running inside a TEE. The codebase is signed, verified, and marked "production ready."
But something doesn't add up.

Your mission today, if you choose to accept it, is to do what the auditors couldn't, wouldn't or were too lazy to do, press F5 and find the flag.
```

Setting up and running:

1. Get the `optee` project: `mkdir optee && cd optee && repo init -u https://github.com/OP-TEE/manifest.git -b 4.5.0`
2. `repo sync`
3. Apply provided patches to the `optee_examples`.
4. `cd build`
5. `make toolchains`
6. Build and run: `make QEMU_VIRTFS_ENABLE=y QEMU_USERNET_ENABLE=y QEMU_VIRTFS_HOST_DIR=./shared_folder CFG_TA_ASLR=n "PLATFORM=*" CFLAGS="-D STAGING_BUILD" run -j16`
7. Mount the shared folder: `mkdir -p /mnt/host && mount -t 9p -o trans=virtio host /mnt/host`
8. Now run your exploit: `./sas_trust_issues`

Some notes, that might be useful for you:

1. `ASLR` is turned off.
2. `HUK` is different for user and staging builds.
3. You can't load your trustlets in the staging build, as custom `TA_SIGN_KEY` is used.
4. Inside the prod environment you have internet access, so download your payload using `wget`.
5. `UBOOT` console is disabled.

For local testing, you can run the `qemu` as follows (from inside the `bin` folder):

```bash
../qemu-system-arm -nographic -smp 2 -d unimp \
    -semihosting-config enable=on,target=native \
    -m 1057 -bios bl1.bin -machine virt,secure=on \
    -cpu cortex-a15 -object rng-random,filename=/dev/urandom,id=rng0 \
    -device virtio-rng-pci,rng=rng0,max-bytes=1024,period=1000 \
    -netdev user,id=vmnic -device virtio-net-device,netdev=vmnic \
    -fsdev local,id=fsdev0,path=<path-to-your-shared-folder>,security_model=none \
    -device virtio-9p-device,fsdev=fsdev0,mount_tag=host \
    -monitor null -s -S -serial tcp:127.0.0.1:54320 -serial tcp:127.0.0.1:54321
```

Use `./soc_term.py <port>` from the optee project to connect to the `qemu` instance.

You can also debug the instance using `gdb`, check the optee documentation for more details.

On the staging build, `qemu` is executed with the following command:

```bash
../qemu-system-arm \
    -nographic \
    -smp 2 -d unimp \
    -semihosting-config enable=on,target=native \
    -m 1057 -bios bl1.bin -machine virt,secure=on \
    -cpu cortex-a15 -object rng-random,filename=/dev/urandom,id=rng0 \
    -device virtio-rng-pci,rng=rng0,max-bytes=1024,period=1000 \
    -netdev user,id=vmnic \
    -device virtio-net-device,netdev=vmnic \
    -monitor null
```

## Solution
Refer to the [detailed solution](./writeup/)

## Flag
Production: `SAS{w0w_congr4ts_y0u_g0t_the_real_0ne_s3cur3_stor4ge_1s_not_s0_s3cur3_after_4ll}` \
Dummy: `SAS{not_a_real_flag_unfortunately_but_1t_was_still_stored_in_secure_storage}`

**Solved by:** 6 teams
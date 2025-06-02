## Title

Broken Trust

## Description

```
Time for the next challenge! Now, you'll need to exploit a vulnerability in the OP-TEE kernel itself to call privileged SMC handler and get the flag.

This is a sequel challenge for the `Trust Issues`, consult previous challenge for more information.
```

Setting up and running:

1. Get the `optee` project: `mkdir optee && cd optee && repo init -u https://github.com/OP-TEE/manifest.git -m qemu_v8.xml -b 4.5.0`
2. Sync the repository: `repo sync -j2`
3. Apply patch from the previous challenge to get example host-application and a trustlet.
4. Build toolchains: `cd build && make toolchains`
5. Build and run: `make CFG_CORE_ASLR=n CFG_WITH_PAGER=y QEMU_VIRTFS_ENABLE=y QEMU_USERNET_ENABLE=y QEMU_VIRTFS_HOST_DIR=./shared_folder PLATFORM=vexpress-qemu_armv8a run -j 16`
6. Mount the shared folder: `mkdir -p /mnt/host && mount -t 9p -o trans=virtio host /mnt/host`
7. Save your trustlet binary to `/lib/optee_armtz/`
8. Now run your exploit: `./sas_broken_trust`

Environment Details:

1. Kernel `ASLR` is disabled.
2. We're using default signing keys for trustlets, you're expected to run your own trustlet on the production instance.
3. There is internet access, so download your payload using `wget`.
4. `UBOOT` console is disabled.
5. The timeout is 90 seconds, after this time you'll receive a dump of the secure log.

On the production instance, `qemu` is executed as follows (from inside the `bin` directory):

```bash
LD_LIBRARY_PATH=$(realpath ../) timeout 90 ../qemu-system-aarch64 \
    -nographic \
    -smp 2 -cpu max,sme=on,pauth-impdef=on -d unimp \
    -semihosting-config enable=on,target=native -m 1057 \
    -bios bl1.bin \
    -initrd rootfs.cpio.gz \
    -kernel Image \
    -append 'console=ttyAMA0,38400 keep_bootcon root=/dev/vda2 ' \
    -netdev user,id=vmnic -device virtio-net-device,netdev=vmnic \
    -machine virt,acpi=off,secure=on,mte=off,gic-version=3,virtualization=false \
    -serial stdio -serial file:"$OPTEE_LOG" \
    -monitor null
```

## Solution
Refer to the [detailed solution](./writeup/)

## Flag
Production: `SAS{fr0m_SEL0_t0_k3rnel_4nd_bey0nd}`
Dummy: `SAS{y0u_got_it_now_do_the_same_remotely}`

**Solved by:** 1 team
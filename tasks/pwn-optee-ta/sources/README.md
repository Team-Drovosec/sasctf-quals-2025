## Building

1. Create directory `optee`
2. In newly created directory run: `repo init -u https://github.com/OP-TEE/manifest.git -b 4.5.0`
3. `repo sync`
4. `cd build`
5. `make toolchains`
6. Apply patches, and specifically set the `CONFIG_BOOTDELAY=-2` and `CONFIG_DISABLE_CONSOLE=y` in the `./build/kconfigs/u-boot_qemu_virt_v7.conf`
7. `export PATH="/bin:/usr/local/bin:/usr/bin:/home/madrat/sasctf-development/optee_arm/toolchains/aarch32/bin:/home/madrat/sasctf-development/optee_arm/toolchains/aarch64/bin" && make QEMU_VIRTFS_ENABLE=y QEMU_USERNET_ENABLE=y QEMU_VIRTFS_HOST_DIR=/home/madrat/sasctf-development/optee_arm/shared_folder TA_SIGN_KEY=/home/madrat/sasctf-development/optee_arm/optee_os/keys/custom_ta.pem CFG_TA_ASLR=n "PLATFORM=*" CFLAGS="-D STAGING_BUILD" run -j16`
    - This will create a shared folder in the host system, which is mounted in the QEMU instance. You can use this to transfer files between the host and the QEMU instance.
    - Do the following to create the shared folder:
        - `mkdir -p /mnt/host`
        - `mount -t 9p -o trans=virtio host /mnt/host`
8. Run to store the flag: `/usr/bin/sas_trust_issues store_flag "SAS{TEST_FLAG!!!}"`
9. Check the flag was stored correctly: `/usr/bin/sas_trust_issues read_flag`
10. Save the full `/var/lib/tee` folder: `cp -r /var/lib/tee /mnt/host/`
11. Restart the QEMU instance
12. Mount the shared folder again
13. Copy the `/var/lib/tee` folder from the host to the QEMU instance: `cp -r /mnt/host/tee /var/lib/`
14. Restore access rights: `chown -R tee:tee /var/lib/tee`
15. Get the flag: `/usr/bin/sas_trust_issues read_flag`

#include <stdio.h>
#include <string.h>
#include <unistd.h>
#include <stdint.h>
#include <sys/utsname.h>
#include "md5.h"

#define TASK_DEBUG 1

const uint8_t enc[] = {
    0x11, 0x59, 0xfa, 0x1a, 0x93, 0x5f, 0xf4, 0x04, 
    0x70, 0xae, 0x93, 0x05, 0xda, 0xa6, 0x79, 0x95, 
    0xbb, 0x73, 0xb9, 0x86, 0xbf, 0x4e, 0xed, 0x62, 
    0xd8, 0xee, 0x6d, 0xf1, 0x82, 0xce, 0x1d, 0x49, 
    0x14, 0x1e, 0xa9, 0x1f, 0x37, 0xe8, 0xdf, 0xa3, 
    0xd0, 0xbe, 0x20, 0x1c, 0xb4, 0x93, 0x64, 0xc5,
    0x36, 0x70, 0x9a, 0x3e, 0x87, 0x5b, 0xe8, 0x5f, 
    0x5d, 0xf8, 0xd3, 0x47, 0xde, 0xef
};

typedef struct task_hashes {
    uint8_t hash_release[16];
    uint8_t hash_cmdline[16];
    uint8_t hash_buildroot_id_env[16];
} task_hashes;

void construct_hashes(task_hashes *hashes) {
    // Release
    struct utsname uname_data;
    uname(&uname_data);

    MD5Context ctx_rel;
    md5Init(&ctx_rel);
    md5Update(&ctx_rel, (uint8_t *)uname_data.release, strlen(uname_data.release));
    md5Finalize(&ctx_rel);
    memcpy(hashes->hash_release, ctx_rel.digest, 16);

    // Cmdline
    MD5Context ctx_cmdline;
    md5Init(&ctx_cmdline);
    FILE *fptr = fopen("/proc/cmdline", "rb");
    if (fptr == NULL) {
        printf("Cound not open file\n");
        exit(1);
    }
    fseek(fptr, 0, SEEK_END);
    unsigned long cmdline_size = ftell(fptr);
    fseek(fptr, 0, SEEK_SET);

    uint8_t *alloc = calloc(cmdline_size, sizeof(uint8_t));
    if (alloc == NULL) {
        fclose(fptr);
        printf("Cound not allocate memory\n");
        exit(1);
    }
    fread(alloc, sizeof(uint8_t), cmdline_size, fptr);
    fclose(fptr);
    md5Update(&ctx_cmdline, alloc, cmdline_size);
    md5Finalize(&ctx_cmdline);
    memcpy(hashes->hash_cmdline, ctx_cmdline.digest, 16);

    // BUILDROOT_ID env var
    MD5Context ctx_buildroot_id;
    md5Init(&ctx_buildroot_id);
    char *bd_id = getenv("BUILDROOT_ID");
    if (bd_id == NULL) {
        printf("Could not read env varible");
        exit(1);
    }
    md5Update(&ctx_buildroot_id, (uint8_t *)bd_id, strlen(bd_id));
    md5Finalize(&ctx_buildroot_id);
    memcpy(hashes->hash_buildroot_id_env, ctx_buildroot_id.digest, 16);
}

int main(int argc, char **argv) {
    #if !TASK_DEBUG
    if (getuid() != 0) {
        puts("Goofy ahh user, terminating session...");
        return 1;
    }
    #endif

    task_hashes hashes;
    construct_hashes(&hashes);
    /*for (int i = 0; i < 16; ++i) {
        printf("%02x", hashes.hash_release[i]);
    }
    for (int i = 0; i < 16; ++i) {
        printf("%02x", hashes.hash_buildroot_id_env[i]);
    }
    for (int i = 0; i < 16; ++i) {
        printf("%02x", hashes.hash_cmdline[i]);
    }
    putchar('\n');*/
    uint8_t *ptr = (uint8_t *)&hashes;
    for (int i = 0; i < sizeof(enc) / sizeof(uint8_t); ++i) {
        putchar(enc[i] ^ ptr[i % 48]);
    }
    putchar('\n');
    
    return 0;
}
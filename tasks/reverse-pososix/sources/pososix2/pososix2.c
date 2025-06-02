#define _GNU_SOURCE

#include <stdio.h>
#include <stdbool.h>
#include <string.h>
#include <stdint.h>
#include <stdlib.h>
#include "task2.h"

#include <sys/syscall.h>
#include <linux/kernel.h>
#include <unistd.h>
#include <sys/utsname.h>

#define SZ_PART_1 8
#define SZ_PART_2 8
#define SZ_PART_3 24

#define PART_1_CHECK_1 2952501649
#define PART_1_CHECK_2 4279402788

void __attribute__ ((noinline)) sp_swap(unsigned char *arr, int a, int b) {
    unsigned char tmp = arr[a];
    arr[a] = arr[b];
    arr[b] = tmp;
}

uint32_t __attribute__ ((noinline)) sp_round_key(uint32_t round_key) {
    return (round_key << 8) | (round_key >> (32 - 8));
}

void __attribute__ ((noinline)) sp_permute(unsigned char *msg) {
    sp_swap(msg, 0, 2);
    sp_swap(msg, 1, 3);
}

void __attribute__ ((noinline)) sp_round(uint32_t *ct, uint32_t *key) {
    *key = sp_round_key(*key);
    unsigned char *bytes_key = (unsigned char *)key;
    unsigned char *bytes_ct = (unsigned char *)ct;
    for (int i = 0; i < 4; ++i) {
        bytes_ct[i] ^= bytes_key[i];
    }

    // Substitute
    for (int i = 0; i < 4; ++i) {
        bytes_ct[i] = sp_sbox[bytes_ct[i]];
    }        

    // Permute
    sp_permute(bytes_ct);
}

void __attribute__ ((noinline)) __attribute__ ((optimize(0))) rc4_encrypt(unsigned char *enc, int enc_size, unsigned char *key, int key_size) {
    unsigned char sbox[256] = {0};
    for (int i = 0; i < 256; ++i) {
        sbox[i] = i;
    }

    unsigned char j = 0;
    for (int i = 0; i < 256; ++i) {
        j = (j + sbox[i] + key[i % key_size]) & 0xff;
        unsigned char temp = sbox[i];
        sbox[i] = sbox[j];
        sbox[j] = temp;
    }

    unsigned char i_prga = 0;
    j = 0;
    for (int k = 0; k < enc_size; ++k) {
        i_prga = (i_prga + 1) & 0xff;
        j = (j + sbox[i_prga]) & 0xff;
        unsigned char temp = sbox[i_prga];
        sbox[i_prga] = sbox[j];
        sbox[j] = temp;
        unsigned char t = (sbox[i_prga] + sbox[j]) & 0xff;
        enc[k] ^= sbox[t];
    }
}

bool __attribute__ ((noinline)) check1(const char *part) {
    // Split part in two blocks
    uint32_t blocks[2] = {0};
    memcpy((unsigned char *)blocks, part, 8);
    uint32_t keys[2] = {0xCAFEBABE, 0xDEADBEEF};

    for (int i = 0; i < 0xCAC; ++i) {
        sp_round(&blocks[0], &keys[0]);
    }

    for (int i = 0; i < 0xCAC; ++i) {
        sp_round(&blocks[1], &keys[1]);
    }

    return blocks[0] == PART_1_CHECK_1 && blocks[1] == PART_1_CHECK_2;
    return true;
}

bool __attribute__ ((noinline)) check2(const char *part) {
    char *buf = calloc(SZ_PART_2 + 1, sizeof(char));
    if (!buf) {
        return false;
    }

    long res = syscall(462, buf, SZ_PART_2);
    if (res != 0) {
        free(buf);
        return false;
    }

    if (memcmp(buf, part, SZ_PART_2)) {
        free(buf);
        return false;
    }

    free(buf);
    return true;
}

bool __attribute__ ((noinline)) check3(const char *part) {
    struct utsname uname_data;
    uname(&uname_data);
    char orig[SZ_PART_3 + 1] = {0};
    strcpy(orig, uname_data.release);

    long arg_max = sysconf(_SC_ARG_MAX);
    if (arg_max == -1) {
        return false;
    }

	sprintf(&orig[strlen(uname_data.release)], "%ld\n", arg_max);
    orig[SZ_PART_3 - 1] = '!';

    #if TASK_DEBUG
    printf("%s\n", orig);
    #endif

    return strcmp(orig, part) ? false : true;
}

void __attribute__ ((noinline)) el_problema() {
    puts(err_msg);
}

int main(int argc, char **argv) {
    char password[256] = {0};
    printf("%s\n", "Super secure password checker...");
    printf("%s\n", "Enter your password: ");
    scanf("%255s", password);

    if (strlen(password) != SZ_PART_1 + SZ_PART_2 + SZ_PART_3) {
        el_problema();
        return 1;
    }

    char part1[SZ_PART_1 + 1] = {0};
    char part2[SZ_PART_2 + 1] = {0};
    char part3[SZ_PART_3 + 1] = {0};

    memcpy(part1, password, SZ_PART_1);
    memcpy(part2, password + SZ_PART_1, SZ_PART_2);
    memcpy(part3, password + SZ_PART_1 + SZ_PART_2, SZ_PART_3);
    
    if (!check1(part1)) {
        el_problema();
        return 1;
    }

    if (!check2(part2)) {
        el_problema();
        return 1;
    }

    if (!check3(part3)) {
        el_problema();
        return 1;
    }

    printf("%s\n", "Congrats, password is ok, decrypting...");
    FILE *f_enc = fopen("flag.enc", "rb");
    if (!f_enc) {
        el_problema();
        return 1;
    }

    fseek(f_enc, 0, SEEK_END);
    int enc_size = ftell(f_enc);
    fseek(f_enc, 0, SEEK_SET);

    char *dec = calloc(enc_size + 1, sizeof(char));
    if (dec == NULL) {
        fclose(f_enc);
        el_problema();
        return 1;
    }

    fread(dec, 1, enc_size, f_enc);
    fclose(f_enc);
    rc4_encrypt((unsigned char *)dec, enc_size, (unsigned char *)password, SZ_PART_1 + SZ_PART_2 + SZ_PART_3);
    printf("%s\n", dec);
    return 0;
}

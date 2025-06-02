#include <stdint.h>
#include <stddef.h>

#define ROUNDS 4

// Reversible Feistel round
inline __attribute__((always_inline)) uint32_t feistel_round(uint32_t input, uint32_t key) {
    input ^= key;
    input = ((input << 5) | (input >> (32 - 5))) * 0x45D9F3B;
    input ^= (input >> 16);
    return input;
}

// Reversible avalanche transform
uint64_t reversible_transform(const char *name,size_t len) {
    uint32_t KEYS[ROUNDS];
    KEYS[0] = 0xF00DBABE;
    KEYS[1] = 0xDEADBEEF;
    KEYS[2] = 0xBADC0FFE;
    KEYS[3] = 0xFEEDFACE;
    
    uint64_t state = 0;

    if(len > 8 ){
        len = 8;
    }

    // Pack 8 chars max into 64-bit int
    for (size_t i = 0; i < len; ++i) {
        state |= ((uint64_t)(uint8_t)name[i]) << (i * 8);
    }    

    uint32_t left = (uint32_t)(state >> 32);
    uint32_t right = (uint32_t)(state & 0xFFFFFFFF);

    
    for (int i = 0; i < ROUNDS; ++i) {
        uint32_t tmp = right;
        right = left ^ feistel_round(right, KEYS[i]);
        left = tmp;
    }

    return ((uint64_t)left << 32) | right;
}

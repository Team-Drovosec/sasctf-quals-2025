#include <stdio.h>
#include <string.h>
#include <inttypes.h>

extern uint64_t reversible_transform(const char *name,size_t len);

int main(int argc, char *argv[]) {
    if ( argc < 2 ){
        printf("error");
        return -1;
    }
    uint64_t serial = reversible_transform(argv[1],strlen(argv[1]));
    printf("0x%" PRIX64 "\n", serial);
    return 0;
}

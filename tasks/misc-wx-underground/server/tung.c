#include <stdio.h>
#include <string.h>
#include <unistd.h>

// Inspired by and derived from https://ctftime.org/task/30126
int main(int argc, char *argv[]) {
    char full_cmd[256] = {0}; 
    for (int i = 1; i < argc; i++) {
        strncat(full_cmd, argv[i], sizeof(full_cmd) - strlen(full_cmd) - 1);
        if (i < argc - 1) strncat(full_cmd, " ", sizeof(full_cmd) - strlen(full_cmd) - 1);
    }

    if (strstr(full_cmd, "tung tung tung tung sahur")) {
        FILE *flag = fopen("/flag.txt", "r");
        if (flag) {
            char buffer[1024];
            while (fgets(buffer, sizeof(buffer), flag)) {
                printf("%s", buffer);
            }
            fclose(flag);
            return 0;
        }
    }

    printf("Konon katanya kalau ada orang yang dipanggil Sahur tiga kali dan tidak nyaut maka makhluk ini datang di rumah kalian: %s\n", full_cmd);
    return 1;
}

import sys


def feistel_round(x, k):
    x ^= k
    x = ((x << 5) & 0xFFFFFFFF) | (x >> (32 - 5))
    x = (x * 0x45D9F3B) & 0xFFFFFFFF
    x ^= x >> 16
    return x


def reverse_transform(serial):
    left = (serial >> 32) & 0xFFFFFFFF
    right = serial & 0xFFFFFFFF
    keys = [0xF00DBABE, 0xDEADBEEF, 0xBADC0FFE, 0xFEEDFACE]

    for i in reversed(range(4)):
        left, right = right ^ feistel_round(left, keys[i]), left

    state = (left << 32) | right
    chars = []
    for i in range(8):
        c = (state >> (i * 8)) & 0xFF
        chars.append(chr(c))
    return ''.join(chars)


if __name__ == "__main__":
    serial = int(sys.argv[1].strip(),16)
    recovered_name = reverse_transform(serial)
    print(f"Recovered name from serial: {recovered_name}")
    if len(sys.argv) > 2 and sys.argv[2] != recovered_name:
        exit(-1)

import os

import numpy as np
from PIL import Image


def lzw_decode(data, min_code_size):
    clear_code = 1 << min_code_size
    end_code = clear_code + 1
    next_code = end_code + 1

    table = {i: bytes([i]) for i in range(clear_code)}

    result = bytearray()
    buffer = bytearray()

    bit_buffer = 0
    bit_count = 0
    code_size = min_code_size + 1
    max_code = 1 << code_size

    pos = 0
    while pos < len(data):
        byte = data[pos]
        pos += 1

        bit_buffer |= byte << bit_count
        bit_count += 8

        while bit_count >= code_size:
            code = bit_buffer & ((1 << code_size) - 1)
            bit_buffer >>= code_size
            bit_count -= code_size

            if code == clear_code:
                table = {i: bytes([i]) for i in range(clear_code)}
                next_code = end_code + 1
                code_size = min_code_size + 1
                max_code = 1 << code_size
                buffer.clear()
                continue

            if code == end_code:
                return bytes(result)

            if code in table:
                entry = table[code]
            else:
                entry = buffer + bytes([buffer[0]])

            result.extend(entry)

            if buffer:
                if next_code < 4096:
                    table[next_code] = buffer + bytes([entry[0]])
                    next_code += 1

                    if next_code >= max_code and code_size < 12:
                        code_size += 1
                        max_code = 1 << code_size

            buffer = bytearray(entry)


def print_gif_palettes(gif_path):
    with open(gif_path, "rb") as f:
        data = f.read()

    pos = 6
    width, height = int.from_bytes(data[pos : pos + 2], "little"), int.from_bytes(
        data[pos + 2 : pos + 4], "little"
    )
    packed = data[pos + 4]
    gct_flag = bool(packed & 0x80)
    gct_size = 2 ** ((packed & 0x07) + 1) if gct_flag else 0

    print(f"GIF Header: {width}x{height}")
    pos += 7
    os.makedirs("index_frames", exist_ok=True)

    if gct_flag:
        pos += gct_size * 3

    frame = 0
    while pos < len(data) - 1:
        b = data[pos]

        if b == 0x21:
            pos += 2
            while True:
                sz = data[pos]
                pos += 1
                if sz == 0:
                    break
                pos += sz

        elif b == 0x2C:
            left = int.from_bytes(data[pos + 1 : pos + 3], "little")
            top = int.from_bytes(data[pos + 3 : pos + 5], "little")
            width = int.from_bytes(data[pos + 5 : pos + 7], "little")
            height = int.from_bytes(data[pos + 7 : pos + 9], "little")
            
            pos += 9
            
            packed_field = data[pos]
            has_local = bool(packed_field & 0x80)
            lct_size = 2 ** ((packed_field & 0x07) + 1) if has_local else 0
            pos +=1
            if has_local:
                pos += lct_size * 3

            frame += 1
            lzw_min = data[pos]
            pos += 1

            lzw_data = bytearray()
            while True:
                sz = data[pos]
                pos += 1
                if sz == 0:
                    break
                lzw_data.extend(data[pos : pos + sz])
                pos += sz

            indices = lzw_decode(lzw_data, lzw_min)

            img = np.zeros((height, width), dtype=np.uint8)
            for y in range(height):
                for x in range(width):
                    idx = y * width + x
                    if idx < len(indices):
                        img[y, x] = indices[idx]

            Image.fromarray(img).save(f"index_frames/frame_{frame}_indices.png")

            img = np.zeros((height, width), dtype=np.uint8)
            for y in range(height):
                for x in range(width):
                    idx = y * width + x
                    if idx < len(indices):
                        img[y, x] = 255 - indices[idx]

            Image.fromarray(img).save(f"index_frames/frame_{frame}_indices_reverse.png")

        elif b == 0x3B:
            print("\nGIF Trailer")
            break

        else:
            print(f"Unknown block 0x{b:02X} at position {pos}")
            break


print_gif_palettes("../static/task.gif")

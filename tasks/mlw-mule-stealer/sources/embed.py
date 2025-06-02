#!/usr/bin/env python3

import sys
import struct
from pathlib import Path
from PIL import Image
def bits_from_bytes(data: bytes):
    for byte in data:
        for i in range(8):      
            yield (byte >> i) & 1

def embed_bits_into_red(image: Image.Image, bits):
    w, h = image.size
    pixels = image.load()   

    for y in range(h):
        for x in range(w):
            try:
                bit = next(bits)
            except StopIteration:
                return    

            r, g, b = pixels[x, y]
            r = (r & 0b1111_1110) | bit  
            pixels[x, y] = (r, g, b)

# ---------------------------------------------------------------------------
def main(img_path: Path, payload_path: Path):
    img = Image.open(img_path).convert("RGB")

  
    payload = payload_path.read_bytes()
    size_prefix = struct.pack("<I", len(payload))
    full_data = size_prefix + payload
    total_bits = len(full_data) * 8

    capacity = img.width * img.height  
    if total_bits > capacity:
        raise SystemExit(
            f"Error: payload requires {total_bits} bits but image holds only {capacity}."
        )

    bit_stream = bits_from_bytes(full_data)
    embed_bits_into_red(img, bit_stream)

    out_path = img_path.with_name("stego.png")
    img.save(out_path, "PNG")
    print(f"Payload of {len(payload)} bytes embedded successfully → {out_path}")

# ---------------------------------------------------------------------------
if __name__ == "__main__":
    if len(sys.argv) != 3:
        sys.exit("Usage: python lsb_hide.py input.jpg payload.dat")

    main(Path(sys.argv[1]), Path(sys.argv[2]))

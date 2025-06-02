import sys
import argparse
import hashlib
from base64 import b64decode
from Crypto.Cipher import AES
from Crypto.Util.Padding import pad, unpad
from Crypto.Random import get_random_bytes
from cryptography.hazmat.primitives import serialization
from cryptography.hazmat.backends import default_backend

def load_private_key_d(filename):
    with open(filename, "rb") as f:
        pem_data = f.read()
    key = serialization.load_pem_private_key(pem_data, password=None, backend=default_backend())
    numbers = key.private_numbers()
    d = numbers.private_value
    return d

def derive_key(d):
    d_bytes = d.to_bytes((d.bit_length() + 7) // 8, byteorder='big')
    return hashlib.sha256(d_bytes).digest()

def encrypt(key, in_file, out_file):
    iv = get_random_bytes(16)
    cipher = AES.new(key, AES.MODE_CBC, iv)
    with open(in_file, "rb") as f:
        plaintext = f.read()
    ciphertext = cipher.encrypt(pad(plaintext, AES.block_size))
    with open(out_file, "wb") as f:
        f.write(iv + ciphertext)
    print(f"Encrypted {in_file} -> {out_file}")

def decrypt(key, in_file, out_file):
    with open(in_file, "rb") as f:
        iv = f.read(16)
        ciphertext = f.read()
    cipher = AES.new(key, AES.MODE_CBC, iv)
    plaintext = unpad(cipher.decrypt(ciphertext), AES.block_size)
    with open(out_file, "wb") as f:
        f.write(plaintext)
    print(f"Decrypted {in_file} -> {out_file}")

def main():
    parser = argparse.ArgumentParser(description="AES encrypt/decrypt using SHA256(d) as key from EC private key")
    parser.add_argument("-k", "--keyfile", required=True, help="EC private key PEM file")
    group = parser.add_mutually_exclusive_group(required=True)
    group.add_argument("-e", "--encrypt", nargs=2, metavar=("INFILE", "OUTFILE"))
    group.add_argument("-d", "--decrypt", nargs=2, metavar=("INFILE", "OUTFILE"))

    args = parser.parse_args()

    d = load_private_key_d(args.keyfile)
    key = derive_key(d)

    if args.encrypt:
        encrypt(key, args.encrypt[0], args.encrypt[1])
    else:
        decrypt(key, args.decrypt[0], args.decrypt[1])

if __name__ == "__main__":
    main()

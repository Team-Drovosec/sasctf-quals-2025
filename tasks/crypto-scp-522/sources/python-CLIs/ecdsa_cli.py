import argparse
import hashlib
import os
from ecdsa import SigningKey, VerifyingKey, NIST521p, BadSignatureError
from ecdsa.util import sigencode_der, sigdecode_der

KEY_FILE = ".key"
PUB_FILE = ".key.pub"


def generate_keys():
    sk = SigningKey.generate(curve=NIST521p)
    vk = sk.verifying_key

    with open(KEY_FILE, 'wb') as f:
        f.write(sk.to_pem())
    with open(PUB_FILE, 'wb') as f:
        f.write(vk.to_pem())

    print(f"Private key saved to {KEY_FILE}")
    print(f"Public key saved to {PUB_FILE}")


def nonce():
    random_bytes = os.urandom(64)
    nonce = hashlib.sha512(random_bytes).digest()
    return int.from_bytes(nonce, byteorder='big')


def sign_file(filename):
    with open(KEY_FILE, 'rb') as f:
        sk = SigningKey.from_pem(f.read())

    with open(filename, 'rb') as f:
        data = f.read()

    digest = hashlib.sha512(data).digest()
    signature = sk.sign_digest(digest, sigencode=sigencode_der, k=nonce())

    with open(filename + '.sign', 'wb') as f:
        f.write(signature)

    print(f"Signature written to {filename}.sign")


def verify_signature(filename):
    with open(PUB_FILE, 'rb') as f:
        vk = VerifyingKey.from_pem(f.read())

    with open(filename, 'rb') as f:
        data = f.read()

    with open(filename + '.sign', 'rb') as f:
        signature = f.read()

    digest = hashlib.sha512(data).digest()

    try:
        valid = vk.verify_digest(signature, digest, sigdecode=sigdecode_der)
        print("Signature is valid.")
    except BadSignatureError:
        print("Signature is invalid.")


def main():
    parser = argparse.ArgumentParser(description="ECDSA CLI with NIST P-521")
    subparsers = parser.add_subparsers(dest='command')

    subparsers.add_parser('genkeys', help='Generate ECDSA key pair')

    sign_parser = subparsers.add_parser('sign', help='Sign a file')
    sign_parser.add_argument('filename', help='File to sign')

    verify_parser = subparsers.add_parser('verify', help='Verify a file signature')
    verify_parser.add_argument('filename', help='File to verify')

    args = parser.parse_args()

    if args.command == 'genkeys':
        generate_keys()
    elif args.command == 'sign':
        sign_file(args.filename)
    elif args.command == 'verify':
        verify_signature(args.filename)
    else:
        parser.print_help()


if __name__ == '__main__':
    main()

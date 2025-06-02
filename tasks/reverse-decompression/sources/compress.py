import sys
from Crypto.Cipher import ARC4
from binascii import unhexlify

with open(sys.argv[1], "rb") as f:
    with open(sys.argv[2], "wb") as fOut:
        prompt_key = b"ENTER___PASSWORD"
        key = unhexlify("9a0f21228e68c35861baa66847c5dc36")
        cipher = ARC4.new(key)
        fOut.write(prompt_key + cipher.encrypt(f.read()))

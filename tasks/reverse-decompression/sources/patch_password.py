from binascii import unhexlify


with open("flag.zpaq", "rb") as f:
    with open("flag_pass.zpaq", "wb") as fOut:
        fOut.write(f.read().replace(b"ENTER___PASSWORD", unhexlify("9a0f21228e68c35861baa66847c5dc36"))) 

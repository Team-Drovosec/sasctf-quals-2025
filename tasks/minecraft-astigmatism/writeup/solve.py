from PIL import Image

key = Image.open("../sources/shaders/textures/key.png")
key = key.convert("RGB")


W, H = 101, 101
MAX_Y = 280
res = Image.open("blocks.png")
res = res.convert("RGB")


for y in range(1, MAX_Y):
    print(y)
    fixed = y ^ 0x5C
    for i in range(W):
        for j in range(H):
            posX, posY, posZ = i, y, j
            b = 0
            w = 0
            for bX in range(W):
                bZ = 0
                e = key.getpixel(
                    (((posX * 2 + bX * 3) * fixed) % 1499, (posZ * 4 + bZ * 9) % 1499)
                )
                c = res.getpixel((bX, bZ))
                ee = c[0] ^ e[0]
                if ee == 255:
                    w += 1
                else:
                    b += 1
            coeff = b / w
            if abs(coeff) < 0.2:
                print('Solution found:', posX, posY, posZ, b, w, b / w, 1 - coeff)  # posY is a camera position, so don't forget to subtract 1 for a player position
                # Solution found: 15 93 90 0 101 0.0 1.0
                # /tp 15 92 90

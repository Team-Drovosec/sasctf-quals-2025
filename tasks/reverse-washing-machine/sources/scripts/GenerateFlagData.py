from functools import reduce
from pathlib import Path
import typing
from PIL import Image
import random
import json


def EnumeratePixels(coords: typing.Tuple[int, int]) -> typing.Generator[typing.Tuple[int, int]]:
    for y in range(coords[1], coords[1] + 16):
        for x in range(coords[0], coords[0] + 16):
            yield (x, y)


def EnumerateQuadPixels(coords: typing.Tuple[int, int]) -> typing.Generator[typing.Tuple[int, int]]:
    yield from EnumeratePixels((coords[0] * 16, coords[1] * 16))


def Main():
    quads = []
    for y in reversed(range(64)):
        for x in range(128):
            quads.append((x, y))
    def GenerateQuadsShuffle(strNameTxt):
        pathShuffle = Path(strNameTxt)
        if pathShuffle.exists():
            with open(strNameTxt) as f:
                shuffleIndex = eval(f.read())
        else:
            shuffleIndex = list(range(len(quads)))
            random.shuffle(shuffleIndex)
            with open(strNameTxt, "w") as f:
                json.dump(shuffleIndex, f)
        return [quads[i] for i in shuffleIndex]

    v4Quads = GenerateQuadsShuffle("shuffle4.txt")
    v0Quads = GenerateQuadsShuffle("shuffle0.txt")

    flagClean = Image.open("FlagClean.png")
    pixelsClean = flagClean.load()
    width, height = flagClean.size

    if (pathFlag0 := Path("Flag0.png")).exists():
        flagDirty = Image.open(pathFlag0)
        pixelsDirty = flagDirty.load()
    else:
        flagOrig = Image.open("Flag0_orig.png")
        pixelsOrig = flagOrig.load()
        flagDirty = flagOrig.copy()
        pixelsDirty = flagDirty.load()
        for quadBefore, quadAfter in zip(quads, v0Quads):
            for (xBefore, yBefore), (xAfter, yAfter) in zip(EnumerateQuadPixels(quadBefore), EnumerateQuadPixels(quadAfter)):
                pixelsDirty[xBefore, height - yBefore - 1] = pixelsOrig[xAfter, height - yAfter - 1]
        flagDirty.save(pathFlag0)

    
    assert width % 128 == 0 and height % 64 == 0
    assert flagDirty.size == flagClean.size

    flagsPixels = [pixelsDirty]
    for i in range(1, 4):
        fname = f"Flag{i}.png"
        if Path(fname).exists():
            img = Image.open(fname)
            flagsPixels.append(img.load())
        else:
            flagV = flagClean.copy()
            pixels = flagV.load()
            for y in range(height):
                for x in range(width):
                    pixels[x, y] = (random.randint(0, 255), random.randint(0, 255), random.randint(0, 255))
            flagV.save(fname)
            flagsPixels.append(pixels)
    
    n = 0
    for path in Path("data").iterdir():
        if path.name.startswith("keys"):
            n += 1
    keys = [None] * n
    for path in Path("data").iterdir():
        if path.name.startswith("keys"):
            with open(path) as f:
                key = json.loads(f.read())
                ind = int(path.name[4:].split(".")[0])
                assert keys[ind] is None
                keys[ind] = key

    with open("data/finalXor.json") as f:
        finalXor = json.loads(f.read())
    with open("data/quads.json") as f:
        extraQuads = json.loads(f.read())

    flag4 = flagDirty.copy()
    pixels4 = flag4.load()

    v4Export = []
    for iQuad, (cleanQuad, origQuad, v4Quad, (quad1, quad2, quad3)) in enumerate(zip(quads, v0Quads, v4Quads, extraQuads)):
        for (xClean, yClean), (xBefore, yBefore), (xAfter, yAfter), (x1, y1), (x2, y2), (x3, y3) in zip(EnumerateQuadPixels(cleanQuad), EnumerateQuadPixels(origQuad), EnumerateQuadPixels(v4Quad), EnumeratePixels(quad1), EnumeratePixels(quad2), EnumeratePixels(quad3)):
            color = tuple([*map(lambda x: reduce(lambda j0, j1: j0^j1, x, 0), zip(
                pixelsDirty[xClean, height - yClean - 1][:3],
                pixelsClean[xBefore, height - yBefore - 1][:3],
                flagsPixels[1][x1, height - y1 - 1][:3],
                flagsPixels[2][x2, height - y2 - 1][:3],
                flagsPixels[3][x3, height - y3 - 1][:3],
            )), 255])
            pixels4[xAfter, height - yAfter - 1] = color

        shouldBe = (v4Quad[0] * 16) | ((v4Quad[1] * 16) << 12)
        v4Export.extend([shouldBe ^ finalXor[6 * iQuad + i] for i in range(6)])

    for iQuad, v4Quad in enumerate(v4Quads):
        for iTriangle in range(2):
            for key in reversed(keys):
                state = key[2 * iQuad + iTriangle]
                i, j = 0, 0
                for iVertex in range(3):
                    vertexId = 6 * iQuad + 3 * iTriangle + iVertex
                    key = 0
                    for shift in range(4):
                        i = ( i + 1 ) % 256
                        j = ( j + state[i] ) % 256
                        state[i], state[j] = state[j], state[i]
                        key |= state[( state[i] + state[j] ) % 256] << (shift * 8)
                    v4Export[vertexId] ^= key

    with open("v4.txt", "w") as f:
        json.dump(v4Export, f)
    flag4.save("Flag4.png")


if __name__ == "__main__":
    Main()

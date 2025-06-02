import amulet
from PIL import Image

level = amulet.load_level('./Astigmatism')
dim = 'minecraft:overworld'
size = 101
img = Image.new('1', (size, size))

for x in range(size):
    for z in range(size):
        b = level.get_block(x, 0, z, dim)
        img.putpixel((x, z), 0 if (str(b) == 'universal_minecraft:wool[color="black"]') else 1)

level.close()
img.save('blocks.png')

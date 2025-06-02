import json
from pathlib import Path
from ShapeKeyWrap.functions.transfer_shape_keys import transfer_shape_keys
from typing import Tuple
import bpy
import mathutils
import math
import dataclasses


BASE_PATH = Path(__file__).parent


@dataclasses.dataclass
class Triangle:
    uv0: Tuple[float, float]
    uv1: Tuple[float, float]
    uv2: Tuple[float, float]


def Main():
    mesh = bpy.data.meshes.new("flag")
    obj = bpy.data.objects.new(mesh.name, mesh)
    collection = bpy.data.collections["Flag"]
    collection.objects.link(obj)
    bpy.context.view_layer.objects.active = obj
    nXSize, nYSize = 1, 0.5
    nXQuads, nYQuads = 128, 64
    assert nXSize % nYSize == 0
    nTriangleSize = nXSize / nXQuads
    verts, faces = [], []
    quads = []

    for y in reversed(range(nYQuads)):
        for x in range(nXQuads):
            quads.append((x, y))

    with open(BASE_PATH.joinpath("shuffle0.txt")) as f:
        v0QuadsIndex = json.load(f)
        v0Quads = [quads[i] for i in v0QuadsIndex]
        v0QuadsInverseIndex = [i for _, i in sorted(zip(v0QuadsIndex, range(len(v0QuadsIndex))))]

    for x, y in v0Quads:
        verts.append((x * nTriangleSize, y * nTriangleSize, 0))
        verts.append((x * nTriangleSize, (y + 1) * nTriangleSize, 0))
        verts.append(((x + 1) * nTriangleSize, (y + 1) * nTriangleSize, 0))

        faces.append((len(verts) - 3, len(verts) - 2, len(verts) - 1))

        verts.append((x * nTriangleSize, y * nTriangleSize, 0))
        verts.append(((x + 1) * nTriangleSize, y * nTriangleSize, 0))
        verts.append(((x + 1) * nTriangleSize, (y + 1) * nTriangleSize, 0))

        faces.append((len(verts) - 3, len(verts) - 2, len(verts) - 1))

    mesh.from_pydata(verts, [], faces)
    mesh.update()

    nBit = 12
    deltaX = nXSize / (2**nBit - 1)
    deltaY = nYSize / (2**nBit - 1)

    for i in range(6):
        mesh.attributes.new(
            name=f"_v{i}", 
            type='INT', 
            domain='POINT'
        )

    with open(BASE_PATH.joinpath("v4.txt")) as f:
        v4Data = json.load(f)

    obj.active_material = bpy.data.materials["FlagMaterial"]

    # mesh.uv_layers.new(name="UVMap")
    # uv_layer = mesh.uv_layers.active

    # for poly in mesh.polygons:
    #     for loop_index in poly.loop_indices:
    #         vert_index = mesh.loops[loop_index].vertex_index
    #         vx, vy, _ = mesh.vertices[vert_index].co
    #         quad = quads[v0QuadsInverseIndex[v0QuadsIndex[vert_index//6]]]
    #         quad = [
    #             quad,
    #             (quad[0], quad[1]+1),
    #             (quad[0]+1, quad[1]+1),
    #             quad,
    #             (quad[0]+1, quad[1]),
    #             (quad[0]+1, quad[1]+1)
    #         ][vert_index%6]
    #         uv_layer.data[loop_index].uv = (quad[0] / nXQuads, quad[1] / nYQuads)

    if bpy.context.mode != 'OBJECT':
        bpy.ops.object.mode_set(mode='OBJECT')

    obj.location = bpy.data.objects["flagShapes"].location
    transfer_shape_keys(
        context=bpy.context,
        from_obj=bpy.data.objects["flagShapes"],
        to_objs=[obj],
        falloff=4,
        strength=1,
        overwrite_shape_keys=False,
        shape_keys=None,
        bind_noise=None,
        create_drivers=False
    )
    handsData = obj.data.shape_keys.key_blocks["Hands"].data
    insideData = obj.data.shape_keys.key_blocks["Inside"].data


    for i, (v0, v1, v2, v3, v4, v5) in enumerate(zip(*[mesh.attributes.get(f"_v{i}").data for i in range(6)])):
        def conv(x):
            assert 0 <= x < 2**24, x
            return x
        def convPair(x):
            x24 = x & 0xFFFFFF
            x8 = (x >> 24) & 0xFF
            assert 0 <= x24 < 2**24, x24
            assert 0 <= x8 < 2**8, x8
            return x24, x8

        if i % 6 == 0:
            q = quads[v0QuadsInverseIndex[v0QuadsIndex[i//6]]]
            v2.value = conv(q[0] * 16 | ((q[1] * 16) << 12)) # 24(21)
        x24, x8 = convPair(v4Data[i])
        hands = handsData[i].co
        assert 0 <= hands[0] <= nXSize, hands[0]
        assert 0 <= hands[1] <= nYSize, hands[1]
        assert 0 <= hands[2] <= nYSize, hands[2]
        handsCoords = [math.floor(hands[0] / deltaX), math.floor(hands[1] / deltaY), math.floor(hands[2] / deltaY)]

        inside = insideData[i].co
        xored = [
            math.floor(inside[0] / deltaX) ^ handsCoords[0],
            math.floor(inside[1] / deltaY) ^ handsCoords[1],
            math.floor(inside[2] / deltaY) ^ handsCoords[2],
        ]
        v0.value = conv(handsCoords[0] | (handsCoords[1] << 12)) # 24
        v1.value = conv(handsCoords[2]) | (x8 << 12) # 20
        v3.value = conv(xored[0] | (xored[1] << 12))
        v4.value = x24 # 24
        v5.value = conv(xored[2])


    obj.data.attributes.remove(obj.data.attributes["sharp_face"])
    sk = obj.data.shape_keys
    while sk and sk.key_blocks:
        obj.shape_key_remove(sk.key_blocks[-1])
        sk = obj.data.shape_keys 

    bpy.ops.object.mode_set(mode='OBJECT')
    for v in mesh.vertices:
        v.co = mathutils.Vector((0.5, 0.25, 0.0))
    mesh.update()

    obj.location = mathutils.Vector((-13.25, -0.5, 0.5))
    obj.rotation_euler = mathutils.Euler((0, 0, math.radians(90)), "XYZ")
    bpy.context.view_layer.update()

    src = bpy.data.objects["tagBase"]

    child = src.copy()
    child.name = "tag"
    child.hide_render = False
    bpy.context.collection.objects.link(child)

    world_matrix = child.matrix_world.copy()
    child.parent = obj
    child.matrix_parent_inverse = obj.matrix_world.inverted()
    child.matrix_world = world_matrix

    print("flag created")


Main()

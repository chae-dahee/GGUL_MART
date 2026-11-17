# 로비와 게임 장면이 함께 쓰는 거리와 매장 장면이다. import하면 장면을 만든다.
# 저해상도로 렌더하고 화면에서는 픽셀이 보이게 확대한다(디자인 컨셉안 2절).
import math
import random
from pathlib import Path

import bpy
from mathutils import Vector

ART = Path(__file__).resolve().parents[2] / "public" / "art"
RES = (480, 270)
FLOOR = 0.15

random.seed(7)
bpy.ops.wm.read_factory_settings(use_empty=True)
scene = bpy.context.scene


def rgba(hex_color):
    h = hex_color.lstrip("#")
    srgb = [int(h[i : i + 2], 16) / 255 for i in (0, 2, 4)]
    linear = [c / 12.92 if c <= 0.04045 else ((c + 0.055) / 1.055) ** 2.4 for c in srgb]
    return (*linear, 1.0)


_materials = {}


def mat(color, rough=0.6, emit=0.0, alpha=1.0, metal=0.0):
    key = (color, rough, emit, alpha, metal)
    if key in _materials:
        return _materials[key]
    m = bpy.data.materials.new(f"m{len(_materials)}")
    bsdf = next(n for n in m.node_tree.nodes if n.type == "BSDF_PRINCIPLED")
    bsdf.inputs["Base Color"].default_value = rgba(color)
    bsdf.inputs["Roughness"].default_value = rough
    bsdf.inputs["Metallic"].default_value = metal
    if emit:
        bsdf.inputs["Emission Color"].default_value = rgba(color)
        bsdf.inputs["Emission Strength"].default_value = emit
    if alpha < 1:
        bsdf.inputs["Alpha"].default_value = alpha
        if hasattr(m, "surface_render_method"):
            m.surface_render_method = "BLENDED"
        else:
            m.blend_method = "BLEND"
        if hasattr(m, "use_transparent_shadow"):
            m.use_transparent_shadow = True
    _materials[key] = m
    return m


def grime(color, dark, rough=0.6, scale=1.5, wet=None):
    """노이즈로 얼룩을 입힌다. wet을 주면 노이즈가 낮은 곳을 그 거칠기의 물웅덩이로 만든다."""
    m = bpy.data.materials.new("grime")
    nt = m.node_tree
    bsdf = next(n for n in nt.nodes if n.type == "BSDF_PRINCIPLED")
    coord = nt.nodes.new("ShaderNodeTexCoord")
    noise = nt.nodes.new("ShaderNodeTexNoise")
    noise.inputs["Scale"].default_value = scale
    noise.inputs["Detail"].default_value = 6
    # 크기를 정점에 직접 넣었으므로 Object 좌표가 미터 단위다.
    nt.links.new(coord.outputs["Object"], noise.inputs["Vector"])
    ramp = nt.nodes.new("ShaderNodeValToRGB")
    ramp.color_ramp.elements[0].position = 0.35
    ramp.color_ramp.elements[0].color = rgba(dark)
    ramp.color_ramp.elements[1].position = 0.65
    ramp.color_ramp.elements[1].color = rgba(color)
    nt.links.new(noise.outputs["Fac"], ramp.inputs["Fac"])
    nt.links.new(ramp.outputs["Color"], bsdf.inputs["Base Color"])
    bsdf.inputs["Roughness"].default_value = rough
    if wet is not None:
        puddle = nt.nodes.new("ShaderNodeValToRGB")
        puddle.color_ramp.interpolation = "CONSTANT"
        puddle.color_ramp.elements[0].position = 0.0
        puddle.color_ramp.elements[0].color = (wet, wet, wet, 1)
        puddle.color_ramp.elements[1].position = 0.42
        puddle.color_ramp.elements[1].color = (rough, rough, rough, 1)
        nt.links.new(noise.outputs["Fac"], puddle.inputs["Fac"])
        nt.links.new(puddle.outputs["Color"], bsdf.inputs["Roughness"])
    return m


def _finish(o, m, bevel):
    o.data.materials.append(m)
    if bevel > 0.002:
        mod = o.modifiers.new("bevel", "BEVEL")
        mod.width = bevel
        mod.segments = 2
        mod.limit_method = "ANGLE"
    return o


def box(x0, x1, y0, y1, z0, z1, m, bevel=0.02):
    bpy.ops.mesh.primitive_cube_add(size=1, location=((x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2))
    o = bpy.context.object
    size = (x1 - x0, y1 - y0, z1 - z0)
    # 스케일 대신 정점에 크기를 넣어야 Bevel 폭이 축마다 같다.
    for v in o.data.vertices:
        v.co = Vector(tuple(c * s for c, s in zip(v.co, size)))
    return _finish(o, m, min(bevel, min(size) / 3))


def cyl(x, y, z0, z1, r, m, verts=14, bevel=0.01):
    bpy.ops.mesh.primitive_cylinder_add(vertices=verts, radius=r, depth=z1 - z0, location=(x, y, (z0 + z1) / 2))
    return _finish(bpy.context.object, m, bevel)


def lathe(profile, x, y, z, m, segs=12, smooth=True):
    """(반지름, 높이) 단면을 z축으로 돌려 병·컵 같은 회전체를 만든다."""
    n = len(profile)
    verts = [
        (r * math.cos(2 * math.pi * i / segs), r * math.sin(2 * math.pi * i / segs), h)
        for i in range(segs)
        for r, h in profile
    ]
    faces = [
        (i * n + k, (i + 1) % segs * n + k, (i + 1) % segs * n + k + 1, i * n + k + 1)
        for i in range(segs)
        for k in range(n - 1)
    ]
    mesh = bpy.data.meshes.new("lathe")
    mesh.from_pydata(verts, [], faces)
    mesh.update()
    for p in mesh.polygons:
        p.use_smooth = smooth
    o = bpy.data.objects.new("lathe", mesh)
    o.location = (x, y, z)
    scene.collection.objects.link(o)
    mesh.materials.append(m)
    return o


def tube(points, radius, m):
    """점들을 지나는 매끈한 곡선 관을 만든다."""
    data = bpy.data.curves.new("tube", "CURVE")
    data.dimensions = "3D"
    data.bevel_depth = radius
    data.bevel_resolution = 2
    data.resolution_u = 10
    spline = data.splines.new("BEZIER")
    spline.bezier_points.add(len(points) - 1)
    for bp, p in zip(spline.bezier_points, points):
        bp.co = p
        bp.handle_left_type = bp.handle_right_type = "AUTO"
    data.materials.append(m)
    o = bpy.data.objects.new("tube", data)
    scene.collection.objects.link(o)
    return o


BOTTLE = [(0, 0), (0.04, 0), (0.045, 0.02), (0.045, 0.16), (0.03, 0.2), (0.014, 0.23), (0.014, 0.26), (0, 0.26)]
CAN = [(0, 0), (0.028, 0), (0.033, 0.01), (0.033, 0.11), (0.028, 0.125), (0, 0.125)]
CUP = [(0, 0), (0.035, 0), (0.05, 0.1), (0.052, 0.11), (0, 0.11)]


def light(kind, loc, energy, color, size=0.5, rot=(0, 0, 0)):
    data = bpy.data.lights.new(kind, kind)
    data.energy = energy
    data.color = rgba(color)[:3]
    if kind == "AREA":
        data.shape = "RECTANGLE"
        data.size, data.size_y = size if isinstance(size, tuple) else (size, size)
    elif kind == "SPOT":
        data.spot_size = math.radians(80)
        data.spot_blend = 0.6
    else:
        data.shadow_soft_size = size
    o = bpy.data.objects.new(kind, data)
    o.location = loc
    o.rotation_euler = rot
    scene.collection.objects.link(o)
    return data


def lit_windows(x0, x1, y, z0, z1, chance):
    """정면이 -y를 향하는 건물 벽에 창문을 드문드문 켠다."""
    dark = mat("#0b0c14", 0.3)
    on = [mat("#8bd9e2", 0.5, 0.25), mat("#c6f1f5", 0.5, 0.15)]
    x = x0 + 0.8
    while x + 0.8 < x1:
        z = z0
        while z + 1.1 < z1:
            m = random.choice(on) if random.random() < chance else dark
            box(x, x + 0.8, y - 0.05, y, z, z + 1.1, m)
            z += 2.8
        x += 2.2


# 거리와 주변 건물
road = grime("#151a21", "#0b0e12", 0.6, 0.35, wet=0.04)
box(-60, 60, -45, -3.15, -0.02, 0, road)
line = mat("#9aa6b2", 0.5)
for x in range(-40, 40, 3):
    box(x, x + 1.5, -10.06, -9.94, 0, 0.005, line)
box(-60, 60, -3.15, -2.95, 0, 0.17, mat("#4a5664", 0.6), bevel=0.06)
box(-60, 60, -2.95, 0, 0, FLOOR, grime("#2f3944", "#1c232b", 0.5, 0.8, wet=0.12))

neighbor = grime("#1d242c", "#12171c", 0.8, 0.6)
shutter = mat("#2a3640", 0.4, metal=0.6)
box(-22, -6.05, 0, 12, 0, 11, neighbor)
box(-20, -7, -0.05, 0, FLOOR, 3.0, shutter)
for z in [x * 0.18 for x in range(1, 16)]:
    box(-20, -7, -0.07, -0.05, FLOOR + z, FLOOR + z + 0.03, neighbor)
lit_windows(-22, -6.05, 0, 4.5, 11, 0.12)
box(6.05, 22, 0, 12, 0, 8, neighbor)
lit_windows(6.05, 22, 0, 4.5, 8, 0.25)

far = mat("#0e0d1c", 0.9)
x = -60
while x < 60:
    w = random.uniform(6, 12)
    h = random.uniform(14, 34)
    y = random.uniform(22, 30)
    box(x, x + w, y, y + 10, 0, h, far)
    lit_windows(x, x + w, y, 3, h, 0.12)
    x += w + random.uniform(0.5, 2)

# 편의점 외벽과 간판
frame = mat("#3a4450", 0.5, metal=0.4)
facade = grime("#dfe6e8", "#a9b2b6", 0.6, 1.2)
glass = mat("#bfe9ee", 0.05, alpha=0.12)
W0, W1 = -5.6, 2.6
D0, D1 = 3.0, 4.8
WIN_TOP = FLOOR + 3.0
DOOR_TOP = FLOOR + 2.6

box(-6, -5.6, 0, 0.3, FLOOR, 4.2, facade)
box(2.6, 3.0, 0, 0.3, FLOOR, 4.2, facade)
box(4.8, 6, 0, 0.3, FLOOR, 4.2, facade)
box(W0, W1, 0, 0.3, FLOOR, FLOOR + 0.5, facade)
box(W0, W1, 0, 0.3, WIN_TOP, 4.2, facade)
box(D0, D1, 0, 0.3, DOOR_TOP, 4.2, facade)
box(W0, W1, 0.14, 0.16, FLOOR + 0.5, WIN_TOP, glass)
for x in (-2.9, -0.15):
    box(x - 0.04, x + 0.04, 0.1, 0.2, FLOOR + 0.5, WIN_TOP, frame)
box(D0, D1, 0.14, 0.16, FLOOR, DOOR_TOP, glass)
box(3.88, 3.92, 0.1, 0.2, FLOOR, DOOR_TOP, frame)
for x0, x1 in ((D0, 3.1), (4.7, D1)):
    box(x0, x1, 0.1, 0.2, FLOOR, DOOR_TOP, frame)

# 간판은 가상 브랜드가 정해질 때까지 글자 없이 둔다.
box(-6.2, 6.2, -0.5, 0.1, 3.45, 4.35, mat("#242238", 0.5))
box(-5.9, 5.9, -0.52, -0.5, 3.6, 4.2, mat("#eef8fa", 0.5, 0.6))
box(-6.2, 6.2, -0.53, -0.5, 3.47, 3.53, mat("#8bd9e2", 0.4, 4.0))
box(-6.2, 6.2, -1.6, 0.0, 3.3, 3.42, frame)

# 매장 내부
floor = mat("#c9d3d8", 0.25)
wall = mat("#dfe6e8", 0.7)
box(-6, 6, 0.3, 7.3, FLOOR - 0.02, FLOOR, floor)
box(-6, 3.2, 7.0, 7.3, FLOOR, 4.2, wall)
box(4.4, 6, 7.0, 7.3, FLOOR, 4.2, wall)
box(3.2, 4.4, 7.0, 7.3, FLOOR + 2.2, 4.2, wall)
box(-6.3, -6, 0, 7.3, FLOOR, 4.2, wall)
box(6, 6.3, 0, 11.3, FLOOR, 4.2, wall)

# 창고: 뒷벽의 문으로 이어진다.
steel = mat("#7f8fa0", 0.45, metal=0.6)
box(3.2, 3.26, 7.0, 7.3, FLOOR, FLOOR + 2.2, frame)
box(4.34, 4.4, 7.0, 7.3, FLOOR, FLOOR + 2.2, frame)
door = box(3.26, 4.34, 7.12, 7.18, FLOOR, FLOOR + 2.18, steel)
DOOR_OPEN = math.radians(80)
door.rotation_euler[2] = DOOR_OPEN
door.location = (3.26 + 0.54 * math.cos(DOOR_OPEN), 7.15 + 0.54 * math.sin(DOOR_OPEN), door.location.z)
box(1.8, 6, 7.3, 11.3, FLOOR - 0.02, FLOOR, mat("#8a9298", 0.6))
box(1.8, 6, 11.0, 11.3, FLOOR, 4.2, wall)
box(1.5, 1.8, 7.3, 11.3, FLOOR, 4.2, wall)
box(1.8, 6, 7.3, 11.3, FLOOR + 2.9, FLOOR + 3.0, mat("#c9cfd2", 0.8))
box(3.4, 4.6, 9.2, 9.32, FLOOR + 2.84, FLOOR + 2.9, mat("#e6f9fb", 0.3, 5.0))
light("AREA", (4.0, 9.2, FLOOR + 2.8), 40, "#e6f7fa", (1.2, 0.3))
cardboard = [mat(c, 0.8) for c in ("#a8875c", "#b8966a", "#9a7a52")]
for x0, x1, y0, y1 in ((1.85, 2.45, 7.6, 10.9), (5.4, 5.95, 7.6, 10.9)):
    for z in (0.1, 0.8, 1.5, 2.2):
        box(x0, x1, y0, y1, FLOOR + z, FLOOR + z + 0.03, steel, bevel=0.01)
        y = y0 + 0.05
        while y < y1 - 0.5:
            w = random.uniform(0.35, 0.55)
            box(x0 + 0.03, x1 - 0.03, y, y + w, FLOOR + z + 0.03, FLOOR + z + random.uniform(0.3, 0.55),
                random.choice(cardboard), bevel=0.01)
            y += w + 0.04
    for y in (y0, y1 - 0.04):
        for x in (x0, x1 - 0.04):
            box(x, x + 0.04, y, y + 0.04, FLOOR, FLOOR + 2.6, steel, bevel=0.005)
BUCKET = [(0, 0), (0.15, 0), (0.18, 0.3), (0.19, 0.32), (0.17, 0.32), (0, 0.32)]
lathe(BUCKET, 3.3, 10.5, FLOOR, mat("#e0c46c", 0.5), 14)
tube([(3.3, 10.5, FLOOR + 0.2), (3.35, 10.6, FLOOR + 0.9), (3.4, 10.75, FLOOR + 1.4)], 0.015, mat("#9aa6b2", 0.5))
box(-6, 6, 0.3, 7.3, FLOOR + 3.25, FLOOR + 3.35, mat("#e6ecee", 0.8))

fluorescent = mat("#e6f9fb", 0.3, 8.0)
for y in (1.5, 3.5, 5.5):
    for x in (-4.5, -1.5, 1.5, 4.5):
        box(x - 0.7, x + 0.7, y - 0.06, y + 0.06, FLOOR + 3.18, FLOOR + 3.25, fluorescent)
        light("AREA", (x, y, FLOOR + 3.15), 60, "#e6f7fa", (1.6, 0.4))

PRODUCT_COLORS = ["#e0c46c", "#7fb3c8", "#d8cfb8", "#9aa6b2", "#6f8f6a", "#c79a6b", "#8c7fb0", "#f1eee6"]
gondola = mat("#5c6a78", 0.5, metal=0.3)


def product(kind, x, y, z, color):
    """상품 하나를 놓고 차지한 폭을 돌려준다."""
    if kind == "bottle":
        lathe(BOTTLE, x + 0.05, y, z, mat(color, 0.15), 10)
        return 0.11
    if kind == "can":
        lathe(CAN, x + 0.04, y, z, mat(color, 0.3, metal=0.5), 10)
        return 0.08
    if kind == "cup":
        lathe(CUP, x + 0.055, y, z, mat(color, 0.5), 10)
        return 0.12
    if kind == "bag":
        box(x, x + 0.18, y - 0.05, y + 0.05, z, z + 0.26, mat(color, 0.35), bevel=0.04)
        return 0.2
    box(x, x + 0.16, y - 0.08, y + 0.08, z, z + 0.2, mat(color, 0.6), bevel=0.01)
    return 0.18


def gondola_row(x0, x1, y0, y1, height):
    box(x0, x1, y0, y1, FLOOR, FLOOR + 0.12, gondola)
    box(x0, x1, (y0 + y1) / 2 - 0.03, (y0 + y1) / 2 + 0.03, FLOOR, FLOOR + height, gondola)
    levels = [FLOOR + 0.12 + i * 0.38 for i in range(int(height / 0.38))]
    for z in levels:
        box(x0, x1, y0, y1, z, z + 0.03, gondola, bevel=0.01)
        for face in (y0 + 0.1, y1 - 0.1):
            x = x0 + 0.04
            # 진열은 규칙적으로 유지해야 위치 변화가 단서로 읽힌다(디자인 컨셉안 2절).
            while x < x1 - 0.25:
                kind = random.choice(["bottle", "can", "cup", "bag", "box"])
                color = random.choice(PRODUCT_COLORS)
                for _ in range(6):
                    if x > x1 - 0.25:
                        break
                    x += product(kind, x, face, z + 0.03, color) + 0.02


gondola_row(-5.2, 1.8, 1.9, 2.5, 1.5)
gondola_row(-5.2, 1.8, 4.0, 4.6, 1.7)

# 음료 냉장고
fridge = mat("#1b232b", 0.5)
box(-5.8, 1.6, 6.3, 7.0, FLOOR, FLOOR + 0.25, fridge)
box(-5.8, 1.6, 6.3, 7.0, FLOOR + 2.2, FLOOR + 2.4, fridge)
box(-5.8, -5.7, 6.3, 7.0, FLOOR, FLOOR + 2.4, fridge)
box(1.5, 1.6, 6.3, 7.0, FLOOR, FLOOR + 2.4, fridge)
box(-5.7, 1.5, 6.9, 6.95, FLOOR + 0.25, FLOOR + 2.2, mat("#c6f1f5", 0.4, 2.0))
box(-5.7, 1.5, 6.3, 6.32, FLOOR + 0.25, FLOOR + 2.2, glass, bevel=0)
for z in (0.3, 0.8, 1.3, 1.8):
    box(-5.7, 1.5, 6.4, 6.9, FLOOR + z - 0.02, FLOOR + z, mat("#bfe9ee", 0.2, alpha=0.4), bevel=0)
    x = -5.6
    color = random.choice(PRODUCT_COLORS)
    i = 0
    while x < 1.4:
        if i % 8 == 0:
            color = random.choice(PRODUCT_COLORS)
        lathe(BOTTLE, x, 6.65, FLOOR + z, mat(color, 0.15), 10)
        x += 0.11
        i += 1
for x in (-4.0, -2.2, -0.4):
    box(x - 0.03, x + 0.03, 6.28, 6.32, FLOOR, FLOOR + 2.3, frame)

# 카운터와 POS
# 손님은 x가 작은 쪽, 직원은 x가 큰 쪽에 선다.
COUNTER_X = (3.7, 4.5)
box(*COUNTER_X, 1.6, 4.4, FLOOR, FLOOR + 1.0, mat("#2e3742", 0.5), bevel=0.03)
box(3.65, 4.55, 1.55, 4.45, FLOOR + 1.0, FLOOR + 1.06, mat("#4a5664", 0.4), bevel=0.02)
box(4.05, 4.35, 2.9, 3.3, FLOOR + 1.06, FLOOR + 1.36, mat("#1b2027", 0.5), bevel=0.02)
box(4.35, 4.37, 2.93, 3.27, FLOOR + 1.1, FLOOR + 1.32, mat("#8bd9e2", 0.4, 2.0))
lathe(BOTTLE, 3.85, 2.6, FLOOR + 1.06, mat("#bfe9ee", 0.1), 12)
box(3.85, 4.05, 3.6, 3.8, FLOOR + 1.06, FLOOR + 1.1, mat("#1b2027", 0.5), bevel=0.01)

# 근무용 매뉴얼 바인더와 CCTV 모니터. 게임에서 눌러 여는 대상이다.
box(3.75, 4.05, 2.12, 2.45, FLOOR + 1.06, FLOOR + 1.13, mat("#242238", 0.6), bevel=0.01)
box(3.77, 4.03, 2.13, 2.44, FLOOR + 1.075, FLOOR + 1.115, mat("#f1eee6", 0.8), bevel=0)
box(4.15, 4.27, 1.65, 2.05, FLOOR + 1.1, FLOOR + 1.42, mat("#1b2027", 0.5), bevel=0.02)
box(4.27, 4.28, 1.68, 2.02, FLOOR + 1.13, FLOOR + 1.39, mat("#9aa6b2", 0.4, 1.5), bevel=0)
box(4.18, 4.24, 1.8, 1.9, FLOOR + 1.06, FLOOR + 1.1, mat("#1b2027", 0.5), bevel=0.01)

# 직원 뒤 담배 진열장
box(5.65, 6.0, 1.6, 4.4, FLOOR, FLOOR + 2.4, mat("#2e3742", 0.5))
for z in (1.2, 1.5, 1.8, 2.1):
    y = 1.68
    while y < 4.3:
        box(5.6, 5.65, y, y + 0.06, FLOOR + z, FLOOR + z + 0.1, mat(random.choice(PRODUCT_COLORS), 0.5), bevel=0)
        y += 0.08

# 입구 안쪽: 출입 감지기와 우산꽂이
box(3.75, 4.05, 0.3, 0.4, DOOR_TOP + 0.08, DOOR_TOP + 0.2, mat("#d9e2e6", 0.5), bevel=0.02)
box(3.88, 3.92, 0.4, 0.41, DOOR_TOP + 0.12, DOOR_TOP + 0.16, mat("#8bd9e2", 0.3, 6.0), bevel=0)
STAND = [(0, 0), (0.14, 0), (0.15, 0.5), (0.13, 0.5)]
lathe(STAND, 2.35, 0.7, FLOOR, mat("#5c6a78", 0.4, metal=0.5), 14)
for dx, dy in ((0.03, 0.02), (-0.04, 0.03), (0.0, -0.05)):
    tube([(2.35 + dx, 0.7 + dy, FLOOR + 0.1), (2.35 + dx * 2, 0.7 + dy * 2, FLOOR + 0.9)], 0.02, mat("#242238", 0.6))

# 매장 앞 소품
box(-5.4, -4.5, -0.95, -0.25, FLOOR, FLOOR + 1.85, mat("#d9e2e6", 0.5), bevel=0.06)
box(-5.3, -4.6, -0.97, -0.95, FLOOR + 0.9, FLOOR + 1.7, mat("#c6f1f5", 0.4, 1.5))
for z in (1.0, 1.25, 1.5):
    for i in range(5):
        x = -5.25 + i * 0.13
        box(x, x + 0.08, -0.99, -0.97, FLOOR + z, FLOOR + z + 0.16, mat(random.choice(PRODUCT_COLORS), 0.4))
box(-5.3, -4.6, -0.97, -0.95, FLOOR + 0.3, FLOOR + 0.5, mat("#1b2027", 0.5))
BIN = [(0, 0), (0.24, 0), (0.28, 0.05), (0.28, 0.72), (0.3, 0.76), (0.26, 0.84), (0.14, 0.88), (0, 0.89)]
lathe(BIN, 5.5, -0.6, FLOOR, mat("#5c6a78", 0.45, metal=0.4), 16)

# 문 앞 매트와 화분
box(3.2, 4.6, -0.9, -0.1, FLOOR, FLOOR + 0.015, mat("#242238", 0.9), bevel=0.005)
POT = [(0, 0), (0.16, 0), (0.22, 0.38), (0.24, 0.42), (0, 0.42)]
lathe(POT, 2.75, -0.55, FLOOR, mat("#4a5664", 0.6), 12)
leaf = mat("#2f4a3a", 0.7)
for dx, dy, dz, r in ((0, 0, 0.62, 0.26), (0.12, -0.08, 0.84, 0.18), (-0.1, 0.05, 0.8, 0.17)):
    bpy.ops.mesh.primitive_ico_sphere_add(subdivisions=1, radius=r, location=(2.75 + dx, -0.55 + dy, FLOOR + dz))
    o = bpy.context.object
    o.rotation_euler = (random.random(), random.random(), random.random())
    o.data.materials.append(leaf)

# 유리창 안쪽 포스터
for x0, color in ((-5.3, "#d8cfb8"), (-2.6, "#7fb3c8"), (1.6, "#e0c46c")):
    box(x0, x0 + 0.7, 0.18, 0.19, FLOOR + 1.8, FLOOR + 2.8, mat(color, 0.6), bevel=0.005)

# 연석의 차량 진입 방지봉
BOLLARD = [(0, 0), (0.07, 0), (0.07, 0.75), (0.06, 0.8), (0.03, 0.83), (0, 0.84)]
for x in (-3.5, 0.0, 3.5):
    lathe(BOLLARD, x, -2.7, FLOOR, mat("#9aa6b2", 0.4, metal=0.5), 12)

pole = mat("#2a3640", 0.4, metal=0.6)
cyl(-9, -2.7, 0, 5.6, 0.09, pole, 12)
tube([(-9, -2.7, 5.5), (-9, -2.8, 6.1), (-9, -3.5, 6.35), (-9, -4.1, 6.2)], 0.05, pole)
SHADE = [(0, 0.22), (0.12, 0.22), (0.28, 0.02), (0.3, 0)]
lathe(SHADE, -9, -4.15, 5.95, pole, 14, smooth=False)
bpy.ops.mesh.primitive_uv_sphere_add(segments=12, ring_count=6, radius=0.1, location=(-9, -4.15, 5.97))
bpy.context.object.data.materials.append(mat("#cfeff3", 0.3, 12.0))
light("SPOT", (-9, -4.15, 5.9), 900, "#cfeff3")

# 전봇대와 전선
wood = mat("#3a3a40", 0.8)
for px in (-17, 15):
    cyl(px, -2.6, 0, 9.5, 0.16, wood, 12)
    box(px - 0.9, px + 0.9, -2.7, -2.5, 8.9, 9.05, wood)
    box(px - 0.25, px + 0.25, -2.85, -2.6, 3.0, 3.7, mat("#5c6a78", 0.5), bevel=0.03)
wire = mat("#0b0c10", 0.6)
for dx, sag in ((-0.8, 1.4), (0, 1.1), (0.8, 1.6)):
    tube([(-17 + dx, -2.6, 9.0), (-1 + dx, -2.6, 9.0 - sag), (15 + dx, -2.6, 9.0)], 0.012, wire)
tube([(-17, -2.6, 8.4), (-11, -1.2, 7.0), (-6.1, -0.2, 6.2)], 0.012, wire)

# 유리를 통과한 매장 빛이 보도에 번지는 효과를 대신한다.
spill = light("AREA", (0, -1.0, 3.3), 250, "#d6f4f8", (12, 1.5))
# 실제 광원이 아니므로 물웅덩이에 비치면 안 된다.
spill.specular_factor = 0
light("POINT", (-30, -60, 40), 2000, "#3a3a6a", 5)

# 옅은 안개로 조명 둘레에 빛무리를 만든다.
fog = bpy.data.materials.new("fog")
fog.node_tree.nodes.clear()
fog_out = fog.node_tree.nodes.new("ShaderNodeOutputMaterial")
scatter = fog.node_tree.nodes.new("ShaderNodeVolumeScatter")
scatter.inputs["Density"].default_value = 0.012
fog.node_tree.links.new(scatter.outputs["Volume"], fog_out.inputs["Volume"])
# 매장 안까지 덮으면 벽에 얼룩처럼 보이므로 거리 쪽에만 둔다.
fog_box = box(-40, 40, -30, -0.05, -0.1, 30, fog, bevel=0)

world = bpy.data.worlds.new("night")
scene.world = world
background = next(n for n in world.node_tree.nodes if n.type == "BACKGROUND")
background.inputs["Color"].default_value = rgba("#16152a")
background.inputs["Strength"].default_value = 0.5

cam_data = bpy.data.cameras.new("cam")
camera = bpy.data.objects.new("cam", cam_data)
scene.collection.objects.link(camera)
scene.camera = camera

try:
    scene.render.engine = "BLENDER_EEVEE_NEXT"
except TypeError:
    scene.render.engine = "BLENDER_EEVEE"
if hasattr(scene.eevee, "use_raytracing"):
    scene.eevee.use_raytracing = True
scene.eevee.taa_render_samples = 64
scene.eevee.volumetric_end = 80
scene.render.resolution_x, scene.render.resolution_y = RES
scene.render.resolution_percentage = 100
scene.render.filter_size = 0.6
try:
    scene.view_settings.view_transform = "Standard"
    scene.view_settings.exposure = 0.4
except TypeError:
    pass

scene.render.image_settings.file_format = "PNG"

# 여기까지 만든 형태는 매장이다. 이후에 세우는 사람은 장면 컬렉션에 남아 레이어로 따로 렌더할 수 있다.
store = bpy.data.collections.new("store")
scene.collection.children.link(store)


def to_store(objects):
    for o in objects:
        if o.type in {"MESH", "CURVE"} and o.name in scene.collection.objects:
            store.objects.link(o)
            scene.collection.objects.unlink(o)


to_store(list(scene.collection.objects))


LEG = [(0, 0), (0.06, 0), (0.065, 0.4), (0.075, 0.78), (0, 0.8)]
TORSO = [(0, 0), (0.17, 0), (0.18, 0.1), (0.16, 0.3), (0.19, 0.5), (0.2, 0.58), (0.12, 0.64), (0, 0.65)]

# 외형별 색과 덧붙이는 형태다. 외형은 정체를 알려 주지 않는다(디자인 컨셉안 4절).
LOOKS = {
    "plain": {"top": "#3b4250", "pants": "#2a2a30", "hair": "#2a2a30"},
    "office": {"top": "#4a5664", "pants": "#1b2027", "hair": "#1b2027"},
    "student": {"top": "#4f6b58", "pants": "#2f3944", "hair": "#2a2a30", "hood": "#4f6b58"},
    "elder": {"top": "#6b5d4c", "pants": "#3a3a40", "hair": "#9aa6b2"},
    "butcher": {"top": "#3a3a40", "pants": "#2a2a30", "hair": "#1b2027", "apron": "#d8d4cc"},
    "hooded": {"top": "#1b2027", "pants": "#1b2027", "hair": "#1b2027", "hood": "#1b2027", "faceless": True},
    "staff": {"top": "#d9e2e6", "pants": "#2a2a30", "hair": "#2a2a30", "vest": "#2d6b74"},
    "tall": {"top": "#242238", "pants": "#1b2027", "hair": "#0b0c10", "stretch": 1.35},
}


def person(x, y, yaw_deg, look="plain", ghost=None):
    """사람 한 명을 세우고 루트 오브젝트를 돌려준다."""
    spec = LOOKS[look]
    pick = (lambda color, rough=0.6: ghost) if ghost else mat
    skin = "#b9b3aa"
    parts = [
        box(-0.15, -0.03, -0.14, 0.06, 0, 0.08, pick("#1b2027"), bevel=0.02),
        box(0.03, 0.15, -0.14, 0.06, 0, 0.08, pick("#1b2027"), bevel=0.02),
        lathe(LEG, -0.09, 0, 0.06, pick(spec["pants"]), 10),
        lathe(LEG, 0.09, 0, 0.06, pick(spec["pants"]), 10),
        lathe(TORSO, 0, 0, 0.82, pick(spec["top"], 0.8), 14),
        cyl(0, 0, 1.45, 1.53, 0.05, pick(skin), 10),
    ]
    parts[4].scale = (1, 0.65, 1)
    bpy.ops.mesh.primitive_uv_sphere_add(segments=14, ring_count=8, radius=0.11, location=(0, 0, 1.62))
    head = bpy.context.object
    head.scale = (0.95, 1.0, 1.12)
    head.data.materials.append(pick(skin))
    bpy.ops.mesh.primitive_uv_sphere_add(segments=14, ring_count=8, radius=0.118, location=(0, 0.03, 1.7))
    hair = bpy.context.object
    hair.scale = (1.0, 1.0, 0.7)
    hair.data.materials.append(pick(spec["hair"]))
    parts += [head, hair]
    if "hood" in spec:
        bpy.ops.mesh.primitive_uv_sphere_add(segments=14, ring_count=8, radius=0.15, location=(0, 0.04, 1.64))
        hood = bpy.context.object
        hood.scale = (1.0, 1.0, 1.1)
        hood.data.materials.append(pick(spec["hood"], 0.9))
        parts.append(hood)
    if spec.get("faceless"):
        # 후드 그늘에 가려 얼굴이 보이지 않는다. 얼굴을 과장해 그리지 않는다(디자인 컨셉안 7절).
        parts.append(box(-0.085, 0.085, -0.12, -0.1, 1.52, 1.72, pick("#050608", 1.0), bevel=0.02))
    if "apron" in spec:
        parts.append(box(-0.16, 0.16, -0.15, -0.12, 0.7, 1.38, pick(spec["apron"], 0.7), bevel=0.01))
        for sx, sz, s in ((-0.06, 1.05, 0.07), (0.05, 0.9, 0.05), (0.09, 1.2, 0.04), (-0.02, 0.8, 0.06)):
            parts.append(box(sx - s, sx + s, -0.155, -0.15, sz - s, sz + s * 1.6, pick("#3a2522", 0.4), bevel=0))
    if "vest" in spec:
        parts.append(box(-0.19, 0.19, -0.14, 0.12, 0.95, 1.4, pick(spec["vest"], 0.7), bevel=0.04))
    for side in (-1, 1):
        parts.append(tube([(side * 0.2, 0, 1.42), (side * 0.24, -0.03, 1.13), (side * 0.19, -0.12, 0.9)], 0.045,
                          pick(spec["top"], 0.8)))
        bpy.ops.mesh.primitive_ico_sphere_add(subdivisions=1, radius=0.045, location=(side * 0.19, -0.13, 0.86))
        bpy.context.object.data.materials.append(pick(skin))
        parts.append(bpy.context.object)
    root = bpy.data.objects.new("person", None)
    scene.collection.objects.link(root)
    root.location = (x, y, FLOOR)
    # 몸의 정면은 로컬 -y다.
    root.rotation_euler[2] = math.radians(yaw_deg)
    root.scale = (0.92, 0.92, spec.get("stretch", 1.0))
    for o in parts:
        o.parent = root
    return root


def remove(root):
    for o in list(root.children) + [root]:
        bpy.data.objects.remove(o, do_unlink=True)


# 정면 유리의 y 좌표다. 밤에는 유리가 매장 안을 비추므로 반사상을 이 면 바깥에 대칭으로 둔다.
GLASS_Y = 0.15


def mirror_y(y):
    return 2 * GLASS_Y - y


def reflection_material():
    return mat("#7f8fa0", 0.5, 0.3, alpha=0.3)


def counter_reflection():
    """카운터 카메라에서만 보여야 하므로 렌더할 때만 켠다."""
    m = reflection_material()
    objects = [
        box(3.65, 4.55, mirror_y(4.45), mirror_y(1.55), FLOOR, FLOOR + 1.06, m),
        box(4.05, 4.35, mirror_y(3.3), mirror_y(2.9), FLOOR + 1.06, FLOOR + 1.36, m),
    ]
    to_store(objects)
    return objects


def project(x0, x1, y0, y1, z0, z1):
    """월드 상자를 현재 카메라 렌더 이미지의 픽셀 사각형으로 바꾼다."""
    from bpy_extras.object_utils import world_to_camera_view

    bpy.context.view_layer.update()
    xs, ys = [], []
    for x in (x0, x1):
        for y in (y0, y1):
            for z in (z0, z1):
                p = world_to_camera_view(scene, camera, Vector((x, y, z)))
                if p.z > 0:
                    xs.append(min(max(p.x, 0), 1) * RES[0])
                    ys.append((1 - min(max(p.y, 0), 1)) * RES[1])
    return {"x": round(min(xs)), "y": round(min(ys)), "w": round(max(xs) - min(xs)), "h": round(max(ys) - min(ys))}


def render(name, loc, target, lens=24, exposure=0.4):
    """public/art/{name}.png로 렌더한다."""
    scene.view_settings.exposure = exposure
    cam_data.lens = lens
    camera.location = Vector(loc)
    camera.rotation_euler = (Vector(target) - camera.location).to_track_quat("-Z", "Y").to_euler()
    out = ART / f"{name}.png"
    out.parent.mkdir(parents=True, exist_ok=True)
    scene.render.filepath = str(out)
    bpy.ops.render.render(write_still=True)


def render_layer(name, loc, target, lens=24, exposure=0.4):
    """사람만 투명 배경에 렌더한다. 매장은 holdout으로 가림만 남긴다.

    유리는 숨긴다. 남겨 두면 유리 바깥의 반사상까지 가려진다.
    """
    holdout = bpy.context.view_layer.layer_collection.children["store"]
    hidden = [fog_box] + [o for o in store.objects if o.active_material == glass]
    holdout.holdout = True
    scene.render.film_transparent = True
    scene.render.image_settings.color_mode = "RGBA"
    for o in hidden:
        o.hide_render = True
    render(name, loc, target, lens, exposure)
    for o in hidden:
        o.hide_render = False
    holdout.holdout = False
    scene.render.film_transparent = False
    scene.render.image_settings.color_mode = "RGB"

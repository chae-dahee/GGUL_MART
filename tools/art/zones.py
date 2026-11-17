# 게임 구역 장면과 CCTV 화면을 렌더한다.
# 실행: blender -b -P tools/art/zones.py
# 결과: public/art/zones/*.png, public/art/layers/*.png, public/art/cctv/*.png, src/content/hotspots.ts
# 구역마다 카메라는 고정이다. 이상 변형은 같은 카메라로 렌더해야 기준 장면과 비교할 수 있다(디자인 컨셉안 2·3절).
import json
import math
import sys
from pathlib import Path

import bpy

sys.path.insert(0, str(Path(__file__).parent))
import kit  # noqa: E402

F = kit.FLOOR
EYE = F + 1.55
HOTSPOTS = Path(__file__).resolve().parents[2] / "src" / "content" / "hotspots.ts"

CAMS = {
    "counter": ((5.2, 3.4, EYE), (1.5, kit.GLASS_Y, F + 1.3), 24, 0),
    "shelf": ((2.8, 3.25, EYE), (-5, 3.25, F + 0.9), 24, 0),
    "fridge": ((1.2, 4.85, EYE), (-2.8, 6.8, F + 1.15), 20, 0),
    "entrance": ((2.2, 3.6, EYE), (3.9, kit.GLASS_Y, F + 1.2), 24, 0),
    "storage": ((4.1, 7.6, EYE), (3.6, 11, F + 0.9), 20, 0.3),
}
# 손님이 서는 자리(x, y)와 몸이 향하는 각도다.
SPOTS = {
    "counter": (3.3, 2.7, 90),
    "shelf": (-1.0, 3.25, 180),
    "fridge": (-1.8, 5.6, 180),
    "entrance": (3.9, 1.0, 180),
    "storage": (3.9, 9.6, 0),
}

# 이름별 클릭 영역이다. 대상의 월드 범위를 렌더 직후 같은 카메라로 투영한다.
hotspots = {}


def shot(zone, name=None):
    loc, target, lens, exposure = CAMS[zone]
    kit.render(f"zones/{name or zone}", loc, target, lens, exposure)


def area(name, *bounds):
    hotspots[name] = kit.project(*bounds)


def hide_in(x0, x1, y0, y1, z0, z1):
    """범위 안에 기준점이 있는 매장 오브젝트를 숨기고 목록을 돌려준다."""
    found = [
        o for o in kit.store.objects
        if x0 <= o.location.x <= x1 and y0 <= o.location.y <= y1 and z0 <= o.location.z <= z1
    ]
    for o in found:
        o.hide_render = True
    return found


def variant(name, build, hide=()):
    """기준 장면에서 일부만 바꿔 렌더하고 되돌린다(디자인 컨셉안 3절)."""
    hidden = hide_in(*hide) if hide else []
    added = build()
    kit.to_store(added)
    shot(name.split("--")[0], name)
    for o in added:
        bpy.data.objects.remove(o, do_unlink=True)
    for o in hidden:
        o.hide_render = False


frame = kit.mat("#3a4450", 0.5, metal=0.4)

kit.render("cctv/ch2", (5.7, 4.8, F + 3.0), (3.9, 0.2, F + 0.8), 16, 0)
kit.render("cctv/ch3", (2.9, 3.25, F + 3.0), (-5, 3.25, F + 0.2), 16, 0)

# 진열대: 한 칸의 병이 모두 눕혀진다.
shot("shelf")
area("task:ramen-stock", -2.0, 1.0, 3.95, 4.1, F, F + 1.7)
LYING = (-1.3, 0.3, 3.9, 4.2, F + 0.85, F + 1.2)
area("obs:shelf", *LYING)


def lying_bottles():
    out = []
    x = -1.25
    while x < 0.25:
        o = kit.lathe(kit.BOTTLE, x, 4.04, F + 0.96, kit.mat("#7fb3c8", 0.15), 10)
        o.rotation_euler = (0, math.pi / 2, 0)
        out.append(o)
        x += 0.1
    return out


variant("shelf--lying", lying_bottles, LYING)

# 냉장고: 문이 4칸에서 5칸이 된다.
shot("fridge")
area("task:fridge-inspect", -5.7, 1.5, 6.3, 6.32, F + 0.25, F + 2.2)
area("obs:fridge", -5.7, 1.5, 6.3, 6.32, F + 0.25, F + 2.2)
area("act:fridge-extra", 0.55, 1.5, 6.3, 6.32, F + 0.25, F + 2.2)
variant("fridge--extra", lambda: [kit.box(0.52, 0.58, 6.28, 6.32, F, F + 2.4, frame)])

# 입구: 자동문이 2짝에서 3짝이 된다.
shot("entrance")
area("task:floor-clean", 3.0, 4.8, 0.4, 1.6, F, F + 0.02)
DOOR = (3.0, 4.8, 0.14, 0.16, F, kit.DOOR_TOP)
area("obs:entrance", *DOOR)
area("act:entrance-middle", 3.6, 4.2, 0.14, 0.16, F, kit.DOOR_TOP)
variant(
    "entrance--three",
    lambda: [kit.box(x - 0.02, x + 0.02, 0.1, 0.2, F, kit.DOOR_TOP, frame) for x in (3.6, 4.2)],
    (3.85, 3.95, 0.1, 0.2, F, F + 3),
)

# 창고: 가운데에 없던 선반이 생긴다.
shot("storage")
area("task:storage-check", 5.4, 5.95, 7.6, 10.9, F, F + 2.6)
RACK = (3.3, 4.3, 9.0, 10.6, F, F + 2.4)
area("obs:storage", 1.85, 5.95, 7.6, 10.9, F, F + 2.6)
area("act:storage-rack", *RACK)


def middle_rack():
    steel = kit.mat("#7f8fa0", 0.45, metal=0.6)
    out = []
    for z in (0.1, 0.8, 1.5, 2.2):
        out.append(kit.box(3.3, 4.3, 9.0, 10.6, F + z, F + z + 0.03, steel, bevel=0.01))
        out.append(kit.box(3.35, 4.25, 9.1, 9.6, F + z + 0.03, F + z + 0.45, kit.mat("#a8875c", 0.8), bevel=0.01))
    for x in (3.3, 4.26):
        for y in (9.0, 10.56):
            out.append(kit.box(x, x + 0.04, y, y + 0.04, F, F + 2.4, steel, bevel=0.005))
    return out


variant("storage--rack", middle_rack, (3.2, 3.5, 10.3, 10.7, F, F + 0.5))

LOOKS = list(kit.LOOKS)


def person_area(zone, look):
    x, y, _ = SPOTS[zone]
    top = F + (2.45 if look == "tall" else 1.85)
    return kit.project(x - 0.35, x + 0.35, y - 0.35, y + 0.35, F, top)


# 손님 레이어: 기준 장면 위에 겹친다.
for zone in ("shelf", "fridge", "entrance", "storage"):
    loc, target, lens, exposure = CAMS[zone]
    for look in LOOKS:
        root = kit.person(*SPOTS[zone], look)
        kit.render_layer(f"layers/{look}-{zone}", loc, target, lens, exposure)
        hotspots[f"person:{look}-{zone}"] = person_area(zone, look)
        kit.remove(root)

# 카운터: 유리의 반사상까지 같은 카메라로 렌더한다.
ghosts = kit.counter_reflection()
shot("counter")
area("pos", 4.05, 4.37, 2.9, 3.3, F + 1.06, F + 1.36)
area("cctv", 4.15, 4.28, 1.65, 2.05, F + 1.06, F + 1.42)
area("manual", 3.75, 4.05, 2.12, 2.45, F + 1.06, F + 1.13)
area("obs:window", -5.6, 4.8, 0.14, 0.16, F + 0.3, F + 2.6)
loc, target, lens, exposure = CAMS["counter"]
cx, cy, yaw = SPOTS["counter"]
for look in LOOKS:
    root = kit.person(cx, cy, yaw, look)
    kit.render_layer(f"layers/{look}-counter-noreflect", loc, target, lens, exposure)
    ghost = kit.person(cx, kit.mirror_y(cy), yaw, look, kit.reflection_material())
    kit.render_layer(f"layers/{look}-counter", loc, target, lens, exposure)
    hotspots[f"person:{look}-counter"] = person_area("counter", look)
    kit.remove(root)
    kit.remove(ghost)

HOTSPOTS.write_text(
    "// tools/art/zones.py가 생성한다. 좌표는 480×270 렌더 이미지의 픽셀이다.\n"
    "export const hotspots: Record<string, { x: number; y: number; w: number; h: number }> = "
    + json.dumps(hotspots, indent=2)
    + ";\n"
)

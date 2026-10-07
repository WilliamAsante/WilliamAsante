"""Build the BILLD Lottie animations from the logo's vector paths.

Run:  python3 billd-lottie/build.py
Writes:
  billd-logo-reveal.json   (400x360) logo drops in letter by letter, LL bars spring up (2.5 s, plays once)
  billd-loader.json        LL bars pulse in turn, for loading screens (1 s, loops)

Colours: white #FFFFFF letters and red-orange #E9261D bars, on a transparent
background (the logo is designed for dark backgrounds).
"""

import json
import re
from pathlib import Path

HERE = Path(__file__).parent
WHITE = [1, 1, 1, 1]
ACCENT = [233 / 255, 38 / 255, 29 / 255, 1]

# Same shapes as billd-motion/logo/billd-logo.svg (units: 0..318 wide, -22..100 tall)
PATHS = {
    "B": "M0 0H46C64 0 74 10 74 24C74 34 69 41 61 45C72 49 80 58 80 72C80 89 68 100 48 100H0Z"
         "M26 20H44C50 20 54 23 54 28C54 33 50 37 44 37H26Z"
         "M26 57H47C54 57 58 61 58 68C58 75 54 80 47 80H26Z",
    "I": "M90 0H116V100H90Z",
    "L1": "M126 34H152V74H170V100H126Z",
    "L2": "M180 -10L206 -22V74H224V100H180Z",
    "D": "M234 0H268C298 0 318 21 318 50C318 79 298 100 268 100H234Z"
         "M260 23H266C283 23 292 34 292 50C292 66 283 77 266 77H260Z",
}


def parse(d):
    """SVG path (absolute M/H/V/L/C/Z only) -> list of Lottie bezier shapes."""
    tokens = re.findall(r"[MHVLCZ]|-?\d*\.?\d+", d)
    shapes, cur, pos, start, i, cmd = [], None, (0.0, 0.0), (0.0, 0.0), 0, None

    def num():
        nonlocal i
        v = float(tokens[i])
        i += 1
        return v

    def add(pt, in_t=(0, 0)):
        cur["v"].append(list(pt))
        cur["i"].append(list(in_t))
        cur["o"].append([0, 0])

    while i < len(tokens):
        t = tokens[i]
        if t in "MHVLCZ":
            cmd = t
            i += 1
            if cmd == "Z":
                # Drop a duplicate closing vertex, keeping its in-tangent on the first one.
                if len(cur["v"]) > 1 and cur["v"][-1] == cur["v"][0]:
                    cur["i"][0] = cur["i"].pop()
                    cur["v"].pop()
                    cur["o"].pop()
                shapes.append({"c": True, **cur})
                cur, pos = None, start
                continue
        if cmd == "M":
            pos = start = (num(), num())
            cur = {"v": [], "i": [], "o": []}
            add(pos)
        elif cmd == "H":
            pos = (num(), pos[1]); add(pos)
        elif cmd == "V":
            pos = (pos[0], num()); add(pos)
        elif cmd == "L":
            pos = (num(), num()); add(pos)
        elif cmd == "C":
            x1, y1, x2, y2, x, y = (num() for _ in range(6))
            cur["o"][-1] = [x1 - pos[0], y1 - pos[1]]
            pos = (x, y)
            add(pos, (x2 - x, y2 - y))
    return shapes


def static(v):
    return {"a": 0, "k": v}


def ease_kf(t, s, out=(0.33, 0), inn=(0.67, 1)):
    """A keyframe with bezier easing towards the next one."""
    dim = len(s)
    return {"t": t, "s": s, "o": {"x": [out[0]] * dim, "y": [out[1]] * dim}, "i": {"x": [inn[0]] * dim, "y": [inn[1]] * dim}}


def anim(keys):
    return {"a": 1, "k": keys}


def shape_layer(name, ind, paths, color, ks, op):
    group = {
        "ty": "gr", "nm": name,
        "it": [{"ty": "sh", "ks": static(p)} for p in paths]
        + [
            {"ty": "fl", "c": static(color), "o": static(100), "r": 2},  # even-odd keeps the holes
            {"ty": "tr", "p": static([0, 0]), "a": static([0, 0]), "s": static([100, 100]), "r": static(0), "o": static(100), "sk": static(0), "sa": static(0)},
        ],
    }
    return {"ddd": 0, "ind": ind, "ty": 4, "nm": name, "sr": 1, "ks": ks, "ao": 0, "shapes": [group], "ip": 0, "op": op, "st": 0, "bm": 0}


def transform(anchor, position, scale=None, opacity=None):
    return {
        "o": opacity or static(100),
        "r": static(0),
        "p": position,
        "a": static(anchor + [0]),
        "s": scale or static([100, 100, 100]),
    }


def bbox(shapes):
    xs = [v[0] for s in shapes for v in s["v"]]
    ys = [v[1] for s in shapes for v in s["v"]]
    return min(xs), min(ys), max(xs), max(ys)


def doc(name, w, h, fr, op, layers):
    return {"v": "5.7.4", "fr": fr, "ip": 0, "op": op, "w": w, "h": h, "nm": name, "ddd": 0, "assets": [], "layers": layers}


SHAPES = {k: parse(d) for k, d in PATHS.items()}


def logo_reveal():
    fr, op = 60, 150
    w, h, ox, oy = 400, 360, 41, 160  # baseline at y=260, with headroom for the drop
    layers = []
    for n, key in enumerate(["B", "I", "L1", "L2", "D"]):
        x0, y0, x1, y1 = bbox(SHAPES[key])
        anchor = [(x0 + x1) / 2, 100]  # bottom centre, on the baseline
        base = [anchor[0] + ox, anchor[1] + oy, 0]
        color = ACCENT if key.startswith("L") else WHITE
        if key in ("B", "I", "D"):
            t0 = {"B": 0, "I": 6, "D": 12}[key]
            up = [base[0], base[1] - 150, 0]
            hop = [base[0], base[1] - 14, 0]
            pos = anim([
                ease_kf(t0, up, (0.55, 0), (0.9, 0.5)),       # fall
                ease_kf(t0 + 22, base, (0.2, 0.6), (0.4, 1)),  # land
                ease_kf(t0 + 29, hop, (0.6, 0), (0.8, 0.6)),   # little bounce
                {"t": t0 + 36, "s": base},
            ])
            fade = anim([ease_kf(t0, [0]), {"t": t0 + 8, "s": [100]}])
            ks = transform(anchor, pos, opacity=fade)
        else:
            t0 = 34 if key == "L1" else 44
            sc = anim([
                ease_kf(t0, [100, 0, 100], (0.2, 0.7), (0.4, 1)),
                ease_kf(t0 + 14, [100, 118, 100], (0.4, 0), (0.5, 1)),
                ease_kf(t0 + 22, [100, 94, 100]),
                {"t": t0 + 28, "s": [100, 100, 100]},
            ])
            ks = transform(anchor, static(base), scale=sc)
        layers.append(shape_layer(key, n + 1, SHAPES[key], color, ks, op))
    return doc("BILLD logo reveal", w, h, fr, op, layers[::-1])


def loader():
    fr, op = 60, 60
    w = h = 200
    layers = []
    for n, key in enumerate(["L1", "L2"]):
        x0, y0, x1, y1 = bbox(SHAPES[key])
        anchor = [(x0 + x1) / 2, 100]
        # bars centred in a square canvas
        base = [anchor[0] - 175 + 100, 100 + 61, 0]
        t0 = 0 if key == "L1" else 15
        def kf(t, sy):
            return ease_kf(t % op, [100, sy, 100], (0.45, 0), (0.55, 1))
        keys = sorted([(t0 % op, 100), ((t0 + 15) % op, 55), ((t0 + 30) % op, 100)])
        frames = [kf(t, sy) for t, sy in keys]
        if frames[0]["t"] != 0:
            frames.insert(0, ease_kf(0, [100, 100, 100]))
        frames.append({"t": op, "s": [100, 100, 100]})
        ks = transform(anchor, static(base), scale=anim(frames))
        layers.append(shape_layer(key, n + 1, SHAPES[key], ACCENT, ks, op))
    return doc("BILLD loader", w, h, fr, op, layers)


for name, data in [("billd-logo-reveal.json", logo_reveal()), ("billd-loader.json", loader())]:
    (HERE / name).write_text(json.dumps(data, separators=(",", ":")))
    print("wrote", name)

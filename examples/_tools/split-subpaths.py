#!/usr/bin/env python3
"""Split an SVG file's first <path> into subpaths with absolutized starts.

Usage: python3 split-subpaths.py path/to/icon.svg

Prints a JSON array of { "start": [x, y], "d": "..." } — one entry per subpath.
Each subpath's leading moveto is rewritten as an absolute M so the fragments can
be regrouped into separate <path> elements. Subpaths that act as HOLES (drawn
counter-directionally inside another subpath) must stay in the same <path> as
their outer shape or the fill rule breaks — recombine those by concatenating
their "d" strings.
"""
import json
import re
import sys

NUM = r"[+-]?(?:\d*\.\d+|\d+\.?)(?:[eE][+-]?\d+)?"
ARGS = dict(M=2, L=2, H=1, V=1, C=6, S=4, Q=4, T=2, A=7, Z=0)


def split(d: str):
    tokens = re.findall(r"([MmZzLlHhVvCcSsQqTtAa])([^MmZzLlHhVvCcSsQqTtAa]*)", d)
    subpaths = []
    cx = cy = sx = sy = 0.0
    current = None

    for letter, body in tokens:
        ns = [float(x) for x in re.findall(NUM, body)]
        upper, rel = letter.upper(), letter.islower()
        n = ARGS[upper]
        groups = [ns[i : i + n] for i in range(0, len(ns), n)] if n else [[]]

        if upper == "M":
            g0 = groups[0]
            px, py = (cx + g0[0], cy + g0[1]) if rel else (g0[0], g0[1])
            current = {"start": [round(px, 3), round(py, 3)], "d": f"M{px:.4f} {py:.4f}"}
            subpaths.append(current)
            cx, cy, sx, sy = px, py, px, py
            for g in groups[1:]:  # implicit linetos after a moveto
                cx, cy = (cx + g[0], cy + g[1]) if rel else (g[0], g[1])
                current["d"] += ("l" if rel else "L") + f"{g[0]:g} {g[1]:g}"
            continue

        for g in groups:
            if upper == "Z":
                cx, cy = sx, sy
            elif upper == "H":
                cx = cx + g[0] if rel else g[0]
            elif upper == "V":
                cy = cy + g[0] if rel else g[0]
            else:
                ex, ey = g[-2], g[-1]
                cx, cy = (cx + ex, cy + ey) if rel else (ex, ey)
        current["d"] += letter + body.strip()

    return subpaths


if __name__ == "__main__":
    svg = open(sys.argv[1]).read()
    m = re.search(r'\bd="([^"]+)"', svg)
    if not m:
        sys.exit("no <path d=...> found")
    print(json.dumps(split(m.group(1)), indent=1))

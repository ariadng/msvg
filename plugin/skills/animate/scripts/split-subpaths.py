#!/usr/bin/env python3
"""Split an SVG file's first <path> into its subpaths, with absolutized starts.

Usage: python3 split-subpaths.py path/to/icon.svg

Prints a JSON array of { "start": [x, y], "d": "..." } — one entry per subpath
(each `M`/`m` command in the original `d` begins a new subpath). Each subpath's
leading moveto is rewritten as an absolute `M` so the fragments can be regrouped
into separate <path> elements inside per-part <g data-part> groups.

HOLE SUBPATHS: a subpath drawn counter-directionally inside another subpath acts
as a HOLE via the nonzero/evenodd fill rule (e.g. the transparent lens ring
inside a solid camera body, or wheel cut-outs inside a truck silhouette). A hole
MUST stay in the SAME <path> as its outer shape, or the fill inverts and the
hole fills solid. To recombine, concatenate the hole's "d" onto the outer
shape's "d" (outer first, hole second) and emit them as one <path>. `start` is
provided so you can tell which subpaths are nested inside which — a subpath whose
start lies inside another subpath's bounds is almost always its hole.

Workflow:
  1. Run this script; read the subpath list.
  2. Group subpaths by the visual part they belong to.
  3. Within a part, KEEP holes concatenated to their outer shape (one <path>).
  4. Emit each part as <g data-part="name"><path d="..."/></g>.

The number regex tolerates the compact SVG number forms exporters emit
(leading-dot decimals like `.084`, no separator between a number and the next
sign like `2.914-.0564`, and scientific notation), so subpath boundaries are
detected correctly even in minified path data.
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

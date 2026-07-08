# msvg animate — deep reference

Depth for the five-step process in [SKILL.md](SKILL.md). Read the section you need; you rarely need all of it at once.

- [The worked example: Instagram](#the-worked-example-instagram) — all five files, verbatim, annotated
- [Easing warp: why clip easing must be linear](#easing-warp-why-clip-easing-must-be-linear)
- [Subpaths and holes](#subpaths-and-holes)
- [The inset wrapper (zero-padding sources)](#the-inset-wrapper-zero-padding-sources)
- [Amplitude cheat-sheet](#amplitude-cheat-sheet)
- [Bounds audit snippet](#bounds-audit-snippet)

---

## The worked example: Instagram

Instagram is the canonical meaningful, seamless, bounds-clean loop. Source: Simple Icons (24-unit box, **zero padding**). Meaning (Step 1): **a camera** — the aperture **flashes** (dot scales up), *then* the lens **shutters** (contracts and rebounds), then the body recoils slightly. Sequenced, not simultaneous.

### `animation.config.json`

```json
{
  "schemaVersion": "1.0",
  "id": "instagram",
  "name": "Instagram",
  "version": "0.1.0",
  "description": "Animated Instagram logo that acts like a polaroid camera: the flash dot swells, then the lens fires a shutter snap with a subtle body recoil.",
  "asset": { "svg": "./assets/main.svg" },
  "motion": {
    "targets": "./motion/targets.json",
    "timelines": "./motion/timelines.json",
    "states": "./motion/states.json"
  },
  "accessibility": {
    "title": "Instagram",
    "description": "The Instagram logo acting like a polaroid camera: the flash dot brightens and swells, then the lens gives a quick shutter snap.",
    "decorative": false
  },
  "reducedMotion": { "strategy": "static", "fallbackState": "idle" }
}
```

Annotations:
- `id` is kebab-case and matches the folder and the SVG's `data-animation`.
- No `preview` and no `idleCss` — both optional; omit what you do not ship.
- `reducedMotion.strategy: "static"` means timelines do not run under `prefers-reduced-motion`; the SVG shows its authored resting state. This is why the SVG must render correctly at rest.
- Both description strings narrate the *actual* loadingLoop below (flash, then shutter, then recoil). When you rework keyframes, update the prose in the same commit — an earlier version of this package still said "rotate wobble and opacity dip" long after the loop became scale-based.

### `assets/main.svg`

```svg
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" data-animation="instagram" fill="currentColor"><g data-inset="" transform="translate(1.68 1.68) scale(0.86)"><g data-part="glyph"><g data-part="body"><path d="M7.0301 0.0840c-1.2768.0602-2.1487.264-2.911.5634-.7888.3075-1.4575.72-2.1228 1.3877-.6652.6677-1.075 1.3368-1.3802 2.127-.2954.7638-.4956 1.6365-.552 2.914-.0564 1.2775-.0689 1.6882-.0626 4.947.0062 3.2586.0206 3.6671.0825 4.9473.061 1.2765.264 2.1482.5635 2.9107.308.7889.72 1.4573 1.388 2.1228.6679.6655 1.3365 1.0743 2.1285 1.38.7632.295 1.6361.4961 2.9134.552 1.2773.056 1.6884.069 4.9462.0627 3.2578-.0062 3.668-.0207 4.9478-.0814 1.28-.0607 2.147-.2652 2.9098-.5633.7889-.3086 1.4578-.72 2.1228-1.3881.665-.6682 1.0745-1.3378 1.3795-2.1284.2957-.7632.4966-1.636.552-2.9124.056-1.2809.0692-1.6898.063-4.948-.0063-3.2583-.021-3.6668-.0817-4.9465-.0607-1.2797-.264-2.1487-.5633-2.9117-.3084-.7889-.72-1.4568-1.3876-2.1228C21.2982 1.33 20.628.9208 19.8378.6165 19.074.321 18.2017.1197 16.9244.0645 15.6471.0093 15.236-.005 11.977.0014 8.718.0076 8.31.0215 7.0301.0839M7.1703 21.7771c-1.17-.0509-1.8053-.2453-2.2287-.408-.5606-.216-.96-.4771-1.3819-.895-.422-.4178-.6811-.8186-.9-1.378-.1644-.4234-.3624-1.058-.4171-2.228-.0595-1.2645-.072-1.6442-.079-4.848-.007-3.2037.0053-3.583.0607-4.848.05-1.169.2456-1.805.408-2.2282.216-.5613.4762-.96.895-1.3816.4188-.4217.8184-.6814 1.3783-.9003.423-.1651 1.0575-.3614 2.227-.4171 1.2655-.06 1.6447-.072 4.848-.079 3.2033-.007 3.5835.005 4.8495.0608 1.169.0508 1.8053.2445 2.228.408.5608.216.96.4754 1.3816.895.4217.4194.6816.8176.9005 1.3787.1653.4217.3617 1.056.4169 2.2263.0602 1.2655.0739 1.645.0796 4.848.0058 3.203-.0055 3.5834-.061 4.848-.051 1.17-.245 1.8055-.408 2.2294-.216.5604-.4763.96-.8954 1.3814-.419.4215-.8181.6811-1.3783.9-.4224.1649-1.0577.3617-2.2262.4174-1.2656.0595-1.6448.072-4.8493.079-3.2045.007-3.5825-.006-4.848-.0608"/></g><g data-part="lens"><path d="M5.8385 12.0120c.0067 3.4032 2.7706 6.1557 6.173 6.1493 3.4026-.0065 6.157-2.7701 6.1506-6.1733-.0065-3.4032-2.771-6.1565-6.174-6.1498-3.403.0067-6.156 2.771-6.1496 6.1738M8.0000 12.0077a4 4 0 1 1 4.008 3.9921A3.9996 3.9996 0 0 1 8 12.0077"/></g><g data-part="dot"><path d="M16.9530 5.5864A1.44 1.44 0 1 0 18.39 4.144a1.44 1.44 0 0 0-1.437 1.4424"/></g></g></g></svg>
```

Annotations:
- **Inset wrapper**: `<g data-inset transform="translate(1.68 1.68) scale(0.86)">` shrinks the artwork to 86% and re-centers it, buying ~1.68 units (7%) of margin on every side. Simple Icons have zero padding, so **without this wrapper any scale-up or wobble clips at the edge.** Math is in [The inset wrapper](#the-inset-wrapper-zero-padding-sources).
- **Nesting**: `data-inset` → `data-part="glyph"` (the whole mark, animated as a unit by `intro`) → `body` / `lens` / `dot` (animated independently by the loop). The glyph group lets the entrance transform everything together while the loop still addresses parts.
- **Holes kept concatenated** (see [Subpaths and holes](#subpaths-and-holes)):
  - `body` `<path>` = outer rounded-square silhouette **+** its inner counter-wound ring, joined at the `M7.1703 21.7771…` moveto inside one `d`. That inner ring is the hole that makes the frame a frame, not a filled block.
  - `lens` `<path>` = outer circle **+** inner `M8.0000 12.0077a4 4 0 1 1…` circle (the hole that makes it a ring).
  - `dot` is a single subpath (a filled disc), no hole.
- **Pivots**: parts are not given explicit `transform-origin` here, so the runtime applies its default `transform-box: fill-box; transform-origin: center` per target — which is exactly what a symmetric scale wants. Declare an origin yourself only when you need an off-center pivot (a clock hand, a hinge).
- `fill="currentColor"` so the icon inherits text color. `data-animation="instagram"` matches the `root` selector in `targets.json`.

### `motion/targets.json`

```json
{
  "root": "[data-animation='instagram']",
  "glyph": "[data-part='glyph']",
  "body": "[data-part='body']",
  "lens": "[data-part='lens']",
  "dot": "[data-part='dot']"
}
```

Annotations: logical camelCase names → `data-part` selectors. Timelines reference `"body"`, never the raw selector. `root` targets the whole `<svg>`.

### `motion/timelines.json`

```json
{
  "intro": [
    {
      "target": "glyph",
      "at": 0,
      "keyframes": [
        { "opacity": 0, "transform": "scale(0.84) rotate(-6deg)", "easing": "emphasized" },
        { "opacity": 1, "transform": "scale(1.03) rotate(1deg)", "offset": 0.72, "easing": "soft" },
        { "opacity": 1, "transform": "scale(1) rotate(0deg)" }
      ],
      "options": { "duration": 480, "easing": "linear", "fill": "both" }
    }
  ],
  "loadingLoop": [
    {
      "target": "dot",
      "at": 0,
      "keyframes": [
        { "offset": 0,    "transform": "scale(1)",   "easing": "linear" },
        { "offset": 0.05, "transform": "scale(1)",   "easing": "emphasized" },
        { "offset": 0.1,  "transform": "scale(2.3)", "easing": "soft" },
        { "offset": 0.2,  "transform": "scale(1.5)", "easing": "soft" },
        { "offset": 0.38, "transform": "scale(1)",   "easing": "linear" },
        { "offset": 1,    "transform": "scale(1)" }
      ],
      "options": { "duration": 2400, "easing": "linear", "fill": "both" }
    },
    {
      "target": "lens",
      "at": 0,
      "keyframes": [
        { "offset": 0,    "transform": "scale(1)",    "easing": "linear" },
        { "offset": 0.12, "transform": "scale(1)",    "easing": "standard" },
        { "offset": 0.17, "transform": "scale(0.68)", "easing": "standard" },
        { "offset": 0.23, "transform": "scale(1.08)", "easing": "soft" },
        { "offset": 0.28, "transform": "scale(1)",    "easing": "linear" },
        { "offset": 1,    "transform": "scale(1)" }
      ],
      "options": { "duration": 2400, "easing": "linear", "fill": "both" }
    },
    {
      "target": "body",
      "at": 0,
      "keyframes": [
        { "offset": 0,    "transform": "scale(1)",     "easing": "linear" },
        { "offset": 0.15, "transform": "scale(1)",     "easing": "standard" },
        { "offset": 0.19, "transform": "scale(0.97)",  "easing": "soft" },
        { "offset": 0.26, "transform": "scale(1.012)", "easing": "soft" },
        { "offset": 0.32, "transform": "scale(1)",     "easing": "linear" },
        { "offset": 1,    "transform": "scale(1)" }
      ],
      "options": { "duration": 2400, "easing": "linear", "fill": "both" }
    }
  ],
  "hover": [
    {
      "target": "dot",
      "at": 0,
      "keyframes": [
        { "offset": 0,   "transform": "scale(1)",   "easing": "emphasized" },
        { "offset": 0.3, "transform": "scale(2.1)", "easing": "soft" },
        { "offset": 1,   "transform": "scale(1)" }
      ],
      "options": { "duration": 520, "easing": "linear", "fill": "both" }
    },
    {
      "target": "lens",
      "at": 140,
      "keyframes": [
        { "offset": 0,    "transform": "scale(1)",    "easing": "standard" },
        { "offset": 0.35, "transform": "scale(0.68)", "easing": "soft" },
        { "offset": 0.7,  "transform": "scale(1.08)", "easing": "soft" },
        { "offset": 1,    "transform": "scale(1)" }
      ],
      "options": { "duration": 420, "easing": "linear", "fill": "both" }
    }
  ]
}
```

Annotations — this is where the house rules live:

- **`loadingLoop` is the rule done right.** Every clip has `"easing": "linear"` at the **clip** level; all feel is in **per-keyframe** `easing` tokens. Because clip easing is linear, a keyframe at `offset: 0.1` fires at exactly 10% of the 2400ms duration (240ms) — offset space equals real time. See [Easing warp](#easing-warp-why-clip-easing-must-be-linear).
- **Seamless loop.** For every clip, the first keyframe (`offset 0`, `scale(1)`) equals the last (`offset 1`, `scale(1)`), so the loop restart is invisible. Each clip also holds a **rest beat**: the action finishes early (dot by 0.38, lens by 0.28, body by 0.32) and then holds `scale(1)` out to `offset 1`. The still tail is most of the cycle — that stillness is what makes a 2.4s loop feel calm instead of frantic.
- **Sequencing = meaning.** The dot flashes first (peak `scale(2.3)` at 0.1), *then* the lens contracts (`0.68` at 0.17) and overshoots (`1.08` at 0.23) — the shutter click — *then* the body dips (`0.97` at 0.19) and rebounds. Staggering the start offsets is what reads as "flash **then** shutter" rather than a formless throb.
- **Amplitudes respect the box.** The dot is tiny (radius ~1.44 local units), so `scale(2.3)` is safe. The lens and body barely move (`0.68`–`1.08`, `0.97`–`1.012`) because they are large and near the inset margin. Big parts get small amplitudes; small parts can go large.
- **`intro` follows the rule too.** The clip easing is `"linear"`; the emphatic pop-in comes from `"easing": "emphasized"` on the *first keyframe* (governing the 0 → 0.72 segment) and `"soft"` on the settle. An earlier version of this package set `"emphasized"` at the **clip** level instead — Spec-valid, but it warped the `offset: 0.72` beat away from 72% of real time, exactly the failure mode the house rule exists to prevent. Keyframe-level easing is not cosmetic preference: it is the only way `offset` values stay truthful to the clock.
- **State-level looping only.** No clip uses `iterations: Infinity` (the validator rejects it). The loop comes from the state machine's `loop: true` below.
- **`hover`** shows `at: 140` — a per-clip start delay so the lens reacts 140ms after the dot, cheap choreography without extra keyframes.

### `motion/states.json`

```json
{
  "initial": "idle",
  "states": {
    "idle": { "on": { "LOAD": "loading" } },
    "loading": {
      "onEnter": { "timeline": "loadingLoop", "loop": true },
      "on": { "RESET": "idle" }
    }
  }
}
```

Annotations: the **canonical loading state machine**. Start `idle` (static); `LOAD` enters `loading`, whose `onEnter` plays `loadingLoop` with `loop: true`; `RESET` returns to `idle`. This is the shape to reuse for any loading animation. Note `intro` is **not** wired to a state — one-shot intros are played explicitly with `controller.play("intro")`, never on a re-entered state (or they replay on every entry).

---

## Easing warp: why clip easing must be linear

The Web Animations API computes an animation in two stages:

1. **Timing → progress.** The elapsed fraction of the active duration is run through the clip's `options.easing` timing function to produce `computedTiming.progress` (the "eased progress").
2. **Progress → value.** Keyframe `offset`s are interpolated **in progress space**, and each segment between two keyframes is additionally shaped by that keyframe's own `easing`.

The trap: keyframe offsets are positions on the **progress** axis, not the **time** axis. If `options.easing` is non-linear, progress advances unevenly against real time, so a keyframe you placed at `offset: 0.1` — intending "10% of the way through time" — actually fires when *eased progress* reaches 0.1, which is some **other** real time. Every beat you carefully timed drifts, and the drift is different for each keyframe.

Set `options.easing: "linear"` and stage 1 becomes the identity: progress **equals** the time fraction. Now `offset: 0.1` fires at exactly 10% of the duration, and the only shaping comes from per-keyframe `easing`, which acts strictly *between* consecutive keyframes without moving where they land. You get precise, independent control of (a) *when* each beat happens (via `offset`) and (b) *how* it eases into the next (via per-keyframe token).

For a **seamless loop** this is not a nicety. The seam depends on the first and last keyframes coinciding in both value and timing; warping the interior offsets can desync clips that were meant to stay in lockstep and make the rest beat land in the wrong place, so the "invisible" restart becomes visible. msvg-core resolves both clip-level and per-keyframe tokens through the same table (`packages/core/src/easing.ts`), so `"linear"` at the clip level plus tokens per keyframe is fully supported — it is the intended authoring mode.

---

## Subpaths and holes

An icon exported as one `<path>` often contains several subpaths — each `M`/`m` command starts a new one. To animate parts independently you split them into separate `<path>` elements inside per-part `<g data-part>` groups. Run:

```
python3 ${CLAUDE_SKILL_DIR}/scripts/split-subpaths.py path/to/raw.svg
```

It prints one `{ "start": [x,y], "d": "..." }` per subpath, each with an absolutized leading `M` so the fragment stands alone.

**Holes are the catch.** SVG fills by the nonzero (or evenodd) rule: a subpath wound **opposite** to the shape around it carves a hole. The lens *ring* is an outer circle with an inner circle wound the other way; the frame is an outer rounded square with an inner counter-square. If you move a hole into its **own** `<path>`, it loses the shape it was subtracting from, the fill rule flips, and the hole renders as a solid disc/block.

Rule: **a hole must stay in the same `<path>` as its outer shape.** Recombine by concatenating their `d` strings (outer first, hole second) into one `<path>`. Use the `start` coordinates to identify nesting — a subpath whose start sits inside another subpath's bounds is almost always its hole.

Worked, from the raw Instagram SVG (`examples/social-icons/_raw/instagram.svg`) — the script yields **5** subpaths:

| # | start | what it is | grouping |
|---|-------|-----------|----------|
| 0 | `[7.03, 0.084]`   | outer rounded-square silhouette | `body` |
| 1 | `[7.17, 21.777]`  | inner counter-wound ring (**hole**) | concatenate into `body` |
| 2 | `[16.953, 5.586]` | the aperture dot (solid disc) | `dot` |
| 3 | `[5.838, 12.012]` | lens outer circle | `lens` |
| 4 | `[8.0, 12.008]`   | lens inner circle (**hole**) | concatenate into `lens` |

So five subpaths become three parts: `body` = 0+1, `lens` = 3+4, `dot` = 2 — exactly the grouping in the annotated `main.svg` above. If you had instead emitted five `<path>`s, the frame and the lens would both fill solid and the animation would be meaningless.

---

## The inset wrapper (zero-padding sources)

Some icon sets draw to the very edge of the viewBox with **no margin** (Simple Icons, 24-unit box). Any scale-up, translate, or rotate then pushes geometry past the edge and clips. Fix it with a static wrapper `<g>` that shrinks and re-centers the artwork *before* you animate inside it — you trade a little rendered size for motion headroom.

Instagram uses `translate(1.68 1.68) scale(0.86)`. Derivation, for a `W`-unit box (here `W = 24`) and a desired margin `m` units on every side:

```
s (scale)     = (W - 2m) / W          # shrink so content spans W - 2m
t (translate) = W(1 - s) / 2 = m       # re-center the shrunk content
```

For `m = 1.68` on a 24 box: `s = (24 - 3.36)/24 = 20.64/24 = 0.86`, `t = 24(1 - 0.86)/2 = 1.68`. That leaves 1.68 units (7%) of clear space on each side — room for the dot's `scale(2.3)` flash and the glyph's entrance overshoot without touching the frame.

Pick `m` from how much motion you need: ~5–8% margin (`s` ≈ 0.84–0.90) suits icon-scale wobbles and small scale-ups; go smaller `s` only if a part travels far. Apply the wrapper once, around everything, and keep it out of the timelines — it is scenery, not motion.

---

## Amplitude cheat-sheet

Amplitudes are in **viewBox units**, so the same number means different things in different boxes. Anchor: at a 56px render, `1 rendered px = (viewBox / 56)` units.

| viewBox | source (typical) | padding | 1px @56px | usable motion budget |
|--------|------------------|---------|-----------|----------------------|
| **24** | Simple Icons | **zero** — add inset wrapper first | ≈ 0.43 units | after ~7% inset: translate ≈ 1–2 units; whole-glyph scale 0.9–1.1, rotate a few degrees; small interior parts (dots) can scale 1.5–2.5× |
| **48** | Material Icons (legacy), some UI sets | small/none | ≈ 0.86 units | roughly **2×** the 24-box numbers (translate 2–4 units, same scale/rotate ratios) |
| **960** | Material Symbols | **~80 units built-in** | ≈ 17 units | translate **60–100 units** for visible motion (a 25-unit translate ≈ 1.5px — invisible); scale/rotate have room thanks to the padding |

Rules of thumb across all boxes:
- **Big parts get small amplitudes; small parts can go large.** A part that already fills most of the box has no room to grow; a tiny dot does.
- **Rotations of the whole glyph** should stay within a few degrees at icon scale — the corners swing furthest and clip first (this is also why bounds must be checked by geometry, not bounding box; see below).
- **Translate is the riskiest** for bounds because it moves everything one direction with no rebound; prefer scale/rotate that return to center, and budget translate against the actual margin.
- Convert once: `units = pixels × viewBox / renderSize`. Decide the motion in rendered pixels, then convert.

---

## Bounds audit snippet

`getBoundingClientRect()` returns an **axis-aligned** box that inflates under rotation and skew — a rotated part reports corners it does not actually occupy, giving false out-of-bounds positives. Audit by sampling real geometry through the element's **live matrix** at each seeked time, and compare against the viewBox.

Key facts the snippet relies on:
- `path.getPointAtLength(l)` returns a point in the path's own geometry space (the space its `d` is written in).
- `path.getCTM()` maps that geometry space to the SVG viewport (viewBox) space, **including the element's own animated `transform`** and all ancestor transforms, as resolved at the moment of the call. Seek + pause first so the matrix reflects the frame you are testing.

```js
// Returns null if clean, else the worst {t, x, y, overflow} point (viewBox units).
// controller = your msvg controller (paused); svg = the mounted <svg>.
function auditBounds(svg, seekTimesMs) {
  const vb = svg.viewBox.baseVal;                 // {x, y, width, height}
  const paths = svg.querySelectorAll("path");
  const SAMPLES = 64;
  let worst = null;

  for (const t of seekTimesMs) {
    // Freeze every running animation at time t so the matrices are for this frame.
    svg.getAnimations({ subtree: true }).forEach((a) => {
      a.pause();
      a.currentTime = t;
    });

    for (const p of paths) {
      const m = p.getCTM();                        // geometry space -> viewBox space
      if (!m) continue;
      const len = p.getTotalLength();
      for (let i = 0; i <= SAMPLES; i++) {
        const local = p.getPointAtLength((i / SAMPLES) * len);
        const q = new DOMPoint(local.x, local.y).matrixTransform(m); // viewBox coords
        const overflow = Math.max(
          vb.x - q.x, q.x - (vb.x + vb.width),
          vb.y - q.y, q.y - (vb.y + vb.height),
          0,
        );
        if (overflow > 0 && (!worst || overflow > worst.overflow)) {
          worst = { t, x: q.x, y: q.y, overflow };
        }
      }
    }
  }
  return worst;
}

// Usage: sample the action beats and the seam.
// const bad = auditBounds(svg, [0, 240, 408, 456, 2400]);
// if (bad) console.warn("out of bounds", bad); else console.log("bounds clean");
```

Notes:
- Sample the **action peaks** (where amplitude is largest) and the **seam** (`0` and full duration) at minimum; add a handful of interior steps.
- `overflow` is in viewBox units — how far past the edge the worst point reaches. Reduce the offending amplitude (or tighten the inset wrapper's scale) until `auditBounds` returns `null`.
- Run it in a real browser or headless Chromium with the package mounted; `getCTM`/`getPointAtLength` need layout. This is a spot check, not a substitute for `msvg validate`.

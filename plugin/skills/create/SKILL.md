---
name: create
description: Scaffold a new MotionSVG (msvg) animation package — the folder of JSON motion files plus an SVG that msvg-core plays. Use when the user asks to create / start / scaffold / make a new msvg animation, a new animated icon package, or a MotionSVG package, or asks how to use an msvg package in an app (vanilla or React). Produces animation.config.json, assets/main.svg, motion/targets.json, motion/timelines.json, motion/states.json, ends by running the validator, and shows how to consume the package with msvg-core or msvg-react.
argument-hint: [package-name]
---

# Create an msvg animation package

An msvg animation is a **folder package**, not a single file. This skill scaffolds
a complete, valid package and wires in the house rules that make loops seamless and
bounds-safe. To design the actual motion (choosing what the icon *means* and
authoring expressive keyframes for an existing icon), use `/msvg:animate` — this
skill is about getting a correct, valid skeleton on disk fast.

If the user gave a name in `$ARGUMENTS`, use it (kebab-case). Otherwise ask for one.

## Folder layout

Create this exact structure under the package directory (kebab-case name = the `id`):

```txt
<name>/
├── animation.config.json      # manifest — source of truth
├── assets/
│   └── main.svg               # the artwork, authored at rest (final state)
├── motion/
│   ├── targets.json           # logical name → CSS selector into the SVG
│   ├── timelines.json         # named clip lists (WAAPI keyframes)
│   └── states.json            # event-driven state machine
└── README.md                  # what each timeline means (optional but expected)
```

`motion/idle.css` and `assets/preview.png` are optional and are omitted here.

## House animation rules (bake these into every package)

1. **Clip easing is always `linear`.** Every clip's `options.easing` MUST be `"linear"`.
   All feel comes from **per-keyframe `easing`** (tokens: `linear`, `standard`, `soft`,
   `emphasized`, `bounceSoft`). A non-linear *clip* easing warps keyframe offsets
   against real time — it silently desyncs multi-part loops. Feel lives on keyframes.
2. **Seamless loops.** In a looping timeline (`loadingLoop`), the **first keyframe must
   equal the last keyframe** for every animated property, and there should be a **rest
   beat** before the end so the restart is invisible. Below, every part starts and ends
   at `scale(1)` with a hold from ~0.4→1.0.
3. **Canonical loading state machine** (use verbatim unless the user needs more states):
   `idle --LOAD--> loading (loops loadingLoop) --RESET--> idle`.
4. **Declare pivots in the SVG.** Any part you scale/rotate needs
   `style="transform-box: fill-box; transform-origin: 50% 50%"` so the transform pivots
   on the part's own center, not the viewBox origin.
5. **Mind the viewBox scale.** Amplitudes are in viewBox units. A 24-unit Simple-Icons
   box has **zero padding** — wrap the glyph in a static inset
   `<g transform="translate(1.68 1.68) scale(0.86)">` before animating so motion has room.
   A 960-unit Material box has ~80 units of built-in padding (use 60–100 unit moves).
6. **Never exceed the viewBox.** Keep scaled/translated extents inside the box.
7. **Reduced motion is required for loops.** Ship `reducedMotion` (strategy `static`,
   `fallbackState "idle"`) or the validator warns.

## File templates (minimal, valid, and rule-compliant)

Substitute `<name>` (the kebab-case id) and the human `<Name>` throughout. This
template is a "target ping" icon (an outer ring + a center dot) — mirror its structure
for real icons. All shapes are plain `<circle>`s so the template is self-contained; for
a real icon, replace them with the icon's `<path>` data and keep the `data-part` groups.

### `animation.config.json`

```json
{
  "schemaVersion": "1.0",
  "id": "<name>",
  "name": "<Name>",
  "version": "0.1.0",
  "description": "Animated <Name> — a target ping loop.",
  "asset": { "svg": "./assets/main.svg" },
  "motion": {
    "targets": "./motion/targets.json",
    "timelines": "./motion/timelines.json",
    "states": "./motion/states.json"
  },
  "accessibility": {
    "title": "<Name>",
    "description": "Animated <Name> icon.",
    "decorative": false
  },
  "reducedMotion": { "strategy": "static", "fallbackState": "idle" }
}
```

### `assets/main.svg`

`fill="currentColor"` so the icon inherits text color. `data-animation` on the `<svg>`;
each animated part is a `<g data-part="...">` with its pivot declared. The static inset
`<g>` (rule 5) gives the motion room in the zero-padding 24-unit box.

```svg
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" data-animation="<name>" fill="currentColor">
  <g data-inset transform="translate(1.68 1.68) scale(0.86)">
    <g data-part="glyph">
      <g data-part="ring" style="transform-box: fill-box; transform-origin: 50% 50%">
        <circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" stroke-width="2" />
      </g>
      <g data-part="dot" style="transform-box: fill-box; transform-origin: 50% 50%">
        <circle cx="12" cy="12" r="3" />
      </g>
    </g>
  </g>
</svg>
```

### `motion/targets.json`

Logical names → selectors. `root` matches the `<svg>`; the rest match `data-part`s.

```json
{
  "root": "[data-animation='<name>']",
  "glyph": "[data-part='glyph']",
  "ring": "[data-part='ring']",
  "dot": "[data-part='dot']"
}
```

### `motion/timelines.json`

`intro` plays once on mount; `loadingLoop` loops. Note every `options.easing` is
`"linear"` (rule 1) and every loop clip starts and ends at `scale(1)` with a rest
beat (rule 2).

```json
{
  "intro": [
    {
      "target": "glyph",
      "at": 0,
      "keyframes": [
        { "opacity": 0, "transform": "scale(0.8)", "easing": "emphasized" },
        { "opacity": 1, "transform": "scale(1)" }
      ],
      "options": { "duration": 420, "easing": "linear", "fill": "both" }
    }
  ],
  "loadingLoop": [
    {
      "target": "dot",
      "at": 0,
      "keyframes": [
        { "offset": 0, "transform": "scale(1)", "easing": "linear" },
        { "offset": 0.08, "transform": "scale(1)", "easing": "emphasized" },
        { "offset": 0.2, "transform": "scale(1.6)", "easing": "soft" },
        { "offset": 0.4, "transform": "scale(1)", "easing": "linear" },
        { "offset": 1, "transform": "scale(1)" }
      ],
      "options": { "duration": 2000, "easing": "linear", "fill": "both" }
    },
    {
      "target": "ring",
      "at": 0,
      "keyframes": [
        { "offset": 0, "transform": "scale(1)", "easing": "linear" },
        { "offset": 0.12, "transform": "scale(1)", "easing": "standard" },
        { "offset": 0.22, "transform": "scale(0.92)", "easing": "soft" },
        { "offset": 0.36, "transform": "scale(1)", "easing": "linear" },
        { "offset": 1, "transform": "scale(1)" }
      ],
      "options": { "duration": 2000, "easing": "linear", "fill": "both" }
    }
  ]
}
```

### `motion/states.json` (canonical loading machine — rule 3)

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

### `README.md`

One short paragraph per timeline: what it *means* (rule: decide the meaning first),
plus the icon's license/attribution if it came from an icon set.

## Finish: validate

Every JSON file must parse and every reference must resolve. Always end by running the
validator on the new package and fixing anything it reports (see `/msvg:validate` for
the failure table):

```bash
npx -p msvg-cli msvg validate <name>
```

If you are inside the msvg monorepo, use the built CLI instead:
`node packages/cli/bin/msvg.js validate <name>`.

A clean run ends with `Valid MotionSVG package.` Then, to see it move, use
`/msvg:preview`.

## Use it in an app

The runtime consumes the package as one object: `{ config, targets, timelines, states,
svgMarkup }`. With a bundler, import the JSON files and the SVG as a raw string (Vite:
`?raw`); without one, assemble the same object with `fetch` (Spec §14.1).

Vanilla (`msvg-core`):

```ts
import { createMsvg } from "msvg-core";

const controller = createMsvg({ container, animation });
controller.send("LOAD");   // enter the loading loop
```

React (`msvg-react`):

```tsx
import { Msvg } from "msvg-react";

<Msvg animation={animation} onReady={(c) => c.send("LOAD")} />
```

`<Msvg />` also takes `initialState`, `state` (controlled), `onStateChange`,
`events` (DOM event → state-machine event, e.g. `{ mouseenter: "HOVER" }`),
`autoplay`, and `respectReducedMotion`; everything else passes through to the host
`<div>`. When you need to own the host element, `useMsvg({ animation })` returns
`{ ref, controller }` instead.

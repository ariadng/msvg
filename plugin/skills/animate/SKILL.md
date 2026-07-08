---
name: animate
description: Author a meaningful, seamless, bounds-safe SVG animation as an msvg (MotionSVG) package. Use when the user wants to animate an existing SVG icon or logo, add motion to an msvg package, build a loading/intro/hover loop, split an icon into moving parts, or turn a static glyph into an animated one. Teaches the full process — decide what the motion MEANS, split subpaths (holes kept intact), write linear-clip + per-keyframe-eased timelines, keep loops seamless, and never leave the viewBox.
allowed-tools: Bash(python3 *), Bash(npx *), Read, Write, Edit
---

# Authoring an msvg animation

An msvg animation is a **folder package**: `animation.config.json`, `assets/main.svg`, `motion/targets.json`, `motion/timelines.json`, `motion/states.json`, optional `motion/idle.css` and `README.md`. You animate an existing SVG by splitting it into named parts and writing JSON timelines + a state machine over those parts. The runtime plays them with the Web Animations API.

The goal is **not** spectacle. It is a small, meaningful, seamless, bounds-clean loop that reads instantly at icon size (24–56px). Follow the five steps in order; do not skip Step 1.

The canonical worked example (Instagram, all five files, annotated) plus the amplitude cheat-sheets, the easing-warp failure mode, the inset-wrapper math, and the bounds-audit snippet live in **[reference.md](reference.md)**. Read it before authoring your first package or when any step below needs depth.

---

## Step 1 — MEANING (decide this before touching a keyframe)

Ask: **what does this icon do in real life, and what single motion communicates it?** Author the motion of the *thing*, not a generic pulse. Pick one clear idea and commit.

Worked examples:

- **instagram** = a camera. Flash **then** shutter: the aperture dot scales up (flash), *then* the lens contracts and rebounds (shutter click), then the body recoils slightly. Sequenced, not simultaneous.
- **more-vert** (⋮) = typing / working. The three dots pulse in sequence (1-2-3), like a typing indicator — a travelling wave, not all-at-once.
- **file-download** = an arrow dropping into a tray. Arrow slides down into the tray and fades; then **teleports back up invisibly** (opacity 0 at the top) and eases back in — the reset must be a clean cut, never a visible fly-back.
- **schedule** (clock) = time passing. The hands tick — minute hand sweeps, hour hand nudges — with a slight overshoot on each tick. The face never moves.
- **dashboard** = tiles refreshing. The tiles brighten/scale in **reading order** (top-left → bottom-right) in a staggered cascade, like a panel loading.

Write the meaning down (in the README or a comment) as one sentence before continuing. If you cannot name the real-world action, stop and find it.

## Step 2 — ANATOMY (prepare the SVG)

1. **Check the viewBox scale trap** — amplitudes are in viewBox units, and padding differs by source:
   - **Material Symbols**: 960-unit box with ~80 units of built-in padding. A 25-unit translate ≈ 1.5px at 56px render — invisible. Use **60–100 units** for visible motion.
   - **Simple Icons**: 24-unit box with **ZERO padding**. Any transform clips at the edge. Add a static inset wrapper **before** animating: `<g data-inset transform="translate(1.68 1.68) scale(0.86)">` (see reference.md for the math), then animate inside it.
   - See the amplitude cheat-sheet in reference.md for 24 / 48 / 960 boxes.
2. **Decide which parts must move independently.** Group by meaning (`lens`, `dot`, `body`, `hand-minute`), not by drawing artifact.
3. **Split subpaths** when parts share one `<path>`:
   ```
   python3 ${CLAUDE_SKILL_DIR}/scripts/split-subpaths.py path/to/raw.svg
   ```
   It prints one `{ "start": [x,y], "d": "..." }` per subpath (per `M` command), with absolutized starts.
4. **Keep holes concatenated.** A counter-wound subpath inside another (lens ring interior, wheel cut-outs in a truck) is a **hole** via the fill rule. It MUST stay in the **same `<path>`** as its outer shape — concatenate the two `d` strings (outer first). Splitting a hole into its own `<path>` inverts the fill and the hole fills solid. Use each subpath's `start` to see which is nested in which.
5. **Wrap each part** in `<g data-part="name">` and, if it scales/rotates around its own center, **declare the pivot** on it: `style="transform-box: fill-box; transform-origin: 50% 50%"`. The runtime respects declared origins; declaring them makes intent explicit and lets you offset the pivot (e.g. a clock hand pivoting at its base, not its center).
6. Keep SVG conventions: `data-animation="<id>"` on `<svg>`, `fill="currentColor"`, parts as `<g data-part>`, the whole mark as `<g data-part="glyph">` when you also animate it as a unit. **The SVG must render correctly at rest with no animation applied** (required for reduced-motion `static`).

## Step 3 — KEYFRAMES (write the motion)

- **Easing rule (non-negotiable):** a clip's `options.easing` MUST be `"linear"`. Put *all* feel in **per-keyframe `easing`** tokens. A non-linear clip easing warps every keyframe's offset against real time, so your carefully placed beats drift (explained in reference.md — "easing warp"). Tokens: `linear`, `standard`, `soft`, `emphasized`, `bounceSoft`. Raw CSS easing strings are also valid per keyframe.
- **Seamless loops:** in a `loadingLoop` timeline, for **every** animated property the **first keyframe must equal the last keyframe**, and include a **rest beat** (hold the resting value from the end of the action out to `offset: 1`) so the restart is invisible. The action happens in the first ~30–40% of the cycle; the rest is stillness.
- **Canonical loading state machine** (`motion/states.json`):
  ```json
  {"initial":"idle","states":{"idle":{"on":{"LOAD":"loading"}},"loading":{"onEnter":{"timeline":"loadingLoop","loop":true},"on":{"RESET":"idle"}}}}
  ```
  Infinite repetition is expressed only through the state-level `loop: true` — never `iterations: Infinity` in a timeline (the validator rejects it).
- **Amplitude sized to the viewBox** (Step 2). Prefer `transform` and `opacity`. Keep product timelines under 1200ms unless looping/decorative (loops: 1600–5000ms).
- Reference logical target names from `targets.json`; never write raw selectors in `timelines.json`.

## Step 4 — BOUNDS (never leave the viewBox)

- **Budget amplitudes** so the transformed geometry stays inside `0..W`, `0..H`. Scale-ups and translates are the usual offenders. On zero-padding sources (Simple Icons) the static inset wrapper from Step 2 is what buys you headroom.
- **Audit by geometry sampling, not bounding boxes.** `getBoundingClientRect()` returns an axis-aligned box that *inflates* under rotation, giving false out-of-bounds positives. Instead, at each seeked time step, sample points along each animated path with `path.getPointAtLength()` and push them through the element's live `getScreenCTM()` (or `getCTM()`), then check the mapped points against the viewBox. The tight snippet is in reference.md ("bounds audit").
- If any sampled point exits the viewBox, reduce the amplitude or add/adjust the inset wrapper — do not clip.

## Step 5 — VERIFY

1. **Validate the package:**
   ```
   npx -p msvg-cli msvg validate <package-dir>
   ```
   Fix every error. It checks manifest/schema, that timeline targets exist in `targets.json`, that selectors resolve in the SVG, that easing tokens and durations are valid, and that the state machine is sound.
2. **Seek-and-freeze spot checks:** step the loop to a few offsets (e.g. 0, 0.15, 0.3, 1.0), freeze, and confirm (a) the action reads as its intended meaning, (b) offset 0 and offset 1 are visually identical (seamless), and (c) nothing left the viewBox (Step 4).
3. **WAAPI hidden-page semantics:** `Animation.finished` does not resolve while `document.hidden` is true, so looping timelines **park** when the tab is backgrounded and resume on visibility. This is expected — not a bug. Do not add workarounds for it.

---

## Non-negotiable recap

1. Clip easing = `linear`; feel via per-keyframe tokens only.
2. Seamless loop: first keyframe == last keyframe, plus a rest beat.
3. Loops loop via state-level `loop: true`, never `iterations: Infinity`.
4. Holes stay concatenated in their outer shape's `<path>`.
5. Declare per-part pivots (`transform-box: fill-box; transform-origin`).
6. Amplitudes are viewBox units — respect the source's padding.
7. Never exceed the viewBox; verify by geometry sampling.
8. Meaning first. SVG renders correctly at rest.

For anything above that needs more than a line — the full annotated Instagram package, the easing-warp mechanics, subpath/hole recombination, the inset-wrapper math, the amplitude cheat-sheet, and the bounds-audit code — see **[reference.md](reference.md)**.

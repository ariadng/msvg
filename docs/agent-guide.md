# msvg agent guide

Rules and workflow for AI agents editing msvg animation packages. The normative reference is [Spec.md](../Spec.md) §26–§27.

## Workflow

```txt
1. Read animation.config.json
2. Read AGENTS.md (package-specific rules)
3. Read motion/targets.json
4. Read motion/timelines.json
5. Read motion/states.json
6. Make minimal edits
7. Run: msvg validate <package-dir>
8. Fix validation errors
9. Run: msvg inspect <package-dir>
10. Return a summary of changes
```

Run `msvg summarize <package-dir>` first for a machine-friendly overview (safe files, targets, timelines, states, validation status).

## Safe to edit

- `motion/timelines.json`, `motion/states.json`, `motion/targets.json`, `motion/idle.css`, `animation.config.json`

## Edit with care / avoid

- `assets/main.svg` — only when asked; keep `data-animation` / `data-part` attributes stable and the resting visual state intact.
- `index.ts` — only if exports are broken.
- `motion/presets.ts` — arbitrary JavaScript; only when JSON cannot express the motion.

## Rules

1. Use only target names defined in `motion/targets.json`; never invent selectors inside `timelines.json`.
2. Prefer `transform` and `opacity` keyframes. `filter`, `clip-path`, `stroke-*` are "use carefully"; path morphing is out of scope for v1.
3. `iterations: Infinity` is invalid — looping is expressed by a state's `onEnter.loop: true`.
4. Keep non-looping product-UI timelines under 1200 ms (the validator warns beyond it).
5. Preserve accessibility metadata and the `reducedMotion` config.
6. Event names are `UPPER_SNAKE_CASE`; states and targets camelCase; `data-part` values kebab-case.
7. Always finish with `msvg validate` — exit code 0 with no errors is the definition of done. Error output includes stable codes, JSON paths, and did-you-mean suggestions (`--json` for machine-readable issues).

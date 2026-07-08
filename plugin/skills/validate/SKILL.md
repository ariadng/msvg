---
name: validate
description: Validate MotionSVG (msvg) animation package(s) against the schema and their SVG using the msvg CLI. Use when the user asks to validate / check / verify / lint an msvg package, an animated icon package, or a MotionSVG folder, or after creating or editing motion JSON files. Reports schema errors, unresolved timeline/target references, and selectors that match nothing, and maps each to a fix.
argument-hint: [package-dir | dir-of-packages]
---

# Validate msvg package(s)

`msvg validate <package-dir>` checks a package against the schema, resolves every
target selector against `assets/main.svg`, and confirms every state/timeline
reference exists. A package is one folder containing `animation.config.json`.

## Run the CLI

Pick the first form that works in the current project:

```bash
# 1. msvg-cli installed in the project (has a local `msvg` bin):
npx msvg validate <package-dir>

# 2. Not installed — fetch it on demand:
npx -p msvg-cli msvg validate <package-dir>

# 3. Inside the msvg monorepo, use the built CLI directly:
node packages/cli/bin/msvg.js validate <package-dir>
```

Add `--json` to get the raw issue list (`msvg validate <dir> --json`) — useful when you
want to parse results programmatically. Exit code is `0` when valid, non-zero otherwise.

A clean run ends with `Valid MotionSVG package.` Warnings do not fail validation but
should be addressed.

## Validate many packages in one pass

Find every package under a directory and validate each, stopping the loop's success flag
if any fail:

```bash
fail=0
find <root-dir> -name animation.config.json -not -path '*/node_modules/*' -print0 \
  | while IFS= read -r -d '' cfg; do
      pkg=$(dirname "$cfg")
      echo "== $pkg =="
      npx -p msvg-cli msvg validate "$pkg" || fail=1
    done
# (In the monorepo, swap the npx call for: node packages/cli/bin/msvg.js validate "$pkg")
```

## Common failures and fixes

| Symptom (CLI message) | Cause | Fix |
| --- | --- | --- |
| `Clip N in timeline "T" uses unknown easing "X".` (+ "Did you mean") | A `options.easing` value isn't a known token or valid CSS easing. | Set `options.easing` to `"linear"` (house rule 1). Put the feel in per-keyframe `easing`. Valid tokens: `linear`, `standard`, `soft`, `emphasized`, `bounceSoft`. |
| `State "S" onEnter references timeline "T", which does not exist.` | `states.json` names a timeline missing from `timelines.json` (often a typo/casing, e.g. `loadingloop` vs `loadingLoop`). | Rename to the exact key in `timelines.json`, or add the timeline. Follow the "Did you mean" suggestion. |
| `Target "N" selector "S" matches no elements in the SVG.` | A `targets.json` selector matches nothing in `assets/main.svg`. | Make the SVG element carry the attribute the selector expects (`data-part="N"`, `data-animation="id"`), or fix the selector to match the markup. |
| `Target "N" expects one match but selector "S" matched K elements.` | A target declared `{ "selector": "...", "expect": "one" }` matched several nodes. | Tighten the selector, or drop the `expect` constraint if many matches are intended. |
| `Timeline "T" runs Nms, exceeding the 1200ms product-UI guideline.` (warning) | A **non-looping** timeline is longer than 1200ms. | Shorten it, or — if it is genuinely a loop — drive it from a state with `onEnter.loop: true` so it's treated as decorative. |
| `A looping timeline is present but no reduced-motion strategy is configured.` (warning) | A looping timeline exists but `reducedMotion.strategy` is missing or `"none"`. | Add `"reducedMotion": { "strategy": "static", "fallbackState": "idle" }` to `animation.config.json`. |
| `... is missing an "options" object` / `... has invalid "duration"` | A clip lacks `options`, or `duration` is not a positive number. | Add `"options": { "duration": <ms>, "easing": "linear", "fill": "both" }`. |
| `... uses non-finite "iterations".` | A clip set `iterations: Infinity` to loop. | Remove it; infinite looping is expressed only via state `onEnter.loop: true`. |

## What the validator does NOT catch (check these by eye)

Two of the most important house rules are visual, not schema-enforced — a package can
pass `msvg validate` and still look wrong:

- **Per-keyframe `easing` typos are silent.** The validator only checks `options.easing`.
  A bad *keyframe* `easing` token falls back to `linear` at runtime with a console
  warning. Grep the timelines and confirm each keyframe `easing` is a real token.
- **Loop seams (`first != last`) are not detected.** For every `loadingLoop` clip,
  confirm the first and last keyframes are identical for every animated property and that
  there's a rest beat. A mismatch produces a visible jump on restart.

Verify both by watching the animation with `/msvg:preview` and looking for a hitch at the
loop restart.

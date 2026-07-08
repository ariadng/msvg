# msvg package format

An msvg animation is a self-contained folder. Normative reference: [Spec.md](../Spec.md) §6–§14; a complete working package lives in [examples/inventory-agent](../examples/inventory-agent).

```txt
my-animation/
  animation.config.json   # manifest — source of truth (required)
  index.ts                # bundler export: config + motion + svgMarkup (+ presets)
  README.md               # human notes
  AGENTS.md               # editing rules for AI agents

  assets/
    main.svg              # required; authored in resting state; data-part groups
    preview.png           # optional

  motion/
    targets.json          # required; logical name → selector (only place selectors live)
    timelines.json        # required; named arrays of WAAPI clips
    states.json           # optional; event-driven state machine
    idle.css              # optional; passive CSS loops (+ prefers-reduced-motion guard)
    presets.ts            # optional; escape hatch for JS-only motion

  tests/                  # optional
```

## File summaries

- **`animation.config.json`** — `schemaVersion` ("1.0"), `id` (kebab-case, matches folder), `name`, `version`, `asset` paths, `motion` paths, `accessibility` (`title`, `description`, `decorative`), `reducedMotion` (`strategy`: `static | fade | shorten | none`, `fallbackState`).
- **`targets.json`** — `{ "leftArm": "[data-part='arm-left']" }`. Values may also be `{ "selector": "...", "expect": "one" | "many" }` for cardinality validation. Target names camelCase; `data-part` values kebab-case.
- **`timelines.json`** — `{ "intro": [ { "target", "at", "keyframes", "options" } ] }`. `at` is the start offset in ms; `options` = WAAPI options with easing tokens (`linear`, `standard`, `soft`, `emphasized`, `bounceSoft`) or raw CSS easing; `fill` defaults to `both`; `iterations` must be finite.
- **`states.json`** — `initial` plus a `states` map: `onEnter` (`timeline`, `loop`), `on` (EVENT → state), optional `final: true` for intentional dead ends. `onExit` is reserved.
- **`idle.css`** — decorative loops scoped under `[data-animation="<id>"]`, with a `@media (prefers-reduced-motion: reduce)` block. The runtime coordinates via `data-msvg-playing` / `data-msvg-reduced` root attributes.
- **`index.ts`** — exports `{ config, targets, timelines, states, svgMarkup, presets }`.

## Validation

`msvg validate <dir>` checks everything: manifest schema, file existence, JSON validity, target/timeline/state cross-references, selector resolution against `main.svg`, cardinality, easing tokens, duration warnings, state-machine reachability, and accessibility warnings. JSON Schema files for editors ship in `msvg-schema/schemas/`.

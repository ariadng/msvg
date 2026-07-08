# msvg — Claude Code plugin

Author, validate, and preview [MotionSVG](https://github.com/ariadng/msvg) (`msvg`)
animation packages from inside Claude Code. msvg is a schema-first SVG animation system:
every animation is a portable folder of JSON motion definitions that msvg-core plays with
the native Web Animations API — no Lottie, no GSAP, no design-tool exports.

This plugin packages the hard-won house rules for authoring animations that loop
seamlessly and never leave the viewBox, so Claude produces packages that are correct the
first time.

> **Using Claude Desktop instead of Claude Code?** These skills and the `msvg-animator`
> agent are Claude Code-only. Claude Desktop gets the msvg toolchain (validate, inspect,
> summarize, preview, split-subpaths) as MCP tools via the `msvg-mcp` `.mcpb` bundle — see
> [docs/claude-integrations.md](https://github.com/ariadng/msvg/blob/main/docs/claude-integrations.md).

## What you get

**Skills** (invoke with `/msvg:<name>`, or let Claude trigger them by context):

| Skill | Use it to |
| --- | --- |
| `/msvg:create` | Scaffold a new, valid animation package (all 5 files + canonical loading state machine), then validate it. |
| `/msvg:animate` | Design meaningful motion for an existing icon — decide what it *means*, split parts, author expressive keyframes. |
| `/msvg:validate` | Run the msvg CLI against one package or a whole tree; map every error/warning to a fix. |
| `/msvg:preview` | Serve a live browser gallery of every package under a directory, each looping its state machine. |

**Agent:**

- `msvg:msvg-animator` — a subagent specialized in end-to-end MotionSVG authoring. Mention
  it with `@msvg:msvg-animator`, or let Claude delegate icon-animation work to it. It
  applies the same house rules (linear clip easing, seamless loops, declared pivots,
  bounds discipline) and finishes by validating.

## Install

```text
/plugin marketplace add ariadng/msvg
/plugin install msvg@msvg
```

Then reload if needed (`/reload-plugins`) and the `/msvg:*` skills appear in `/help`.

The `/msvg:validate` and `/msvg:preview` skills shell out to the msvg toolchain. They
work with zero setup via `npx -p msvg-cli`, but for the fastest, offline path install the
packages into the project you're working in:

```bash
npm install msvg-core msvg-schema
npm install -D msvg-cli
```

## Quick start

```text
# 1. Scaffold a package
/msvg:create rocket

# 2. Give it meaningful motion (optional — create already ships a working loop)
/msvg:animate rocket

# 3. Check it
/msvg:validate rocket

# 4. Watch it loop
/msvg:preview rocket
```

An msvg package is a folder:

```txt
rocket/
├── animation.config.json      # manifest
├── assets/main.svg            # artwork, authored at rest
└── motion/
    ├── targets.json           # logical name → CSS selector
    ├── timelines.json         # named clip lists (WAAPI keyframes)
    └── states.json            # event-driven state machine
```

Consume it in an app with `createMsvg({ container, animation })` from `msvg-core`. See the
[msvg spec](https://github.com/ariadng/msvg/blob/main/Spec.md) and the
[instagram example](https://github.com/ariadng/msvg/tree/main/examples/social-icons/instagram)
for the canonical reference.

## The house rules (why this plugin exists)

1. **Clip easing is always `linear`** — feel lives in per-keyframe `easing` tokens.
   Non-linear clip easing warps keyframe offsets against real time and desyncs loops.
2. **Seamless loops** — a looping timeline's first keyframe equals its last, with a rest
   beat, so the restart is invisible.
3. **Canonical loading machine** — `idle --LOAD--> loading (loop) --RESET--> idle`.
4. **Declare pivots in the SVG** — `transform-box: fill-box; transform-origin: 50% 50%`
   on each animated part.
5. **Respect the viewBox scale** — amplitudes are in viewBox units; a 24-unit box has no
   padding (add a static inset wrapper), a 960-unit box has ~80 units built in.
6. **Never exceed the viewBox** — verify by geometry, and by watching `/msvg:preview`.
7. **Ship reduced-motion** — `strategy: "static"`, `fallbackState: "idle"` for any loop.

## License

MIT © ariadng

# Inventory Agent

The complete MotionSVG example package from **Spec Section 34** — a friendly
animated assistant that represents inventory-monitoring states (idle, hover,
loading, success, error).

## Structure

```txt
inventory-agent/
  animation.config.json   # manifest — the source of truth (Section 7)
  index.ts                # human-friendly package export (Section 14)
  AGENTS.md               # editing rules for AI agents (Section 26)
  README.md

  assets/
    main.svg              # the illustration, authored in its resting state (Section 8.1)

  motion/
    targets.json          # logical name -> SVG selector (Section 9)
    timelines.json        # named, time-based motion (Section 10)
    states.json           # event-driven state machine (Section 11)
    idle.css              # passive decorative sparkle loop (Section 12)

  tests/
    manifest.test.ts      # schema validation
    targets.test.ts       # target resolution against the SVG
```

## Usage

With a bundler (Vite/webpack/esbuild) that supports `?raw` SVG imports, CSS
side-effect imports, and JSON modules:

```ts
import { createMsvg } from "msvg-core";
import { inventoryAgent } from "./examples/inventory-agent";

const controller = createMsvg({
  container: document.querySelector("#slot")!,
  animation: inventoryAgent,
});

controller.play("intro");

controller.send("LOAD");
// ... later
controller.send("RESOLVE"); // or "REJECT"
```

In React:

```tsx
import { Msvg } from "msvg-react";
import { inventoryAgent } from "./examples/inventory-agent";

<Msvg animation={inventoryAgent} initialState="idle" onReady={(c) => c.play("intro")} />;
```

## A note on `index.ts` and the build

This package has **no build script**, so `tsc` never compiles `index.ts`. That
is intentional: `index.ts` uses the bundler-only `import svgMarkup from
"./assets/main.svg?raw"` form (Section 14), which is meaningful to a bundler but
not to `tsc` under NodeNext. The package's tests do **not** import `index.ts`;
they assemble the package object from disk with `node:fs` so they can run under
plain Node + vitest. Consume `index.ts` from an app that has a bundler
configured as described in Spec Section 14.1.

## Validate

```bash
msvg validate examples/inventory-agent
msvg inspect examples/inventory-agent
```

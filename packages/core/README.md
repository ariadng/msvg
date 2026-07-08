# msvg-core

Runtime for [msvg (MotionSVG)](https://github.com/ariadng/msvg) — schema-first SVG animation packages played through the native Web Animations API. Mounts a packaged SVG, plays its timelines, and drives its state machine. Only dependency is `msvg-schema`.

## Install

```bash
npm install msvg-core
```

## Use

```ts
import { createMsvg } from "msvg-core";
import { myAnimation } from "./animations/my-animation";

const controller = createMsvg({
  container: document.querySelector("#slot")!,
  animation: myAnimation,
});

controller.play("intro");     // play a timeline once
controller.send("LOAD");      // drive the state machine (enters looping states, etc.)
controller.getState();        // current state name
controller.destroy();         // cancel animations, release the DOM
```

An animation package is a plain object: `{ config, targets, timelines, states?, svgMarkup? }` — import it through a bundler or assemble it with `fetch` (no bundler required; see [Spec §14.1](https://github.com/ariadng/msvg/blob/main/Spec.md)).

Also exported: `createStateMachine`, `resolveEasing`, `easings` / `durations` tokens, `applyAccessibility`, and the full TypeScript types.

## Behavior you get for free

- **Reduced motion** — honors `prefers-reduced-motion` per the package's declared strategy.
- **Accessibility** — applies the package's title/description/decorative settings to the mounted SVG.
- **Seamless loops** — looping states re-enter timelines without visual snaps.

## More

- [Human guide](https://github.com/ariadng/msvg/blob/main/docs/human-guide.md) — mounting, playing, React usage
- [Spec](https://github.com/ariadng/msvg/blob/main/Spec.md) — the normative format
- React bindings: [`msvg-react`](https://www.npmjs.com/package/msvg-react) · CLI: [`msvg-cli`](https://www.npmjs.com/package/msvg-cli)

MIT © ariadng

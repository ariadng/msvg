# msvg-react

React bindings for [msvg (MotionSVG)](https://github.com/ariadng/msvg) — a component and a hook over the [`msvg-core`](https://www.npmjs.com/package/msvg-core) runtime.

## Install

```bash
npm install msvg-core msvg-react
```

## `<Msvg />`

```tsx
import { Msvg } from "msvg-react";
import { spinner } from "./animations/spinner";

<Msvg
  animation={spinner}
  onReady={(controller) => controller.play("intro")}
  onStateChange={(state) => console.log(state)}
  events={{ mouseenter: "HOVER" }}   // DOM events → state-machine events
/>
```

Props: `animation` (required), `initialState`, `state` (controlled), `onStateChange`, `onReady`, `events`, `autoplay`, `respectReducedMotion`, `strict` — everything else is passed to the host `<div>`.

## `useMsvg()`

For full control over the host element:

```tsx
import { useMsvg } from "msvg-react";

function Icon() {
  const { ref, controller } = useMsvg({ animation: spinner });
  return <div ref={ref} onClick={() => controller?.send("LOAD")} />;
}
```

## More

- [Human guide](https://github.com/ariadng/msvg/blob/main/docs/human-guide.md) — mounting, timelines, states
- [Spec](https://github.com/ariadng/msvg/blob/main/Spec.md) §29 — React bindings

MIT © ariadng

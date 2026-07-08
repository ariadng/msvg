# msvg human guide

How to consume an msvg animation package in an application. (Authoring/editing packages is covered in the [agent guide](./agent-guide.md) and [package format](./package-format.md).)

## Install

```bash
npm install msvg-core          # vanilla
npm install msvg-core msvg-react   # React
```

## Import an animation

Each animation package exports one object from its `index.ts` (config, targets, timelines, states, `svgMarkup`, presets):

```ts
import { inventoryAgent } from "./animations/inventory-agent";
```

This assumes a bundler that can import SVG as a raw string (`?raw` in Vite) and CSS for side effects. Without a bundler, assemble the object at runtime with `fetch` — see Spec §14.1.

## Mount

Two modes — mount the packaged markup into a container, or attach to SVG already in your DOM:

```ts
import { createMsvg } from "msvg-core";

// container mode: msvg injects animation.svgMarkup
const controller = createMsvg({ container: el, animation: inventoryAgent });

// root mode: the SVG is already in the DOM
const controller = createMsvg({ root: svgEl, animation: inventoryAgent });
```

Options: `autoplay` (default `true` — enters the initial state), `initialState`, `respectReducedMotion` (default `true`), `strict` (default `false` — missing targets warn and skip instead of throwing).

## Control

```ts
await controller.play("intro");   // resolves when done; never rejects on interruption
controller.send("LOAD");          // state machine event
controller.send("RESOLVE");
controller.setState("idle");      // jump directly
const off = controller.onStateChange((s) => console.log(s));
controller.pause(); controller.resume(); controller.stop();
controller.runPreset("blink");
controller.destroy();             // full cleanup
```

Reduced motion is handled automatically per the package's `reducedMotion` strategy (`static` / `fade` / `shorten` / `none`).

## React

```tsx
import { Msvg, useMsvg } from "msvg-react";

<Msvg
  animation={inventoryAgent}
  initialState="idle"
  onReady={(c) => c.play("intro")}
  events={{ pointerenter: "HOVER", pointerleave: "LEAVE" }}
/>

// controlled:
<Msvg animation={inventoryAgent} state={status} onStateChange={setStatus} />

// hook:
const { ref, controller } = useMsvg({ animation: inventoryAgent });
return <div ref={ref} />;   // controller is null until mounted
```

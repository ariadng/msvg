# msvg — MotionSVG Technical Specification

## 1. Overview

**msvg**, short for **MotionSVG**, is a schema-first SVG animation system designed for two primary users:

1. **AI agents** that need to create, edit, inspect, and repair SVG animations safely.
2. **Human developers** who need a clean, predictable, maintainable animation API.

The core idea is simple:

> Every animation is a portable folder-package containing assets, motion definitions, configuration, and validation rules.

msvg is not primarily a visual animation editor. It is a structured animation format and runtime for native SVG motion.

The system should rely on browser-native technologies:

* SVG
* CSS animations
* Web Animations API
* JSON configuration
* TypeScript runtime helpers

The system should not require third-party animation runtimes such as Lottie, Rive, GSAP, Anime.js, SVGator, or After Effects exports.

---

## 2. Goals

### 2.1 Primary Goals

msvg should make SVG animations:

* Easy for AI agents to understand and modify.
* Easy for human developers to import and consume.
* Portable across projects.
* Declarative where possible.
* Validatable before runtime.
* Friendly to version control.
* Built on web-native animation primitives.
* Small and dependency-light.
* Accessible by default.
* Safe for production UI.

### 2.2 AI-Agent Goals

AI agents should be able to:

* Read an animation package.
* Understand available SVG parts.
* Modify timelines.
* Add states.
* Fix broken selectors.
* Inspect animation structure.
* Validate generated changes.
* Avoid editing unsafe or unnecessary files.
* Work inside clear boundaries.

The AI-facing design should prioritize:

* JSON files over free-form JavaScript.
* Explicit schemas.
* Stable folder conventions.
* Clear validation errors.
* Predictable naming conventions.
* Human-readable documentation inside each animation package.

### 2.3 Human Developer Goals

Human developers should be able to:

* Import an animation as a module.
* Mount it into vanilla JavaScript or a framework.
* Trigger timelines.
* Send state-machine events.
* Control playback.
* Respect reduced-motion settings.
* Override animation state from application logic.
* Maintain the animation without depending on external design tools.

Example desired usage:

```ts
import { createMsvg } from "msvg-core";
import { inventoryAgent } from "./animations/inventory-agent";

const controller = createMsvg({
  root: document.querySelector("[data-animation='inventory-agent']"),
  animation: inventoryAgent
});

controller.play("intro");
controller.send("LOAD");
controller.send("RESOLVE");
```

---

## 3. Non-Goals

msvg v1 should not attempt to be:

* A visual animation editor.
* A replacement for Figma, Rive, or After Effects.
* A full physics engine.
* A canvas/WebGL renderer.
* A proprietary animation file format.
* A general-purpose animation library for all DOM elements.
* A complex timeline scrubbing engine.
* A path-morphing-first animation system.

These may be explored later, but v1 should focus on a small, reliable foundation.

---

## 4. Core Philosophy

msvg should follow this principle:

```txt
AI agents edit structured animation packages.
Humans consume clean runtime APIs.
The browser runs native SVG animation.
```

The system should separate responsibilities clearly:

```txt
assets/              = what the animation looks like
motion/targets.json  = named SVG parts
motion/timelines.json = time-based motion
motion/states.json   = state-based behavior
motion/idle.css      = passive decorative loops
animation.config.json = animation manifest
index.ts             = human-friendly export
```

---

## 5. High-Level Architecture

```txt
msvg/
  packages/
    core/
    schema/
    cli/
    react/
    vue/
    svelte/

  examples/
    inventory-agent/
    success-checkmark/
    loading-orb/

  docs/
    agent-guide.md
    human-guide.md
    package-format.md
```

### 5.1 Package Responsibilities

#### `msvg-core`

The core runtime.

Responsibilities:

* Load animation definitions.
* Mount SVG markup into a container, or attach to SVG already in the DOM.
* Resolve target names to SVG selectors.
* Play timelines.
* Run state machines.
* Handle reduced motion.
* Apply accessibility metadata to the SVG.
* Expose controller API.
* Avoid framework-specific assumptions.

#### `msvg-schema`

The schema package.

Responsibilities:

* Provide JSON Schemas.
* Provide shared TypeScript types.
* Validate animation package files.
* Define supported config versions.

#### `msvg-cli`

The command-line tool.

Responsibilities:

* Create new animation packages.
* Validate existing packages.
* Inspect animation structure.
* Check SVG target availability.
* Generate package summaries for AI agents.
* Preview animations locally.

#### `msvg-react`

React adapter.

Responsibilities:

* Render or mount SVG animations.
* Expose hooks.
* Bind animation states to React state.
* Provide controller access.

Optional future packages:

```txt
msvg-vue
msvg-svelte
msvg-solid
```

---

## 6. Animation Package Structure

Each animation should be a self-contained folder.

Recommended structure:

```txt
animations/
  inventory-agent/
    animation.config.json
    index.ts
    README.md
    AGENTS.md

    assets/
      main.svg
      preview.png

    motion/
      targets.json
      timelines.json
      states.json
      idle.css
      presets.ts

    tests/
      targets.test.ts
      manifest.test.ts
```

### 6.1 Required Files

Minimum valid package:

```txt
animation.config.json
assets/main.svg
motion/targets.json
motion/timelines.json
```

### 6.2 Optional Files

```txt
motion/states.json
motion/idle.css
motion/presets.ts
README.md
AGENTS.md
assets/preview.png
tests/
```

---

## 7. Animation Manifest

File:

```txt
animation.config.json
```

Purpose:

The manifest is the source of truth for the animation package.

Example:

```json
{
  "schemaVersion": "1.0",
  "id": "inventory-agent",
  "name": "Inventory Agent",
  "version": "0.1.0",
  "description": "Animated SVG assistant for inventory monitoring states.",

  "asset": {
    "svg": "./assets/main.svg",
    "preview": "./assets/preview.png"
  },

  "motion": {
    "targets": "./motion/targets.json",
    "timelines": "./motion/timelines.json",
    "states": "./motion/states.json",
    "idleCss": "./motion/idle.css"
  },

  "accessibility": {
    "title": "Inventory Agent",
    "description": "Animated assistant representing inventory monitoring.",
    "decorative": false
  },

  "reducedMotion": {
    "strategy": "static",
    "fallbackState": "idle"
  }
}
```

### 7.1 Manifest Fields

#### `schemaVersion`

The package schema version.

Example:

```json
"schemaVersion": "1.0"
```

#### `id`

Unique animation identifier.

Rules:

* kebab-case
* stable over time
* should match folder name

Example:

```json
"id": "inventory-agent"
```

#### `name`

Human-readable animation name.

#### `version`

Animation package version.

Useful when animation packages are distributed separately.

#### `description`

Short description of the animation’s purpose.

#### `asset`

Defines visual assets.

```json
"asset": {
  "svg": "./assets/main.svg",
  "preview": "./assets/preview.png"
}
```

#### `motion`

Defines motion files.

```json
"motion": {
  "targets": "./motion/targets.json",
  "timelines": "./motion/timelines.json",
  "states": "./motion/states.json",
  "idleCss": "./motion/idle.css"
}
```

#### `accessibility`

Accessibility metadata.

```json
"accessibility": {
  "title": "Inventory Agent",
  "description": "Animated assistant representing inventory monitoring.",
  "decorative": false
}
```

Runtime application:

* On mount or attach, the runtime injects `<title>` and `<desc>` elements from `title` and `description`, sets `role="img"`, and links them with `aria-labelledby`.
* When `decorative` is `true`, the runtime sets `aria-hidden="true"` instead and skips title and description injection.

#### `reducedMotion`

Reduced-motion behavior.

Allowed strategies:

```txt
static
fade
shorten
none
```

Recommended default:

```json
"reducedMotion": {
  "strategy": "static",
  "fallbackState": "idle"
}
```

---

## 8. SVG Asset Requirements

Main SVG file:

```txt
assets/main.svg
```

The SVG should use stable semantic attributes.

Recommended:

```svg
<svg data-animation="inventory-agent" viewBox="0 0 512 512">
  <g data-part="body">...</g>
  <g data-part="eyes">...</g>
  <g data-part="arm-left">...</g>
  <g data-part="sparkles">...</g>
  <g data-part="loader">...</g>
</svg>
```

Avoid relying on random design-tool IDs:

```svg
<g id="Group_8473">
```

Prefer:

```svg
<g data-part="arm-left">
```

### 8.1 SVG Authoring Rules

SVGs should:

* Use stable `data-animation` and `data-part` attributes.
* Group meaningful visual parts with `<g>`.
* Avoid random generated IDs where possible.
* Avoid inline animation logic unless necessary.
* Avoid path morphing for v1 unless explicitly supported.
* Use `viewBox`.
* Avoid hardcoded dimensions unless needed.
* Keep transformable parts grouped properly.
* Keep semantic parts small enough to animate independently.
* Be authored in the resting (final) visual state — the SVG must render correctly with no animation applied. This is required for `reducedMotion: "static"` (Section 19) and for environments where scripting is unavailable.

### 8.2 Recommended SVG Naming

```txt
data-animation="inventory-agent"
data-part="body"
data-part="eyes"
data-part="arm-left"
data-part="sparkles"
data-part="loader"
```

Rules:

* `data-animation` should match animation ID.
* `data-part` values should be kebab-case.
* Part names should describe meaning, not visual implementation.
* Prefer `arm-left` over `shape-12`.
* Prefer `sparkles` over `group-a`.

---

## 9. Targets File

File:

```txt
motion/targets.json
```

Purpose:

Maps logical target names to SVG selectors.

Example:

```json
{
  "root": "[data-animation='inventory-agent']",
  "body": "[data-part='body']",
  "eyes": "[data-part='eyes']",
  "leftArm": "[data-part='arm-left']",
  "sparkles": "[data-part='sparkles']",
  "loader": "[data-part='loader']"
}
```

### 9.1 Target Rules

* Timelines should reference logical target names.
* Selectors should live only in `targets.json`.
* AI agents should not invent selectors inside `timelines.json`.
* Target names should be camelCase.
* SVG `data-part` values should be kebab-case.

Good:

```json
{
  "leftArm": "[data-part='arm-left']"
}
```

Bad:

```json
{
  "Group8473": "#Group_8473"
}
```

### 9.2 Runtime Target Resolution

Timeline clip:

```json
{
  "target": "sparkles"
}
```

Runtime resolves:

```txt
sparkles → [data-part='sparkles']
```

This keeps the timeline clean and agent-friendly.

### 9.3 Target Cardinality

A target value is either a selector string or an object with an expected match count:

```json
{
  "body": "[data-part='body']",
  "sparkles": { "selector": "[data-part='sparkle']", "expect": "many" }
}
```

Rules:

* A plain string declares no cardinality expectation; the runtime animates every match.
* `"expect": "one"` makes the validator fail when the selector matches zero nodes or more than one node.
* `"expect": "many"` documents that multiple matches are intentional.

---

## 10. Timeline File

File:

```txt
motion/timelines.json
```

Purpose:

Defines named timelines.

Example:

```json
{
  "intro": [
    {
      "target": "body",
      "at": 0,
      "keyframes": [
        {
          "opacity": 0,
          "transform": "translateY(12px) scale(0.96)"
        },
        {
          "opacity": 1,
          "transform": "translateY(0) scale(1)"
        }
      ],
      "options": {
        "duration": 500,
        "easing": "standard",
        "fill": "both"
      }
    },
    {
      "target": "sparkles",
      "at": 300,
      "keyframes": [
        {
          "opacity": 0,
          "transform": "scale(0.6)"
        },
        {
          "opacity": 1,
          "transform": "scale(1)"
        }
      ],
      "options": {
        "duration": 350,
        "easing": "soft",
        "fill": "both"
      }
    }
  ],

  "success": [
    {
      "target": "sparkles",
      "at": 0,
      "keyframes": [
        {
          "opacity": 0,
          "transform": "scale(0.4)"
        },
        {
          "opacity": 1,
          "transform": "scale(1.1)"
        },
        {
          "opacity": 1,
          "transform": "scale(1)"
        }
      ],
      "options": {
        "duration": 500,
        "easing": "soft",
        "fill": "both"
      }
    }
  ]
}
```

### 10.1 Timeline Structure

A timeline is a named array of clips.

```json
{
  "timelineName": [
    {
      "target": "targetName",
      "at": 0,
      "keyframes": [],
      "options": { "duration": 300 }
    }
  ]
}
```

### 10.2 Clip Fields

#### `target`

Logical target name from `targets.json`.

#### `at`

Start offset in milliseconds.

Example:

```json
"at": 300
```

#### `keyframes`

Native-compatible Web Animations API keyframes.

Recommended properties:

* `opacity`
* `transform`
* `filter`

Note: the `offset` key in a Web Animations API keyframe is reserved for the keyframe's position (0–1). It cannot be used to animate the CSS `offset` property — the platform maps that property to `cssOffset`. Motion-path animation is out of scope for v1.

Preferred v1 properties:

```txt
opacity
transform
```

#### `options`

Animation options.

Example:

```json
"options": {
  "duration": 500,
  "easing": "soft",
  "fill": "both"
}
```

### 10.3 Easing Tokens

Instead of raw cubic-bezier strings everywhere, timelines should use named easing tokens.

Example:

```json
"easing": "soft"
```

Runtime resolves:

```ts
soft → "cubic-bezier(.4, 0, .2, 1)"
```

The canonical token table lives in Section 18.1. Raw easing strings are also valid (`linear`, `ease-in-out`, `cubic-bezier(...)`, `steps(...)`).

Unknown tokens fail validation. If one reaches the runtime anyway, it falls back to `linear` with a console warning.

### 10.4 Duration Guidelines

Recommended timing:

```txt
micro interaction: 120–240ms
small UI transition: 240–420ms
illustration intro: 420–900ms
decorative loop: 1600–5000ms
```

For product UI, most timelines should stay under:

```txt
1200ms
```

Unless the animation is decorative. The validator warns when a non-looping timeline exceeds this threshold (Section 30.3).

---

## 11. State Machine File

File:

```txt
motion/states.json
```

Purpose:

Defines event-driven animation states.

Example:

```json
{
  "initial": "idle",

  "states": {
    "idle": {
      "on": {
        "HOVER": "hovered",
        "LOAD": "loading"
      }
    },

    "hovered": {
      "onEnter": {
        "timeline": "hover"
      },
      "on": {
        "LEAVE": "idle",
        "LOAD": "loading"
      }
    },

    "loading": {
      "onEnter": {
        "timeline": "loadingLoop",
        "loop": true
      },
      "on": {
        "RESOLVE": "success",
        "REJECT": "error"
      }
    },

    "success": {
      "onEnter": {
        "timeline": "success"
      },
      "on": {
        "RESET": "idle"
      }
    },

    "error": {
      "onEnter": {
        "timeline": "error"
      },
      "on": {
        "RESET": "idle"
      }
    }
  }
}
```

The `hover`, `loadingLoop`, and `error` timelines referenced above are defined in the complete example in Section 34.

### 11.1 State Machine Concepts

A state machine controls when motion happens.

A timeline controls how motion happens.

They should remain separate.

```txt
Timeline      = motion over time
State machine = behavior across states
```

### 11.2 State Fields

#### `initial`

Initial state.

```json
"initial": "idle"
```

#### `states`

State map.

Each state may include:

```json
{
  "onEnter": {},
  "onExit": {},
  "on": {}
}
```

#### `onEnter`

Action performed when entering the state.

Example:

```json
"onEnter": {
  "timeline": "success"
}
```

`onEnter` may set `"loop": true` to restart the timeline each time it completes, until the state is exited (see Section 16.1).

Avoid wiring one-shot intro timelines to frequently re-entered states such as `idle` — the timeline replays on every re-entry. Play intros explicitly with `controller.play()` instead.

#### `onExit`

Optional action performed when leaving the state.

Reserved for a future version. The v1 runtime ignores it.

#### `on`

Event transitions.

Example:

```json
"on": {
  "RESOLVE": "success",
  "REJECT": "error"
}
```

#### `final`

Optional. Marks a state as an intentional dead end:

```json
"done": {
  "final": true
}
```

The validator flags states with no outgoing transitions unless they set `"final": true`.

### 11.3 Event Naming

Events should be uppercase.

Recommended examples:

```txt
HOVER
LEAVE
LOAD
RESOLVE
REJECT
RESET
START
STOP
COMPLETE
OPEN
CLOSE
```

### 11.4 State Naming

State names should be camelCase; prefer single lowercase words.

Recommended examples:

```txt
idle
hovered
loading
success
error
disabled
active
expanded
collapsed
```

---

## 12. CSS Idle Motion

File:

```txt
motion/idle.css
```

Purpose:

Defines simple passive loops.

Example:

```css
[data-animation="inventory-agent"] [data-part="sparkles"] {
  animation: inventory-agent-sparkle 2.8s ease-in-out infinite alternate;
  transform-box: fill-box;
  transform-origin: center;
}

@keyframes inventory-agent-sparkle {
  from {
    opacity: 0.45;
    transform: scale(0.96);
  }

  to {
    opacity: 1;
    transform: scale(1.04);
  }
}

@media (prefers-reduced-motion: reduce) {
  [data-animation="inventory-agent"] [data-part="sparkles"] {
    animation: none;
  }
}
```

### 12.1 When to Use CSS

Use CSS for:

* Idle loops
* Hover-only effects
* Decorative floating
* Pulsing
* Simple shimmer
* Simple rotation
* Ambient motion

### 12.2 When to Use Timelines

Use timelines for:

* Intro animation
* Success animation
* Error animation
* Loading transition
* Multi-part choreography
* Sequence-based motion
* Application-triggered motion

### 12.3 When to Use State Machines

Use state machines for:

* Loading state
* Success state
* Error state
* Hover state
* Disabled state
* Interactive SVG characters
* Agent avatars
* UI illustrations driven by app logic

### 12.4 Coordination with Timelines

CSS idle animations and Web Animations API timelines can target the same elements. The runtime does not merge them; the platform's composite order applies:

* While a timeline clip is running, it overrides a CSS idle animation on the same property.
* When the runtime finishes or interrupts a timeline, it commits the final styles and cancels the animation (Section 16), and the CSS idle animation takes effect again.

Rules:

* Do not animate the same property on the same part in both `idle.css` and a timeline. The validator warns when it can detect this.
* Keep idle loop ranges close to the resting state, so that a loop resuming after a timeline does not visibly jump.
* The runtime sets `data-msvg-playing` on the root element while any timeline is active. Idle rules that must fully yield during timelines can opt out with `:not([data-msvg-playing])`.
* The runtime sets `data-msvg-reduced` on the root element when reduced motion applies (Section 19). The `@media (prefers-reduced-motion: reduce)` guard shown above should still be included so the CSS behaves correctly without the runtime.

---

## 13. Optional Presets File

File:

```txt
motion/presets.ts
```

Purpose:

Defines custom animation functions for advanced cases that do not fit cleanly into JSON.

Example:

```ts
import type { MsvgPresetContext } from "msvg-core";

export function blink({ getTarget }: MsvgPresetContext) {
  const eyes = getTarget("eyes");

  if (!eyes) return null;

  return eyes.animate(
    [
      { transform: "scaleY(1)" },
      { transform: "scaleY(0.1)" },
      { transform: "scaleY(1)" }
    ],
    {
      duration: 180,
      easing: "ease-in-out",
      fill: "both"
    }
  );
}
```

### 13.1 Preset Rules

`presets.ts` should be optional.

AI agents should prefer editing:

```txt
animation.config.json
motion/targets.json
motion/timelines.json
motion/states.json
motion/idle.css
```

Agents should edit `presets.ts` only when necessary.

Presets must resolve elements through the target map (`getTarget`, `getTargets`), never through hardcoded selectors — the selector rules in Section 9.1 apply to presets too.

Presets are exposed through the package export (Section 14) and invoked with `controller.runPreset("blink")` (Section 15.3).

Security note: `presets.ts` is arbitrary JavaScript and `idle.css` is arbitrary CSS, both executed in the host application. Treat animation packages as code, not data — when importing a package from an external source, review these files like any other source code.

---

## 14. Public Animation Export

File:

```txt
index.ts
```

Purpose:

Creates a clean human-friendly import.

Example:

```ts
import config from "./animation.config.json";
import targets from "./motion/targets.json";
import timelines from "./motion/timelines.json";
import states from "./motion/states.json";
import svgMarkup from "./assets/main.svg?raw";
import * as presets from "./motion/presets"; // optional — only if motion/presets.ts exists
import "./motion/idle.css";

export const inventoryAgent = {
  config,
  targets,
  timelines,
  states,
  svgMarkup,
  presets
};
```

The SVG markup is part of the package export. This is what allows the runtime (and framework adapters) to mount the animation — the manifest's relative paths such as `./assets/main.svg` are meaningful to the CLI and validator, not to the runtime, which consumes the already-loaded package object.

Human usage:

```ts
import { inventoryAgent } from "./animations/inventory-agent";
```

### 14.1 Bundler and No-Bundler Loading

The example above assumes a bundler (Vite, webpack, esbuild, or similar) configured to:

* import SVG files as raw strings (`?raw` in Vite, `asset/source` in webpack),
* import CSS files for side effects,
* import JSON modules.

Without a bundler, assemble the package object at runtime instead:

```ts
const base = "./animations/inventory-agent";

const [config, targets, timelines, states, svgMarkup] = await Promise.all([
  fetch(`${base}/animation.config.json`).then((r) => r.json()),
  fetch(`${base}/motion/targets.json`).then((r) => r.json()),
  fetch(`${base}/motion/timelines.json`).then((r) => r.json()),
  fetch(`${base}/motion/states.json`).then((r) => r.json()),
  fetch(`${base}/assets/main.svg`).then((r) => r.text())
]);

const inventoryAgent = { config, targets, timelines, states, svgMarkup };
```

And link the idle stylesheet directly:

```html
<link rel="stylesheet" href="./animations/inventory-agent/motion/idle.css">
```

---

## 15. Core Runtime API

Package:

```txt
msvg
```

### 15.1 `createMsvg`

Primary runtime function.

```ts
import { createMsvg } from "msvg-core";

const controller = createMsvg({
  root,
  animation
});
```

### 15.2 Input

```ts
type CreateMsvgOptions = {
  root?: Element;
  container?: Element;
  animation: MsvgAnimationPackage;
  autoplay?: boolean;
  initialState?: string;
  respectReducedMotion?: boolean;
  strict?: boolean;
};
```

Option semantics:

* Exactly one of `root` or `container` is required. `root` attaches to an element that already contains the SVG markup. `container` mounts `animation.svgMarkup` into the given element.
* `autoplay` (default `true`) enters the initial state and runs its `onEnter` action on creation. With `autoplay: false`, nothing plays until the first `play()`, `send()`, or `setState()` call.
* `initialState` overrides `initial` from `states.json`. Precedence: the `initialState` option first, then `states.json` `initial`.
* `respectReducedMotion` defaults to `true`.
* `strict` (default `false`): in strict mode, missing targets throw at play time; otherwise the runtime warns and skips (Section 16).

On mount or attach, the runtime applies accessibility metadata (Section 7.1).

### 15.3 Controller API

```ts
type MsvgController = {
  play: (timelineName: string) => Promise<void>;
  pause: () => void;
  resume: () => void;
  stop: () => void;

  send: (eventName: string) => void;
  setState: (stateName: string) => void;
  getState: () => string | null;
  onStateChange: (callback: (state: string) => void) => () => void;

  runPreset: (presetName: string) => Animation | null;

  getTimelines: () => string[];
  getStates: () => string[];
  getTargets: () => string[];

  destroy: () => void;
};
```

Behavior:

* `play()` resolves when every clip in the timeline has finished. For looping timelines it resolves after the first full cycle (Section 16.1). It never rejects because the timeline was interrupted or stopped.
* `pause()`, `resume()`, and `stop()` apply to all animations created through this controller (timelines and presets). They do not affect CSS idle animations.
* `send()` is a no-op that logs a console warning when the package has no state machine. Events with no transition from the current state are ignored silently.
* `onStateChange()` registers a listener called after every state transition and returns an unsubscribe function.
* `runPreset()` invokes a preset from the package's `presets` export (Section 13).
* `destroy()` interrupts all running animations, removes runtime-set attributes (`data-msvg-playing`, `data-msvg-reduced`), detaches listeners, and removes markup that was mounted via `container`.

### 15.4 Example Usage

```ts
const controller = createMsvg({
  root: document.querySelector("[data-animation='inventory-agent']")!,
  animation: inventoryAgent
});

controller.play("intro");

button.addEventListener("click", async () => {
  controller.send("LOAD");

  try {
    await submitForm();
    controller.send("RESOLVE");
  } catch {
    controller.send("REJECT");
  }
});
```

---

## 16. Timeline Runtime

The timeline runtime should:

* Accept a named timeline.
* Resolve each clip target through `targets.json`.
* Convert easing tokens into real easing strings.
* Set `transform-box: fill-box` and `transform-origin: center` on each target before animating, unless the target already declares them via CSS or inline style. Without this, SVG transforms resolve against the view-box origin and scale/rotate animations visibly shift position.
* Start clips based on `at` offsets.
* Warn and skip clips whose target is missing; throw only in strict mode.
* Return animation controls.
* Commit final styles and cancel animations on completion or interruption, so that at most one live animation exists per target and no fill state accumulates.
* Support reduced-motion behavior.

Conceptual implementation:

```ts
export function playTimeline(root, timeline, targets, tokens, { strict = false } = {}) {
  const animations = timeline.flatMap((clip) => {
    const selector = selectorFor(targets[clip.target]);

    if (!selector) {
      return skip(`Unknown target: ${clip.target}`, strict);
    }

    const elements = Array.from(root.querySelectorAll(selector));

    if (elements.length === 0) {
      return skip(`Target not found in SVG: ${clip.target}`, strict);
    }

    return elements.map((element) => {
      prepareTransform(element); // transform-box: fill-box; transform-origin: center

      return element.animate(clip.keyframes, {
        ...clip.options,
        delay: (clip.options.delay ?? 0) + clip.at,
        easing: resolveEasing(clip.options.easing, tokens),
        fill: clip.options.fill ?? "both"
      });
    });
  });

  // Settle an animation without leaving fill state or snapping:
  // commit the current styles, then cancel.
  const settle = (animation) => {
    try {
      animation.commitStyles();
    } catch {
      // detached element — nothing to commit
    }
    animation.cancel();
  };

  const finished = Promise.all(
    // finished rejects on cancel(); interruption must not surface as an error
    animations.map((animation) => animation.finished.catch(() => undefined))
  ).then(() => undefined);

  finished.then(() => animations.forEach(settle));

  return {
    animations,
    pause: () => animations.forEach((animation) => animation.pause()),
    resume: () => animations.forEach((animation) => animation.play()),
    stop: () => animations.forEach(settle),
    finished
  };
}

function skip(message, strict) {
  if (strict) throw new Error(message);
  console.warn(`[msvg] ${message} — clip skipped`);
  return [];
}
```

### 16.1 Timeline Looping

A timeline started with `loop: true` (from a state's `onEnter`, Section 11) restarts all clips together after the longest clip completes. Individual clips never loop independently.

* Clip-level `options.iterations` is allowed for finite repeats within one cycle.
* `iterations: Infinity` is invalid in `timelines.json` — infinite repetition is expressed only through state-level `loop`. The validator rejects it.
* For looping timelines, the `finished` promise (and `controller.play()`) resolves after the first full cycle.

---

## 17. State Machine Runtime

The state machine runtime should:

* Load `states.json`.
* Start at `initial` (or the `initialState` option) when `autoplay` is enabled.
* Run `onEnter` actions.
* Accept events through `controller.send(eventName)`.
* Transition to the next state if valid.
* Interrupt the previous state's animations immediately when a transition fires — commit current styles, then cancel (Section 16) — before entering the next state. Events received mid-timeline are not queued.
* Ignore `onExit` (reserved for a future version).
* Notify `onStateChange` subscribers after each transition.
* Expose current state.

Conceptual implementation:

```ts
export function createStateMachine(config, actions) {
  let current = config.initial;

  function enter(stateName) {
    const state = config.states[stateName];

    if (state?.onEnter?.timeline) {
      actions.playTimeline(state.onEnter.timeline, {
        loop: state.onEnter.loop
      });
    }
  }

  function transition(eventName) {
    const currentState = config.states[current];
    const next = currentState?.on?.[eventName];

    if (!next) return;

    actions.stopCurrent(); // commit styles, then cancel (Section 16)
    current = next;
    enter(current);
  }

  enter(current);

  return {
    send: transition,
    getState: () => current,
    setState: (stateName) => {
      if (!config.states[stateName]) {
        throw new Error(`Unknown state: ${stateName}`);
      }

      actions.stopCurrent();
      current = stateName;
      enter(current);
    }
  };
}
```

---

## 18. Motion Tokens

Package location:

```txt
packages/core/src/tokens/
```

Recommended token files:

```txt
durations.ts
easings.ts
```

### 18.1 Easings

```ts
export const easings = {
  linear: "linear",
  standard: "cubic-bezier(.2, 0, 0, 1)",
  soft: "cubic-bezier(.4, 0, .2, 1)",
  emphasized: "cubic-bezier(.05, .7, .1, 1)",
  bounceSoft: "cubic-bezier(.34, 1.56, .64, 1)"
};
```

### 18.2 Durations

```ts
export const durations = {
  instant: 0,
  fast: 180,
  medium: 420,
  slow: 900,
  ambient: 2800
};
```

### 18.3 Token Usage in JSON

```json
{
  "options": {
    "duration": 500,
    "easing": "soft",
    "fill": "both"
  }
}
```

Future version may allow duration tokens:

```json
{
  "options": {
    "duration": "medium",
    "easing": "soft"
  }
}
```

---

## 19. Reduced Motion

msvg should respect `prefers-reduced-motion`.

Default behavior:

```ts
window.matchMedia("(prefers-reduced-motion: reduce)")
```

### 19.1 Strategies

#### `static`

Timelines do not run. `controller.play()` resolves immediately without animating. State transitions still occur, but the SVG shows its authored resting state (Section 8.1) throughout. CSS idle loops are disabled.

#### `fade`

Each clip runs with its `transform` keyframes removed and its duration clamped to 200ms, so only opacity (and other non-motion properties) animate. Clips left with no animatable properties are skipped.

#### `shorten`

Clip durations are clamped to 120ms and `at` offsets are scaled proportionally. Looping timelines and CSS idle loops are disabled.

#### `none`

Do not alter animation behavior.

### 19.2 Runtime Mechanism

When reduced motion applies and the strategy is not `none`, the runtime sets `data-msvg-reduced` on the root element. `idle.css` files should also include a `@media (prefers-reduced-motion: reduce)` block (Section 12) so the CSS behaves correctly even without the runtime.

`fallbackState` names the state to enter (without motion) when reduced motion applies.

### 19.3 Recommended Default

```json
"reducedMotion": {
  "strategy": "static",
  "fallbackState": "idle"
}
```

---

## 20. CLI Specification

Package:

```txt
msvg-cli
```

Binary:

```bash
msvg
```

### 20.1 Commands

```bash
msvg create <name>
msvg validate <path>
msvg inspect <path>
msvg check-targets <path>
msvg preview <path>
msvg summarize <path>
```

### 20.2 `msvg preview`

Starts a local static server that renders the package's SVG with a minimal control panel: one button per timeline, one button per state-machine event, and a reduced-motion toggle. It is a manual authoring aid, not part of the validation pipeline. The remaining commands are specified in Sections 21–25.

---

## 21. CLI: `msvg create`

Creates a new animation package.

Example:

```bash
msvg create inventory-agent
```

Output:

```txt
animations/inventory-agent/
  animation.config.json
  index.ts
  README.md
  AGENTS.md

  assets/
    main.svg

  motion/
    targets.json
    timelines.json
    states.json
    idle.css
```

---

## 22. CLI: `msvg validate`

Validates the package.

Example:

```bash
msvg validate animations/inventory-agent
```

Checks:

* Manifest exists.
* Manifest matches schema.
* SVG asset exists.
* Targets file exists.
* Timelines file exists.
* State file is valid if present.
* Timeline targets exist in `targets.json`.
* Target selectors exist in SVG.
* Targets with `expect: "one"` match exactly one SVG node.
* State timelines exist in `timelines.json`.
* Initial state exists.
* Transition target states exist.
* Easing tokens are valid.
* Durations are valid.
* Reduced-motion config is valid.
* Required accessibility fields exist.

Example output:

```txt
msvg validate animations/inventory-agent

✓ animation.config.json
✓ assets/main.svg
✓ motion/targets.json
✓ motion/timelines.json
✓ motion/states.json

Targets:
  body       ✓ found
  eyes       ✓ found
  leftArm    ✓ found
  sparkles   ✓ found
  loader     ✓ found

Timelines:
  intro        ✓ 2 clips
  hover        ✓ 1 clip
  loadingLoop  ✓ 1 clip
  success      ✓ 1 clip
  error        ✓ 1 clip

States:
  idle       ✓
  hovered    ✓
  loading    ✓
  success    ✓
  error      ✓

Result:
  Valid MotionSVG package.
```

Example error:

```txt
Error: Timeline "success" references target "sparkle", but no target named "sparkle" exists.

Did you mean:
  sparkles
```

---

## 23. CLI: `msvg inspect`

Prints human-readable package structure.

Example:

```bash
msvg inspect animations/inventory-agent
```

Example output:

```txt
Animation: Inventory Agent
ID: inventory-agent
Version: 0.1.0

Assets:
  SVG: assets/main.svg
  Preview: assets/preview.png

Targets:
  body       [data-part='body']
  eyes       [data-part='eyes']
  leftArm    [data-part='arm-left']
  sparkles   [data-part='sparkles']
  loader     [data-part='loader']

Timelines:
  intro        2 clips, 650ms total
  hover        1 clip, 200ms total
  loadingLoop  1 clip, 1200ms total (looped by state "loading")
  success      1 clip, 500ms total
  error        1 clip, 400ms total

States:
  idle       → HOVER, LOAD
  hovered    → LEAVE, LOAD
  loading    → RESOLVE, REJECT
  success    → RESET
  error      → RESET
```

---

## 24. CLI: `msvg check-targets`

Checks that every target selector maps to an actual SVG node.

Example:

```bash
msvg check-targets animations/inventory-agent
```

This is especially important for AI-agent workflows.

`check-targets` runs only the target-resolution subset of `msvg validate`. It is useful as a fast check after editing `targets.json` or the SVG.

Note: validation resolves selectors against `assets/main.svg`. The DOM the animation is mounted into at runtime may have drifted from that file, so validation cannot guarantee runtime resolution. This is why the runtime warns and skips missing targets by default instead of throwing (Section 16).

---

## 25. CLI: `msvg summarize`

Generates an AI-friendly summary.

Example:

```bash
msvg summarize animations/inventory-agent
```

Output:

```md
# MotionSVG Package Summary

Animation: inventory-agent

Safe files to edit:
- motion/timelines.json
- motion/states.json
- motion/targets.json
- motion/idle.css
- animation.config.json

Use these targets:
- body
- eyes
- leftArm
- sparkles
- loader

Available timelines:
- intro
- hover
- loadingLoop
- success
- error

Available states:
- idle
- hovered
- loading
- success
- error

Validation status:
- Valid
```

This command is useful for AI agents before making changes.

---

## 26. Agent Instructions File

Each animation package should include:

```txt
AGENTS.md
```

Purpose:

Gives AI agents explicit editing rules.

Example:

```md
# Agent Instructions for inventory-agent

You may safely edit:

- motion/timelines.json
- motion/states.json
- motion/targets.json
- motion/idle.css
- animation.config.json

Be careful when editing:

- assets/main.svg

Do not edit:

- index.ts unless exports are broken

Rules:

1. Use only target names defined in motion/targets.json.
2. Do not create random selectors inside timelines.json.
3. Prefer transform and opacity animations.
4. Avoid path morphing unless explicitly requested.
5. Keep product UI timelines under 1200ms.
6. Always preserve accessibility metadata.
7. Always run `msvg validate` after editing.
```

---

## 27. AI-Agent Workflow

Recommended workflow:

```txt
1. Read animation.config.json
2. Read AGENTS.md
3. Read motion/targets.json
4. Read motion/timelines.json
5. Read motion/states.json
6. Make minimal edits
7. Run msvg validate
8. Fix validation errors
9. Run msvg inspect
10. Return summary of changes
```

### 27.1 AI Editing Principles

AI agents should:

* Prefer JSON edits over TypeScript edits.
* Use existing target names.
* Add new targets only when necessary.
* Avoid editing SVG path data unless explicitly requested.
* Preserve package structure.
* Preserve schema version.
* Keep motion subtle and understandable.
* Avoid random new abstractions.
* Avoid overengineering.

---

## 28. Human Developer Workflow

### 28.1 Install

```bash
npm install msvg-core
```

For React:

```bash
npm install msvg-core msvg-react
```

### 28.2 Import Animation

```ts
import { inventoryAgent } from "./animations/inventory-agent";
```

### 28.3 Mount Animation

```ts
import { createMsvg } from "msvg-core";

const controller = createMsvg({
  root: document.querySelector("[data-animation='inventory-agent']")!,
  animation: inventoryAgent
});
```

### 28.4 Play Timeline

```ts
controller.play("intro");
```

### 28.5 Send Event

```ts
controller.send("LOAD");
controller.send("RESOLVE");
```

### 28.6 Destroy

```ts
controller.destroy();
```

---

## 29. React Adapter Specification

Package:

```txt
msvg-react
```

### 29.1 Component API

```tsx
import { Msvg } from "msvg-react";
import { inventoryAgent } from "./animations/inventory-agent";

export function InventoryCard() {
  return (
    <Msvg
      animation={inventoryAgent}
      initialState="idle"
      onReady={(controller) => {
        controller.play("intro");
      }}
    />
  );
}
```

The component mounts `animation.svgMarkup` (Section 14) into the element it renders.

### 29.2 Controlled State

```tsx
<Msvg
  animation={inventoryAgent}
  state={status}
  onStateChange={setStatus}
/>
```

Where:

```ts
type Status = "idle" | "loading" | "success" | "error";
```

`state` drives the machine through `controller.setState()`; `onStateChange` reports transitions back to the application (wired to `controller.onStateChange()` internally).

### 29.3 Event-Based Usage

```tsx
<Msvg
  animation={inventoryAgent}
  initialState="idle"
  events={{ pointerenter: "HOVER", pointerleave: "LEAVE" }}
/>
```

`events` maps DOM event names on the root element to state-machine events. Native React props such as `onMouseEnter` keep their standard DOM signature and are passed through unchanged — they are never overloaded with controller arguments.

### 29.4 Hook API

```tsx
const { ref, controller } = useMsvg({
  animation: inventoryAgent,
  initialState: "idle"
});

return <div ref={ref} />;
```

`controller` is `null` until the element has mounted.

---

## 30. Validation Rules

Validation is a core product feature.

The validator should catch:

### 30.1 Package Errors

* Missing manifest.
* Invalid schema version.
* Missing SVG file.
* Missing targets file.
* Missing timelines file.
* Invalid JSON.

### 30.2 Target Errors

* Target referenced in timeline does not exist in `targets.json`.
* Target selector does not match anything in SVG.
* Target with `expect: "one"` matches zero nodes or more than one node (Section 9.3).
* Target name does not follow naming convention.

### 30.3 Timeline Errors

* Timeline is not an array.
* Clip has unknown target.
* Clip has invalid `at`.
* Clip has invalid keyframes.
* Clip has invalid duration.
* Clip has unknown easing token.
* Clip uses unsupported property.
* Clip uses `iterations: Infinity` — infinite repetition is expressed through state-level `loop` (Section 16.1).
* Non-looping timeline exceeds the 1200ms warning threshold (Section 10.4). Warning only.
* Timeline and `idle.css` animate the same property on the same target, when detectable. Warning only.

### 30.4 State Machine Errors

* Initial state does not exist.
* Transition points to missing state.
* `onEnter.timeline` references missing timeline.
* Unreachable states.
* Dead-end states without `"final": true` (Section 11.2).
* Event names that do not follow `UPPER_SNAKE_CASE`.

### 30.5 Accessibility Warnings

* Missing title.
* Missing description for non-decorative animation.
* Missing reduced-motion config.
* Long looping animation without reduced-motion fallback.

---

## 31. TypeScript Types

Package:

```txt
msvg-schema
```

Example core types:

```ts
export type MsvgAnimationPackage = {
  config: MsvgAnimationConfig;
  targets: MsvgTargets;
  timelines: MsvgTimelines;
  states?: MsvgStateMachine;
  svgMarkup?: string;
  presets?: Record<string, MsvgPreset>;
};

export type MsvgAnimationConfig = {
  schemaVersion: string;
  id: string;
  name: string;
  version?: string;
  description?: string;
  asset: {
    svg: string;
    preview?: string;
  };
  motion: {
    targets: string;
    timelines: string;
    states?: string;
    idleCss?: string;
  };
  accessibility?: {
    title?: string;
    description?: string;
    decorative?: boolean;
  };
  reducedMotion?: {
    strategy: "static" | "fade" | "shorten" | "none";
    fallbackState?: string;
  };
};

export type MsvgTarget =
  | string
  | {
      selector: string;
      expect?: "one" | "many";
    };

export type MsvgTargets = Record<string, MsvgTarget>;

export type MsvgTimelines = Record<string, MsvgClip[]>;

export type MsvgClip = {
  target: string;
  at: number;
  keyframes: Keyframe[];
  options: {
    duration: number;
    easing?: string;
    delay?: number;
    fill?: FillMode;
    iterations?: number; // finite only; see Section 16.1
    direction?: PlaybackDirection;
  };
};

export type MsvgStateMachine = {
  initial: string;
  states: Record<string, MsvgState>;
};

export type MsvgState = {
  onEnter?: MsvgStateAction;
  /** Reserved for a future version. Ignored by the v1 runtime. */
  onExit?: MsvgStateAction;
  on?: Record<string, string>;
  /** Marks an intentional dead-end state (Section 11.2). */
  final?: boolean;
};

export type MsvgStateAction = {
  timeline?: string;
  loop?: boolean;
};

export type MsvgPresetContext = {
  root: Element;
  getTarget: (name: string) => Element | null;
  getTargets: (name: string) => Element[];
};

export type MsvgPreset = (context: MsvgPresetContext) => Animation | null;
```

---

## 32. Naming Conventions

### 32.1 Package Names

Use kebab-case:

```txt
inventory-agent
success-checkmark
loading-orb
```

### 32.2 Target Names

Use camelCase:

```json
{
  "leftArm": "[data-part='arm-left']",
  "rightEye": "[data-part='right-eye']"
}
```

### 32.3 SVG Parts

Use kebab-case:

```svg
<g data-part="left-arm">...</g>
<g data-part="right-eye">...</g>
```

### 32.4 Timeline Names

Use camelCase:

```txt
intro
success
errorShake
loadingLoop
```

### 32.5 State Names

Use camelCase; prefer single lowercase words:

```txt
idle
hovered
loading
success
error
disabled
```

### 32.6 Event Names

Use uppercase snake case:

```txt
HOVER
LEAVE
LOAD
RESOLVE
REJECT
RESET
FORM_SUBMITTED
```

---

## 33. Recommended Animation Design Rules

### 33.1 Prefer These Properties

```txt
transform
opacity
```

### 33.2 Use Carefully

```txt
filter
clip-path
stroke-dashoffset
stroke-dasharray
```

### 33.3 Avoid in v1

```txt
path morphing
layout-affecting properties
large filter animations
complex nested SVG transforms
```

### 33.4 Performance Rules

Animations should:

* Prefer compositor-friendly properties.
* Use `transform-box: fill-box` for SVG transforms.
* Use `transform-origin: center` when needed.
* Avoid animating too many nodes at once.
* Avoid long-running expensive filters.
* Respect reduced-motion preferences.

---

## 34. Example Complete Animation Package

```txt
inventory-agent/
  animation.config.json
  index.ts
  README.md
  AGENTS.md

  assets/
    main.svg
    preview.png

  motion/
    targets.json
    timelines.json
    states.json
    idle.css
```

### 34.1 `animation.config.json`

```json
{
  "schemaVersion": "1.0",
  "id": "inventory-agent",
  "name": "Inventory Agent",
  "version": "0.1.0",
  "description": "Animated SVG assistant for inventory monitoring states.",

  "asset": {
    "svg": "./assets/main.svg",
    "preview": "./assets/preview.png"
  },

  "motion": {
    "targets": "./motion/targets.json",
    "timelines": "./motion/timelines.json",
    "states": "./motion/states.json",
    "idleCss": "./motion/idle.css"
  },

  "accessibility": {
    "title": "Inventory Agent",
    "description": "Animated assistant representing inventory monitoring.",
    "decorative": false
  },

  "reducedMotion": {
    "strategy": "static",
    "fallbackState": "idle"
  }
}
```

### 34.2 `motion/targets.json`

```json
{
  "root": "[data-animation='inventory-agent']",
  "body": "[data-part='body']",
  "eyes": "[data-part='eyes']",
  "leftArm": "[data-part='arm-left']",
  "sparkles": "[data-part='sparkles']",
  "loader": "[data-part='loader']"
}
```

### 34.3 `motion/timelines.json`

```json
{
  "intro": [
    {
      "target": "body",
      "at": 0,
      "keyframes": [
        {
          "opacity": 0,
          "transform": "translateY(12px) scale(0.96)"
        },
        {
          "opacity": 1,
          "transform": "translateY(0) scale(1)"
        }
      ],
      "options": {
        "duration": 500,
        "easing": "standard",
        "fill": "both"
      }
    },
    {
      "target": "sparkles",
      "at": 300,
      "keyframes": [
        {
          "opacity": 0,
          "transform": "scale(0.6)"
        },
        {
          "opacity": 1,
          "transform": "scale(1)"
        }
      ],
      "options": {
        "duration": 350,
        "easing": "soft",
        "fill": "both"
      }
    }
  ],

  "hover": [
    {
      "target": "body",
      "at": 0,
      "keyframes": [
        { "transform": "scale(1)" },
        { "transform": "scale(1.03)" }
      ],
      "options": {
        "duration": 200,
        "easing": "soft",
        "fill": "both"
      }
    }
  ],

  "loadingLoop": [
    {
      "target": "loader",
      "at": 0,
      "keyframes": [
        { "transform": "rotate(0deg)" },
        { "transform": "rotate(360deg)" }
      ],
      "options": {
        "duration": 1200,
        "easing": "linear",
        "fill": "both"
      }
    }
  ],

  "success": [
    {
      "target": "sparkles",
      "at": 0,
      "keyframes": [
        {
          "opacity": 0,
          "transform": "scale(0.4)"
        },
        {
          "opacity": 1,
          "transform": "scale(1.1)"
        },
        {
          "opacity": 1,
          "transform": "scale(1)"
        }
      ],
      "options": {
        "duration": 500,
        "easing": "soft",
        "fill": "both"
      }
    }
  ],

  "error": [
    {
      "target": "body",
      "at": 0,
      "keyframes": [
        { "transform": "translateX(0)" },
        { "transform": "translateX(-6px)" },
        { "transform": "translateX(6px)" },
        { "transform": "translateX(0)" }
      ],
      "options": {
        "duration": 400,
        "easing": "standard",
        "fill": "both"
      }
    }
  ]
}
```

### 34.4 `motion/states.json`

```json
{
  "initial": "idle",

  "states": {
    "idle": {
      "on": {
        "HOVER": "hovered",
        "LOAD": "loading"
      }
    },

    "hovered": {
      "onEnter": {
        "timeline": "hover"
      },
      "on": {
        "LEAVE": "idle",
        "LOAD": "loading"
      }
    },

    "loading": {
      "onEnter": {
        "timeline": "loadingLoop",
        "loop": true
      },
      "on": {
        "RESOLVE": "success",
        "REJECT": "error"
      }
    },

    "success": {
      "onEnter": {
        "timeline": "success"
      },
      "on": {
        "RESET": "idle"
      }
    },

    "error": {
      "onEnter": {
        "timeline": "error"
      },
      "on": {
        "RESET": "idle"
      }
    }
  }
}
```

---

## 35. Build and Distribution

Recommended build setup:

```txt
TypeScript
ESM-first
CJS optional
Tree-shakeable modules
Zero required animation dependencies
```

Package output:

```txt
dist/
  index.js
  index.d.ts
```

Recommended package exports:

```json
{
  "name": "msvg-core",
  "type": "module",
  "exports": {
    ".": {
      "types": "./dist/index.d.ts",
      "import": "./dist/index.js"
    }
  }
}
```

---

## 36. Versioning

msvg should version two things separately:

### 36.1 Library Version

Example:

```txt
msvg-core@0.1.0
```

### 36.2 Animation Schema Version

Example:

```json
"schemaVersion": "1.0"
```

The runtime should support known schema versions and fail clearly for unsupported versions.

---

## 37. Roadmap

### v0.1

Core package format.

Includes:

* `animation.config.json`
* `targets.json`
* `timelines.json`
* Basic timeline playback
* Basic validation
* Vanilla JS runtime

### v0.2

State machine support.

Includes:

* `states.json`
* `controller.send()`
* `controller.setState()`
* State validation

### v0.3

CLI.

Includes:

* `msvg create`
* `msvg validate`
* `msvg inspect`
* `msvg check-targets`

### v0.4

React adapter.

Includes:

* `<Msvg />`
* `useMsvg()`
* Controlled state support

### v0.5

Agent workflow support.

Includes:

* `AGENTS.md` template
* `msvg summarize`
* Better validation messages
* Suggested fixes

### v1.0

Stable production release.

Includes:

* Stable schema
* Stable runtime API
* Stable CLI
* Reduced-motion support
* Documentation
* Example gallery

---

## 38. Success Criteria

msvg is successful if:

* An AI agent can safely modify an animation without breaking selectors.
* A human developer can import and use an animation in less than five minutes.
* Validation catches most mistakes before runtime.
* Animation packages are readable in Git diffs.
* No external animation editor is required.
* No required third-party animation runtime is needed.
* The system works with plain SVG, CSS, and Web Animations API.
* Motion remains maintainable after months of project changes.

---

## 39. Final Recommended Design

The strongest foundation for msvg is:

```txt
animation.config.json
motion/targets.json
motion/timelines.json
motion/states.json
assets/main.svg
```

The most important feature is not the runtime.

The most important feature is validation.

For AI agents, the ideal loop is:

```txt
read package
edit structured JSON
run msvg validate
fix errors
run msvg inspect
return summary
```

For humans, the ideal loop is:

```txt
import animation
mount controller
play timeline
send events
ship UI
```

msvg should become a small, native, schema-first animation system for SVG motion that is comfortable for developers and predictable for AI agents.

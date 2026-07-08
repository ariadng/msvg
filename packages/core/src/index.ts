/**
 * msvg — the MotionSVG runtime.
 *
 * Mounts or attaches an animation package, plays timelines, runs state
 * machines, handles reduced motion, and applies accessibility metadata. Built
 * on native SVG, CSS, and the Web Animations API with zero runtime dependencies
 * beyond `msvg-schema`. Import is SSR-safe: no DOM access happens at load time.
 */

export { createMsvg } from "./controller.js";
export type { CreateMsvgOptions, MsvgController } from "./controller.js";

export {
  playTimeline,
  playTimelineLoop,
  settle,
  selectorFor,
} from "./timeline.js";
export type { TimelinePlayback, PlayTimelineOptions } from "./timeline.js";

export { createStateMachine } from "./state-machine.js";
export type {
  StateMachine,
  StateMachineActions,
  StateMachineOptions,
} from "./state-machine.js";

export { resolveEasing } from "./easing.js";
export { easings, durations } from "./tokens.js";
export type { EasingTokens } from "./tokens.js";

export { applyAccessibility } from "./a11y.js";

export {
  prefersReducedMotion,
  transformTimelineForReducedMotion,
  reducedMotionDisablesLoop,
} from "./reduced-motion.js";
export type { ReducedMotionStrategy } from "./reduced-motion.js";

// Re-export the shared package types so consumers (and preset authors,
// Section 13) can import them from `msvg`.
export type {
  MsvgAnimationPackage,
  MsvgAnimationConfig,
  MsvgTarget,
  MsvgTargets,
  MsvgTimelines,
  MsvgClip,
  MsvgStateMachine,
  MsvgState,
  MsvgStateAction,
  MsvgPreset,
  MsvgPresetContext,
} from "msvg-schema";

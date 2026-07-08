/**
 * Reduced-motion detection and strategies (Spec Section 19).
 *
 * Detection reads `prefers-reduced-motion`. When reduced motion applies and the
 * strategy is not `"none"`, the runtime sets `data-msvg-reduced` on the root
 * (handled by the controller) and transforms each timeline's clips before
 * playback according to the strategy.
 */

import type { MsvgClip } from "msvg-schema";

/** Reduced-motion strategies from the manifest (Section 7.1 / 19.1). */
export type ReducedMotionStrategy = "static" | "fade" | "shorten" | "none";

/**
 * True when the environment prefers reduced motion. SSR-safe: returns `false`
 * when `window`/`matchMedia` are unavailable or throw.
 */
export function prefersReducedMotion(): boolean {
  if (typeof window === "undefined") return false;
  const matchMedia = window.matchMedia;
  if (typeof matchMedia !== "function") return false;
  try {
    return matchMedia.call(window, "(prefers-reduced-motion: reduce)").matches === true;
  } catch {
    return false;
  }
}

/** Keyframe keys that represent motion and are stripped by the `fade` strategy. */
const TRANSFORM_KEYS = new Set(["transform", "translate", "rotate", "scale"]);
/** Reserved keyframe keys that are not animatable properties. */
const KEYFRAME_CONTROL_KEYS = new Set(["offset", "easing", "composite"]);

const FADE_MAX_DURATION = 200;
const SHORTEN_MAX_DURATION = 120;

/**
 * Transform a timeline's clips for the given reduced-motion strategy
 * (Section 19.1):
 *
 * - `static` → no clips run (returns `[]`),
 * - `fade` → strip transform keys, clamp duration to ≤ 200ms, drop clips left
 *   with no animatable properties,
 * - `shorten` → clamp durations to ≤ 120ms and scale `at` offsets by a
 *   per-timeline compression factor,
 * - `none` → return the clips unchanged.
 */
export function transformTimelineForReducedMotion(
  clips: MsvgClip[],
  strategy: ReducedMotionStrategy,
): MsvgClip[] {
  switch (strategy) {
    case "static":
      return [];
    case "fade":
      return fadeClips(clips);
    case "shorten":
      return shortenClips(clips);
    case "none":
    default:
      return clips;
  }
}

/** `shorten` and `static` disable looping (Section 19.1). */
export function reducedMotionDisablesLoop(strategy: ReducedMotionStrategy): boolean {
  return strategy === "shorten" || strategy === "static";
}

function keyframeHasAnimatableProperty(keyframe: Keyframe): boolean {
  return Object.keys(keyframe).some((key) => !KEYFRAME_CONTROL_KEYS.has(key));
}

function stripTransform(keyframe: Keyframe): Keyframe {
  const out: Keyframe = {};
  for (const key of Object.keys(keyframe)) {
    if (TRANSFORM_KEYS.has(key)) continue;
    (out as Record<string, unknown>)[key] = (keyframe as Record<string, unknown>)[key];
  }
  return out;
}

function fadeClips(clips: MsvgClip[]): MsvgClip[] {
  const faded: MsvgClip[] = [];
  for (const clip of clips) {
    const keyframes = clip.keyframes.map(stripTransform);
    if (!keyframes.some(keyframeHasAnimatableProperty)) {
      // No animatable properties left after removing motion — skip the clip.
      continue;
    }
    faded.push({
      ...clip,
      keyframes,
      options: {
        ...clip.options,
        duration: Math.min(clip.options.duration, FADE_MAX_DURATION),
      },
    });
  }
  return faded;
}

function shortenClips(clips: MsvgClip[]): MsvgClip[] {
  const maxDuration = clips.reduce(
    (max, clip) => Math.max(max, clip.options.duration),
    0,
  );
  // A single per-timeline compression factor keeps `at` offsets proportional to
  // the clamped durations.
  const factor =
    maxDuration > SHORTEN_MAX_DURATION ? SHORTEN_MAX_DURATION / maxDuration : 1;

  return clips.map((clip) => ({
    ...clip,
    at: clip.at * factor,
    options: {
      ...clip.options,
      duration: Math.min(clip.options.duration, SHORTEN_MAX_DURATION),
    },
  }));
}

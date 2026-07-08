/**
 * Timeline runtime (Spec Section 16).
 *
 * `playTimeline` resolves each clip's target through the target map, prepares
 * SVG transforms, converts easing tokens, starts every clip via the Web
 * Animations API, and returns playback controls. It commits and cancels
 * animations on completion or interruption so that at most one live animation
 * exists per target and no fill state accumulates.
 */

import type { MsvgClip, MsvgTarget, MsvgTargets } from "msvg-schema";
import { easings } from "msvg-schema";
import { resolveEasing } from "./easing.js";
import type { EasingTokens } from "./tokens.js";

/** Playback controls returned by {@link playTimeline}. */
export type TimelinePlayback = {
  /** The live animations created for this timeline (empty when all skipped). */
  animations: Animation[];
  /** Pause every animation. */
  pause: () => void;
  /** Resume every animation. */
  resume: () => void;
  /** Commit final styles then cancel every animation (Section 16). */
  stop: () => void;
  /**
   * Resolves when every clip has finished (or the timeline was stopped). Never
   * rejects — interruption is not an error.
   */
  finished: Promise<void>;
};

/** Options accepted by {@link playTimeline} / {@link playTimelineLoop}. */
export type PlayTimelineOptions = {
  /** Throw on missing targets instead of warning and skipping (Section 16). */
  strict?: boolean;
};

/** Resolve a target-map value (Section 9.3) to a CSS selector string. */
export function selectorFor(target: MsvgTarget | undefined): string | undefined {
  if (target == null) return undefined;
  if (typeof target === "string") return target;
  return target.selector;
}

/**
 * Settle an animation without leaving fill state or snapping: commit the
 * current computed styles to inline style, then cancel (Section 16).
 */
export function settle(animation: Animation): void {
  try {
    animation.commitStyles();
  } catch {
    // Detached element (or already-cancelled animation) — nothing to commit.
  }
  animation.cancel();
}

/**
 * Set `transform-box: fill-box` and `transform-origin: center` before
 * animating, unless the element already declares either of them via inline
 * style or (when available) computed style (Section 16). Without this, SVG
 * transforms resolve against the view-box origin and scale/rotate animations
 * visibly shift position.
 */
function prepareTransform(element: Element): void {
  if (declaresTransform(element)) return;
  const style = (element as Partial<ElementCSSInlineStyle>).style;
  if (!style) return;
  style.setProperty("transform-box", "fill-box");
  style.setProperty("transform-origin", "center");
}

/** The used values a browser reports for the *initial* transform-box. */
const TRANSFORM_BOX_INITIALS = new Set(["", "view-box", "border-box", "content-box"]);

function declaresTransform(element: Element): boolean {
  const style = (element as Partial<ElementCSSInlineStyle>).style;
  if (style) {
    if (nonEmpty(style.getPropertyValue("transform-box"))) return true;
    if (nonEmpty(style.getPropertyValue("transform-origin"))) return true;
  }

  const view = element.ownerDocument?.defaultView;
  if (view && typeof view.getComputedStyle === "function") {
    try {
      const computed = view.getComputedStyle(element);
      const box = computed.getPropertyValue("transform-box").trim();
      // Only a non-initial computed transform-box counts as "declared"; the
      // initial value is what the browser reports when nothing set it.
      if (box !== "" && !TRANSFORM_BOX_INITIALS.has(box)) return true;
    } catch {
      // getComputedStyle can throw on detached elements — treat as not declared.
    }
  }
  return false;
}

function nonEmpty(value: string | null | undefined): boolean {
  return typeof value === "string" && value.trim() !== "";
}

/** Resolve easing tokens inside per-keyframe `easing` fields. */
function resolveKeyframeEasings(
  keyframes: Keyframe[],
  tokens: EasingTokens,
): Keyframe[] {
  let changed = false;
  const out = keyframes.map((kf) => {
    if (kf && typeof kf.easing === "string") {
      changed = true;
      return { ...kf, easing: resolveEasing(kf.easing, tokens) };
    }
    return kf;
  });
  return changed ? out : keyframes;
}

function skip(message: string, strict: boolean): Animation[] {
  if (strict) throw new Error(`[msvg] ${message}`);
  console.warn(`[msvg] ${message} — clip skipped`);
  return [];
}

/**
 * Play a named timeline once (Section 16). Each clip starts at its `at` offset,
 * eases are resolved to CSS, and missing targets warn-and-skip (or throw in
 * strict mode).
 */
export function playTimeline(
  root: Element,
  timeline: MsvgClip[],
  targets: MsvgTargets,
  tokens: EasingTokens = easings,
  options: PlayTimelineOptions = {},
): TimelinePlayback {
  const { strict = false } = options;

  const animations = timeline.flatMap((clip) => {
    const selector = selectorFor(targets[clip.target]);
    if (!selector) {
      return skip(`Unknown target: ${clip.target}`, strict);
    }

    const elements = Array.from(root.querySelectorAll(selector));
    if (elements.length === 0) {
      return skip(`Target not found in SVG: ${clip.target}`, strict);
    }

    const keyframes = resolveKeyframeEasings(clip.keyframes, tokens);
    const animationOptions: KeyframeAnimationOptions = {
      ...clip.options,
      delay: (clip.options.delay ?? 0) + clip.at,
      easing: resolveEasing(clip.options.easing, tokens),
      fill: clip.options.fill ?? "both",
    };

    return elements.map((element) => {
      prepareTransform(element);
      return element.animate(keyframes, animationOptions);
    });
  });

  // `Animation.finished` rejects on cancel(); interruption must not surface as
  // an error, so each rejection is swallowed and the aggregate never rejects.
  const finished = Promise.all(
    animations.map((animation) => animation.finished.catch(() => undefined)),
  ).then(() => undefined);

  // Natural completion auto-settles so no fill state accumulates.
  void finished.then(() => animations.forEach(settle));

  return {
    animations,
    pause: () => animations.forEach((animation) => animation.pause()),
    resume: () => animations.forEach((animation) => animation.play()),
    stop: () => animations.forEach(settle),
    finished,
  };
}

/**
 * Play a timeline in a loop (Section 16.1). When the longest clip of a cycle
 * completes, all clips are settled and restarted together; individual clips
 * never loop independently. The returned `finished` promise resolves after the
 * first full cycle. Looping stops when {@link TimelinePlayback.stop} is called.
 */
export function playTimelineLoop(
  root: Element,
  timeline: MsvgClip[],
  targets: MsvgTargets,
  tokens: EasingTokens = easings,
  options: PlayTimelineOptions = {},
): TimelinePlayback {
  let stopped = false;
  let firstCycleDone = false;
  let resolveFirstCycle!: () => void;
  const firstCycle = new Promise<void>((resolve) => {
    resolveFirstCycle = resolve;
  });

  let current = playTimeline(root, timeline, targets, tokens, options);

  const markFirstCycle = () => {
    if (!firstCycleDone) {
      firstCycleDone = true;
      resolveFirstCycle();
    }
  };

  const scheduleNext = () => {
    void current.finished.then(() => {
      markFirstCycle();
      if (stopped) return;
      // Nothing was animatable (every clip skipped) — do not spin restarting.
      if (current.animations.length === 0) return;
      current = playTimeline(root, timeline, targets, tokens, options);
      scheduleNext();
    });
  };
  scheduleNext();

  return {
    get animations() {
      return current.animations;
    },
    pause: () => current.pause(),
    resume: () => current.resume(),
    stop: () => {
      stopped = true;
      current.stop();
      markFirstCycle();
    },
    finished: firstCycle,
  };
}

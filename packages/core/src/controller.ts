/**
 * `createMsvg` and the controller API (Spec Section 15).
 *
 * The controller mounts or attaches an animation package, applies accessibility
 * metadata, wires up the state machine, and exposes playback controls. It holds
 * no framework assumptions and performs no DOM access at import time.
 */

import type {
  MsvgAnimationPackage,
  MsvgClip,
  MsvgPresetContext,
} from "msvg-schema";
import { easings } from "./tokens.js";
import {
  playTimeline,
  playTimelineLoop,
  selectorFor,
  settle,
  type TimelinePlayback,
} from "./timeline.js";
import { applyAccessibility } from "./a11y.js";
import {
  createStateMachine,
  type StateMachine,
  type StateMachineActions,
} from "./state-machine.js";
import {
  prefersReducedMotion,
  reducedMotionDisablesLoop,
  transformTimelineForReducedMotion,
  type ReducedMotionStrategy,
} from "./reduced-motion.js";

const ATTR_PLAYING = "data-msvg-playing";
const ATTR_REDUCED = "data-msvg-reduced";

/** Options for {@link createMsvg} (Section 15.2). */
export type CreateMsvgOptions = {
  /** Attach to an element that already contains the SVG markup. */
  root?: Element;
  /** Mount `animation.svgMarkup` into this element. */
  container?: Element;
  animation: MsvgAnimationPackage;
  /** Enter the initial state on creation. Default `true`. */
  autoplay?: boolean;
  /** Override `states.initial`. Takes precedence over the manifest. */
  initialState?: string;
  /** Respect `prefers-reduced-motion`. Default `true`. */
  respectReducedMotion?: boolean;
  /** Throw (instead of warn+skip) on missing targets/timelines. Default `false`. */
  strict?: boolean;
};

/** The controller returned by {@link createMsvg} (Section 15.3). */
export type MsvgController = {
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

/** Create an msvg controller for an animation package (Section 15.1). */
export function createMsvg(options: CreateMsvgOptions): MsvgController {
  const {
    animation,
    autoplay = true,
    respectReducedMotion = true,
    strict = false,
  } = options;

  const hasRoot = options.root != null;
  const hasContainer = options.container != null;
  if (hasRoot === hasContainer) {
    throw new TypeError(
      "[msvg] createMsvg requires exactly one of `root` or `container`.",
    );
  }

  // Resolve the root element (mounting markup in container mode).
  let root: Element;
  let mountedContainer: Element | null = null;
  if (hasContainer) {
    const container = options.container as Element;
    if (animation.svgMarkup == null) {
      throw new Error(
        "[msvg] container mode requires `animation.svgMarkup` to be present.",
      );
    }
    container.innerHTML = animation.svgMarkup;
    root =
      container.querySelector("svg") ??
      container.querySelector("[data-animation]") ??
      container.firstElementChild ??
      container;
    mountedContainer = container;
  } else {
    root = options.root as Element;
  }

  // Reduced motion (Section 19).
  const strategy: ReducedMotionStrategy =
    animation.config.reducedMotion?.strategy ?? "none";
  const reducedActive =
    respectReducedMotion && strategy !== "none" && prefersReducedMotion();
  if (reducedActive) {
    root.setAttribute(ATTR_REDUCED, "true");
  }

  // Accessibility (Section 7.1).
  applyAccessibility(root, animation.config);

  const tokens = easings;

  // --- Active-playback tracking (drives data-msvg-playing) -------------------
  const activePlaybacks = new Set<TimelinePlayback>();

  const updatePlayingAttr = () => {
    if (activePlaybacks.size > 0) {
      root.setAttribute(ATTR_PLAYING, "true");
    } else {
      root.removeAttribute(ATTR_PLAYING);
    }
  };

  type BuiltPlayback = {
    playback: TimelinePlayback;
    isLoop: boolean;
    tracked: boolean;
  };

  const resolvedPlayback = (): TimelinePlayback => ({
    animations: [],
    pause: () => {},
    resume: () => {},
    stop: () => {},
    finished: Promise.resolve(),
  });

  const buildPlayback = (timelineName: string, loop: boolean): BuiltPlayback => {
    const clips = animation.timelines[timelineName];
    if (!clips) {
      console.warn(`[msvg] Unknown timeline: ${timelineName} — skipped`);
      return { playback: resolvedPlayback(), isLoop: false, tracked: false };
    }

    let effectiveClips: MsvgClip[] = clips;
    let effectiveLoop = loop;

    if (reducedActive) {
      if (strategy === "static") {
        // No timelines run; state transitions still occur (Section 19.1).
        return { playback: resolvedPlayback(), isLoop: false, tracked: false };
      }
      effectiveClips = transformTimelineForReducedMotion(clips, strategy);
      if (reducedMotionDisablesLoop(strategy)) effectiveLoop = false;
    }

    const playback = effectiveLoop
      ? playTimelineLoop(root, effectiveClips, animation.targets, tokens, { strict })
      : playTimeline(root, effectiveClips, animation.targets, tokens, { strict });
    return { playback, isLoop: effectiveLoop, tracked: true };
  };

  const startRun = (timelineName: string, loop: boolean): TimelinePlayback => {
    const { playback, isLoop, tracked } = buildPlayback(timelineName, loop);
    if (!tracked) return playback;

    let removed = false;
    const remove = () => {
      if (removed) return;
      removed = true;
      if (activePlaybacks.delete(instrumented)) updatePlayingAttr();
    };

    const instrumented: TimelinePlayback = {
      get animations() {
        return playback.animations;
      },
      pause: () => playback.pause(),
      resume: () => playback.resume(),
      stop: () => {
        playback.stop();
        remove();
      },
      finished: playback.finished,
    };

    activePlaybacks.add(instrumented);
    updatePlayingAttr();
    // A looping run stays active until stopped; a one-shot run clears on finish.
    if (!isLoop) void playback.finished.then(remove);

    return instrumented;
  };

  // --- Preset animations -----------------------------------------------------
  const presetAnimations = new Set<Animation>();

  // --- State machine (Section 17) --------------------------------------------
  const stateListeners = new Set<(state: string) => void>();
  const notify = (state: string) => {
    for (const listener of stateListeners) listener(state);
  };

  let currentStatePlayback: TimelinePlayback | null = null;
  const stateActions: StateMachineActions = {
    playTimeline: (timelineName, opts) => {
      currentStatePlayback = startRun(timelineName, opts.loop ?? false);
    },
    stopCurrent: () => {
      currentStatePlayback?.stop();
      currentStatePlayback = null;
    },
  };

  let machine: StateMachine | null = null;
  if (animation.states) {
    const initialState =
      options.initialState ??
      (reducedActive ? animation.config.reducedMotion?.fallbackState : undefined) ??
      animation.states.initial;

    machine = createStateMachine(animation.states, stateActions, {
      initial: initialState,
      autoEnter: autoplay,
      onChange: notify,
    });
  }

  // --- Controller surface ----------------------------------------------------
  const play = (timelineName: string): Promise<void> => {
    if (!animation.timelines[timelineName]) {
      if (strict) {
        throw new Error(`[msvg] Unknown timeline: ${timelineName}`);
      }
      console.warn(`[msvg] Unknown timeline: ${timelineName} — play ignored`);
      return Promise.resolve();
    }
    return startRun(timelineName, false).finished;
  };

  const pause = (): void => {
    for (const playback of activePlaybacks) playback.pause();
    for (const animation of presetAnimations) animation.pause();
  };

  const resume = (): void => {
    for (const playback of activePlaybacks) playback.resume();
    for (const animation of presetAnimations) animation.play();
  };

  const stop = (): void => {
    for (const playback of [...activePlaybacks]) playback.stop();
    for (const animation of presetAnimations) settle(animation);
    presetAnimations.clear();
    currentStatePlayback = null;
  };

  const send = (eventName: string): void => {
    if (!machine) {
      console.warn(
        `[msvg] send("${eventName}") ignored — package has no state machine.`,
      );
      return;
    }
    machine.send(eventName);
  };

  const setState = (stateName: string): void => {
    if (!machine) {
      throw new Error(
        `[msvg] Unknown state: ${stateName} — package has no state machine.`,
      );
    }
    machine.setState(stateName);
  };

  const getState = (): string | null => (machine ? machine.getState() : null);

  const onStateChange = (callback: (state: string) => void): (() => void) => {
    stateListeners.add(callback);
    return () => {
      stateListeners.delete(callback);
    };
  };

  const getTarget = (name: string): Element | null => {
    const selector = selectorFor(animation.targets[name]);
    if (!selector) return null;
    return root.querySelector(selector);
  };

  const getTargets = (name: string): Element[] => {
    const selector = selectorFor(animation.targets[name]);
    if (!selector) return [];
    return Array.from(root.querySelectorAll(selector));
  };

  const runPreset = (presetName: string): Animation | null => {
    const preset = animation.presets?.[presetName];
    if (!preset) {
      console.warn(`[msvg] Unknown preset: ${presetName}`);
      return null;
    }
    const context: MsvgPresetContext = { root, getTarget, getTargets };
    const result = preset(context);
    if (result) presetAnimations.add(result);
    return result;
  };

  const getTimelines = (): string[] => Object.keys(animation.timelines);
  const getStates = (): string[] =>
    animation.states ? Object.keys(animation.states.states) : [];
  const getTargetNames = (): string[] => Object.keys(animation.targets);

  const destroy = (): void => {
    for (const playback of [...activePlaybacks]) playback.stop();
    activePlaybacks.clear();
    for (const animation of presetAnimations) settle(animation);
    presetAnimations.clear();
    currentStatePlayback = null;
    stateListeners.clear();

    root.removeAttribute(ATTR_PLAYING);
    root.removeAttribute(ATTR_REDUCED);

    if (mountedContainer) mountedContainer.innerHTML = "";
  };

  return {
    play,
    pause,
    resume,
    stop,
    send,
    setState,
    getState,
    onStateChange,
    runPreset,
    getTimelines,
    getStates,
    getTargets: getTargetNames,
    destroy,
  };
}

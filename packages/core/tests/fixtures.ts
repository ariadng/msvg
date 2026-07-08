/**
 * Test fixtures: a small but complete animation package modeled on the Spec
 * Section 34 example, plus DOM mounting helpers.
 */
import type {
  MsvgAnimationConfig,
  MsvgAnimationPackage,
  MsvgStateMachine,
  MsvgTargets,
  MsvgTimelines,
} from "msvg-schema";

export const SVG_MARKUP = `<svg data-animation="test-agent" viewBox="0 0 100 100">
  <g data-part="body"></g>
  <g data-part="eyes"></g>
  <g data-part="sparkles"></g>
  <g data-part="loader"></g>
</svg>`;

export const targets: MsvgTargets = {
  root: "[data-animation='test-agent']",
  body: "[data-part='body']",
  eyes: "[data-part='eyes']",
  sparkles: "[data-part='sparkles']",
  loader: "[data-part='loader']",
  missing: "[data-part='does-not-exist']",
};

export const timelines: MsvgTimelines = {
  intro: [
    {
      target: "body",
      at: 0,
      keyframes: [
        { opacity: 0, transform: "translateY(12px) scale(0.96)" },
        { opacity: 1, transform: "translateY(0) scale(1)" },
      ],
      options: { duration: 500, easing: "standard", fill: "both" },
    },
    {
      target: "sparkles",
      at: 300,
      keyframes: [
        { opacity: 0, transform: "scale(0.6)" },
        { opacity: 1, transform: "scale(1)" },
      ],
      options: { duration: 350, easing: "soft", fill: "both" },
    },
  ],
  hover: [
    {
      target: "body",
      at: 0,
      keyframes: [{ transform: "scale(1)" }, { transform: "scale(1.03)" }],
      options: { duration: 200, easing: "soft", fill: "both" },
    },
  ],
  loadingLoop: [
    {
      target: "loader",
      at: 0,
      keyframes: [{ transform: "rotate(0deg)" }, { transform: "rotate(360deg)" }],
      options: { duration: 1200, easing: "linear", fill: "both" },
    },
  ],
  success: [
    {
      target: "sparkles",
      at: 0,
      keyframes: [
        { opacity: 0, transform: "scale(0.4)" },
        { opacity: 1, transform: "scale(1.1)" },
        { opacity: 1, transform: "scale(1)" },
      ],
      options: { duration: 500, easing: "soft", fill: "both" },
    },
  ],
};

export const states: MsvgStateMachine = {
  initial: "idle",
  states: {
    idle: { on: { HOVER: "hovered", LOAD: "loading" } },
    hovered: { onEnter: { timeline: "hover" }, on: { LEAVE: "idle", LOAD: "loading" } },
    loading: {
      onEnter: { timeline: "loadingLoop", loop: true },
      on: { RESOLVE: "success", REJECT: "idle" },
    },
    success: { onEnter: { timeline: "success" }, on: { RESET: "idle" } },
  },
};

export function makeConfig(
  overrides: Partial<MsvgAnimationConfig> = {},
): MsvgAnimationConfig {
  return {
    schemaVersion: "1.0",
    id: "test-agent",
    name: "Test Agent",
    version: "0.1.0",
    asset: { svg: "./assets/main.svg" },
    motion: {
      targets: "./motion/targets.json",
      timelines: "./motion/timelines.json",
      states: "./motion/states.json",
    },
    accessibility: {
      title: "Test Agent",
      description: "A test animation.",
      decorative: false,
    },
    ...overrides,
  };
}

export function makePackage(
  overrides: Partial<MsvgAnimationPackage> = {},
): MsvgAnimationPackage {
  return {
    config: makeConfig(),
    targets,
    timelines,
    states,
    svgMarkup: SVG_MARKUP,
    ...overrides,
  };
}

/** Mount the SVG markup into `document.body` and return its root element. */
export function mountRoot(markup: string = SVG_MARKUP): Element {
  document.body.innerHTML = markup;
  return document.querySelector("[data-animation]") as Element;
}

/** A detached container element (for container-mode mounting). */
export function makeContainer(): Element {
  const container = document.createElement("div");
  document.body.appendChild(container);
  return container;
}

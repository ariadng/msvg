/**
 * The COMPLETE example animation package from Spec Section 34, transcribed
 * exactly. This is the canary fixture: if the spec and the implementation
 * agree, `validatePackage` reports zero issues for it.
 */
import type {
  MsvgAnimationConfig,
  MsvgStateMachine,
  MsvgTargets,
  MsvgTimelines,
} from "msvg-schema";

// Section 34.1
export const config: MsvgAnimationConfig = {
  schemaVersion: "1.0",
  id: "inventory-agent",
  name: "Inventory Agent",
  version: "0.1.0",
  description: "Animated SVG assistant for inventory monitoring states.",
  asset: {
    svg: "./assets/main.svg",
    preview: "./assets/preview.png",
  },
  motion: {
    targets: "./motion/targets.json",
    timelines: "./motion/timelines.json",
    states: "./motion/states.json",
    idleCss: "./motion/idle.css",
  },
  accessibility: {
    title: "Inventory Agent",
    description: "Animated assistant representing inventory monitoring.",
    decorative: false,
  },
  reducedMotion: {
    strategy: "static",
    fallbackState: "idle",
  },
};

// Section 34.2
export const targets: MsvgTargets = {
  root: "[data-animation='inventory-agent']",
  body: "[data-part='body']",
  eyes: "[data-part='eyes']",
  leftArm: "[data-part='arm-left']",
  sparkles: "[data-part='sparkles']",
  loader: "[data-part='loader']",
};

// Section 34.3
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
      keyframes: [
        { transform: "rotate(0deg)" },
        { transform: "rotate(360deg)" },
      ],
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
  error: [
    {
      target: "body",
      at: 0,
      keyframes: [
        { transform: "translateX(0)" },
        { transform: "translateX(-6px)" },
        { transform: "translateX(6px)" },
        { transform: "translateX(0)" },
      ],
      options: { duration: 400, easing: "standard", fill: "both" },
    },
  ],
};

// Section 34.4
export const states: MsvgStateMachine = {
  initial: "idle",
  states: {
    idle: {
      on: { HOVER: "hovered", LOAD: "loading" },
    },
    hovered: {
      onEnter: { timeline: "hover" },
      on: { LEAVE: "idle", LOAD: "loading" },
    },
    loading: {
      onEnter: { timeline: "loadingLoop", loop: true },
      on: { RESOLVE: "success", REJECT: "error" },
    },
    success: {
      onEnter: { timeline: "success" },
      on: { RESET: "idle" },
    },
    error: {
      onEnter: { timeline: "error" },
      on: { RESET: "idle" },
    },
  },
};

/** The assembled non-DOM package, ready for `validatePackage`. */
export const inventoryAgent = { config, targets, timelines, states };

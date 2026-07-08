/**
 * A small, complete animation package used by the React adapter tests. Modeled
 * on the Spec Section 34 example. Not a `*.test.tsx` file.
 */
import type { MsvgAnimationPackage } from "msvg-schema";

const SVG_MARKUP = `<svg data-animation="inventory-agent" viewBox="0 0 100 100">
  <g data-part="body"></g>
  <g data-part="eyes"></g>
  <g data-part="sparkles"></g>
  <g data-part="loader"></g>
</svg>`;

export function makeAnimation(): MsvgAnimationPackage {
  return {
    config: {
      schemaVersion: "1.0",
      id: "inventory-agent",
      name: "Inventory Agent",
      version: "0.1.0",
      asset: { svg: "./assets/main.svg" },
      motion: {
        targets: "./motion/targets.json",
        timelines: "./motion/timelines.json",
        states: "./motion/states.json",
      },
      accessibility: {
        title: "Inventory Agent",
        description: "A test animation.",
        decorative: false,
      },
      reducedMotion: { strategy: "static", fallbackState: "idle" },
    },
    targets: {
      root: "[data-animation='inventory-agent']",
      body: "[data-part='body']",
      sparkles: "[data-part='sparkles']",
      loader: "[data-part='loader']",
    },
    timelines: {
      intro: [
        {
          target: "body",
          at: 0,
          keyframes: [{ opacity: 0 }, { opacity: 1 }],
          options: { duration: 500, easing: "standard", fill: "both" },
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
          keyframes: [{ opacity: 0 }, { opacity: 1 }],
          options: { duration: 500, easing: "soft", fill: "both" },
        },
      ],
    },
    states: {
      initial: "idle",
      states: {
        idle: { on: { HOVER: "hovered", LOAD: "loading" } },
        hovered: {
          onEnter: { timeline: "hover" },
          on: { LEAVE: "idle", LOAD: "loading" },
        },
        loading: {
          onEnter: { timeline: "loadingLoop", loop: true },
          on: { RESOLVE: "success", REJECT: "idle" },
        },
        success: { onEnter: { timeline: "success" }, on: { RESET: "idle" } },
      },
    },
    svgMarkup: SVG_MARKUP,
  };
}

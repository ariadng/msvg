/**
 * Public export for the inventory-agent animation package (Spec Section 14).
 *
 * This module assumes a bundler configured to import SVG as a raw string
 * (`?raw` in Vite, `asset/source` in webpack), CSS for side effects, and JSON
 * modules (Section 14.1). This example package intentionally has no build
 * script, so `tsc` never compiles it — see README.md.
 */

import config from "./animation.config.json";
import targets from "./motion/targets.json";
import timelines from "./motion/timelines.json";
import states from "./motion/states.json";
import svgMarkup from "./assets/main.svg?raw";
import "./motion/idle.css";

export const inventoryAgent = {
  config,
  targets,
  timelines,
  states,
  svgMarkup,
};

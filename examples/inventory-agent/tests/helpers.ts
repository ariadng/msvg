/**
 * Assemble the package object from disk with `node:fs`, the no-bundler path
 * described in Spec Section 14.1. The example's `index.ts` is bundler-only, so
 * the tests read the raw files instead of importing it.
 *
 * happy-dom installs its own global `URL`, which does not round-trip `file:`
 * URLs the way `fileURLToPath` expects, so we use Node's `URL` explicitly.
 */
import { readFileSync } from "node:fs";
import { fileURLToPath, URL as NodeURL } from "node:url";
import type { MsvgAnimationPackage } from "msvg-schema";

/** Absolute path to a file relative to the package root (one level up). */
export function packagePath(relative: string): string {
  return fileURLToPath(new NodeURL(`../${relative}`, import.meta.url));
}

function readJson<T>(relative: string): T {
  return JSON.parse(readFileSync(packagePath(relative), "utf8")) as T;
}

/** Read and assemble the full animation package from disk. */
export function readPackage(): MsvgAnimationPackage {
  return {
    config: readJson("animation.config.json"),
    targets: readJson("motion/targets.json"),
    timelines: readJson("motion/timelines.json"),
    states: readJson("motion/states.json"),
    svgMarkup: readFileSync(packagePath("assets/main.svg"), "utf8"),
  };
}

/**
 * `msvg inspect <path>` (Spec Section 23).
 *
 * Prints a human-readable overview: animation identity, assets, the target →
 * selector table, timelines with clip counts and total duration (max over
 * clips of `at + duration * iterations`, annotated when a state loops it), and
 * the state table with each state's outgoing event names.
 */

import type {
  MsvgClip,
  MsvgStateMachine,
  MsvgTarget,
} from "msvg-schema";
import { loadPackage } from "../package-io.js";
import { cleanPath, columnWidth, cross, padName, renderIssues } from "../render.js";
import type { CommandResult } from "./validate.js";

/** Resolve a target value (string or `{ selector }`) to its selector. */
function selectorOf(value: MsvgTarget | undefined): string {
  if (typeof value === "string") return value;
  if (value && typeof value === "object" && typeof value.selector === "string") {
    return value.selector;
  }
  return "";
}

/** Total duration of a timeline: max over clips of `at + duration*iterations`. */
function timelineDurationMs(clips: MsvgClip[]): number {
  let total = 0;
  for (const clip of clips) {
    const at = typeof clip.at === "number" && Number.isFinite(clip.at) ? clip.at : 0;
    const duration =
      typeof clip.options?.duration === "number" &&
      Number.isFinite(clip.options.duration)
        ? clip.options.duration
        : 0;
    const iterations =
      typeof clip.options?.iterations === "number" &&
      Number.isFinite(clip.options.iterations)
        ? clip.options.iterations
        : 1;
    const end = at + duration * iterations;
    if (end > total) total = end;
  }
  return Math.round(total);
}

/** Map each timeline name to the state (if any) whose onEnter loops it. */
function loopedByStates(states: MsvgStateMachine | undefined): Map<string, string> {
  const map = new Map<string, string>();
  if (!states || typeof states !== "object" || !states.states) return map;
  for (const [stateName, state] of Object.entries(states.states)) {
    const onEnter = state?.onEnter;
    if (onEnter?.loop === true && typeof onEnter.timeline === "string") {
      if (!map.has(onEnter.timeline)) map.set(onEnter.timeline, stateName);
    }
  }
  return map;
}

/** Inspect the package at `dir` and produce console output + an exit code. */
export function runInspect(dir: string): CommandResult {
  const loaded = loadPackage(dir);

  if (!loaded.config) {
    return {
      exitCode: 1,
      output: `${cross} Cannot inspect package.\n\n${renderIssues(loaded.issues)}`,
    };
  }

  const config = loaded.config;
  const lines: string[] = [];

  lines.push(`Animation: ${config.name ?? config.id ?? "(unnamed)"}`);
  lines.push(`ID: ${config.id ?? "(missing)"}`);
  if (config.version) lines.push(`Version: ${config.version}`);

  // --- Assets ---------------------------------------------------------------
  lines.push("", "Assets:");
  if (config.asset?.svg) lines.push(`  SVG: ${cleanPath(config.asset.svg)}`);
  if (config.asset?.preview) {
    lines.push(`  Preview: ${cleanPath(config.asset.preview)}`);
  }

  // --- Targets (root omitted, matching the spec output) ---------------------
  if (loaded.targets) {
    const names = Object.keys(loaded.targets).filter((n) => n !== "root");
    if (names.length > 0) {
      lines.push("", "Targets:");
      const width = columnWidth(names);
      for (const name of names) {
        lines.push(`  ${padName(name, width)}${selectorOf(loaded.targets[name])}`);
      }
    }
  }

  // --- Timelines ------------------------------------------------------------
  if (loaded.timelines) {
    const names = Object.keys(loaded.timelines);
    if (names.length > 0) {
      lines.push("", "Timelines:");
      const width = columnWidth(names);
      const looped = loopedByStates(loaded.states);
      for (const name of names) {
        const clips = loaded.timelines[name];
        const count = Array.isArray(clips) ? clips.length : 0;
        const ms = Array.isArray(clips) ? timelineDurationMs(clips) : 0;
        let detail = `${count} ${count === 1 ? "clip" : "clips"}, ${ms}ms total`;
        const state = looped.get(name);
        if (state) detail += ` (looped by state "${state}")`;
        lines.push(`  ${padName(name, width)}${detail}`);
      }
    }
  }

  // --- States ---------------------------------------------------------------
  if (loaded.states && loaded.states.states) {
    const names = Object.keys(loaded.states.states);
    if (names.length > 0) {
      lines.push("", "States:");
      const width = columnWidth(names);
      for (const name of names) {
        const state = loaded.states.states[name];
        const events = state?.on ? Object.keys(state.on) : [];
        const arrow = events.length > 0 ? `→ ${events.join(", ")}` : "→ (no transitions)";
        lines.push(`  ${padName(name, width)}${arrow}`);
      }
    }
  }

  return { exitCode: 0, output: lines.join("\n") };
}

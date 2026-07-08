/**
 * Shared presentation helpers for the CLI: SVG parsing (via linkedom), column
 * alignment, and did-you-mean issue rendering (Spec Section 22).
 */

import { parseHTML } from "linkedom";
import pc from "picocolors";
import type { MinimalSvgRoot } from "msvg-schema";
import type { MsvgValidationIssue } from "msvg-schema";

/**
 * Parse SVG markup into a {@link MinimalSvgRoot} usable by
 * `checkTargetsAgainstSvg`. The markup is wrapped in a minimal HTML document so
 * both the root `<svg>` (matched by `[data-animation=…]`) and its `<g>` parts
 * resolve through `querySelectorAll`.
 */
export function parseSvg(svgMarkup: string): MinimalSvgRoot {
  const { document } = parseHTML(
    `<!doctype html><html><body>${svgMarkup}</body></html>`,
  );
  return document.body as unknown as MinimalSvgRoot;
}

export const check = pc.green("✓"); // ✓
export const cross = pc.red("✗"); // ✗

/** Right-pad `name` so a following column starts at `width` (+ a 2-space gap). */
export function padName(name: string, width: number): string {
  return name.padEnd(width);
}

/** The alignment width for a set of names: longest name plus a 2-space gutter. */
export function columnWidth(names: readonly string[]): number {
  return names.reduce((max, n) => Math.max(max, n.length), 0) + 2;
}

/**
 * Render a single validation issue in the Section 22 style:
 *
 *   Error: <message>
 *
 *   Did you mean:
 *     <suggestion>
 */
export function renderIssue(issue: MsvgValidationIssue): string {
  const label = issue.severity === "error" ? pc.red("Error") : pc.yellow("Warning");
  let block = `${label}: ${issue.message}`;
  if (issue.suggestion !== undefined && issue.suggestion.length > 0) {
    block += `\n\nDid you mean:\n  ${issue.suggestion}`;
  }
  return block;
}

/** Render a list of issues, most severe first, separated by blank lines. */
export function renderIssues(issues: readonly MsvgValidationIssue[]): string {
  const ordered = [...issues].sort((a, b) => {
    if (a.severity === b.severity) return 0;
    return a.severity === "error" ? -1 : 1;
  });
  return ordered.map(renderIssue).join("\n\n");
}

/** Strip a leading `./` from a manifest path so display matches the spec. */
export function cleanPath(path: string): string {
  return path.replace(/^\.\//, "");
}

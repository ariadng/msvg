import { describe, it, expect } from "vitest";
import { parseHTML } from "linkedom";
import { checkTargetsAgainstSvg, type MinimalSvgRoot } from "msvg-schema";
import { readPackage } from "./helpers.js";

function parseSvg(markup: string): MinimalSvgRoot {
  const { document } = parseHTML(`<!doctype html><html><body>${markup}</body></html>`);
  return document.body as unknown as MinimalSvgRoot;
}

describe("inventory-agent targets", () => {
  const pkg = readPackage();
  const root = parseSvg(pkg.svgMarkup!);

  it("resolves every target against assets/main.svg", () => {
    const issues = checkTargetsAgainstSvg(root, pkg.targets);
    expect(issues, JSON.stringify(issues, null, 2)).toEqual([]);
  });

  it("has a DOM node for each Section 34.2 target", () => {
    for (const [name, value] of Object.entries(pkg.targets)) {
      const selector = typeof value === "string" ? value : value.selector;
      expect(root.querySelectorAll(selector).length, `target ${name}`).toBeGreaterThan(0);
    }
  });

  it("exposes the expected data-part groups", () => {
    for (const part of ["body", "eyes", "arm-left", "sparkles", "loader"]) {
      expect(root.querySelectorAll(`[data-part='${part}']`).length).toBe(1);
    }
    expect(root.querySelectorAll("[data-animation='inventory-agent']").length).toBe(1);
  });
});

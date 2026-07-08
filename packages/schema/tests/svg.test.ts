import { describe, it, expect } from "vitest";
import { checkTargetsAgainstSvg } from "msvg-schema";
import type { MinimalSvgRoot, MsvgTargets } from "msvg-schema";

/**
 * A tiny structural stand-in for an SVG root. `counts` maps a selector to how
 * many nodes it should match; anything absent matches zero.
 */
function mockRoot(counts: Record<string, number>): MinimalSvgRoot {
  return {
    querySelectorAll(selector: string): ArrayLike<unknown> {
      return { length: counts[selector] ?? 0 };
    },
  };
}

const codes = (issues: { code: string }[]) => issues.map((i) => i.code);

describe("checkTargetsAgainstSvg (Spec Section 30.2, DOM)", () => {
  it("passes when every selector resolves", () => {
    const targets: MsvgTargets = {
      body: "[data-part='body']",
      eyes: "[data-part='eyes']",
    };
    const root = mockRoot({ "[data-part='body']": 1, "[data-part='eyes']": 1 });
    expect(checkTargetsAgainstSvg(root, targets)).toEqual([]);
  });

  it("errors when a selector matches nothing", () => {
    const targets: MsvgTargets = { ghost: "[data-part='ghost']" };
    const issues = checkTargetsAgainstSvg(mockRoot({}), targets);
    expect(codes(issues)).toContain("selector-no-match");
    expect(issues[0]?.path).toBe("targets.ghost");
  });

  it('errors when expect "one" matches two or more nodes', () => {
    const targets: MsvgTargets = {
      logo: { selector: "[data-part='logo']", expect: "one" },
    };
    const root = mockRoot({ "[data-part='logo']": 3 });
    expect(codes(checkTargetsAgainstSvg(root, targets))).toContain(
      "expect-one-violation",
    );
  });

  it('does not error when expect "many" matches several nodes', () => {
    const targets: MsvgTargets = {
      sparkles: { selector: "[data-part='sparkle']", expect: "many" },
    };
    const root = mockRoot({ "[data-part='sparkle']": 4 });
    expect(checkTargetsAgainstSvg(root, targets)).toEqual([]);
  });

  it('reports no-match (not expect-one) when expect "one" matches zero', () => {
    const targets: MsvgTargets = {
      logo: { selector: "[data-part='logo']", expect: "one" },
    };
    const issues = checkTargetsAgainstSvg(mockRoot({}), targets);
    expect(codes(issues)).toEqual(["selector-no-match"]);
  });

  it("reports an invalid selector the DOM cannot parse", () => {
    const root: MinimalSvgRoot = {
      querySelectorAll() {
        throw new Error("invalid selector");
      },
    };
    const targets: MsvgTargets = { body: "[[bad" };
    expect(codes(checkTargetsAgainstSvg(root, targets))).toContain(
      "invalid-selector",
    );
  });
});

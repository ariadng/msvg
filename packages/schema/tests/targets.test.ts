import { describe, it, expect } from "vitest";
import { validateTargets } from "msvg-schema";
import { targets } from "./fixtures.js";

const codes = (issues: { code: string }[]) => issues.map((i) => i.code);

describe("validateTargets (Spec Section 30.2, non-DOM)", () => {
  it("passes the spec example targets", () => {
    expect(validateTargets(targets)).toEqual([]);
  });

  it("accepts the object cardinality form (Section 9.3)", () => {
    const issues = validateTargets({
      sparkles: { selector: "[data-part='sparkle']", expect: "many" },
      logo: { selector: "[data-part='logo']", expect: "one" },
    });
    expect(issues).toEqual([]);
  });

  it("flags a non-object targets map", () => {
    expect(codes(validateTargets([]))).toContain("invalid-targets");
  });

  it("warns on a non-camelCase target name", () => {
    const issues = validateTargets({ "left-arm": "[data-part='arm-left']" });
    const naming = issues.find((i) => i.code === "target-naming-convention");
    expect(naming?.severity).toBe("warning");
  });

  it("errors on an empty selector string", () => {
    expect(codes(validateTargets({ body: "" }))).toContain(
      "invalid-target-selector",
    );
  });

  it("errors on an object without a selector", () => {
    expect(codes(validateTargets({ body: { expect: "one" } }))).toContain(
      "invalid-target-selector",
    );
  });

  it("errors on an invalid expect value", () => {
    const issues = validateTargets({
      body: { selector: "[data-part='body']", expect: "some" },
    });
    expect(codes(issues)).toContain("invalid-target-expect");
  });

  it("errors on a non-string, non-object target value", () => {
    expect(codes(validateTargets({ body: 42 }))).toContain("invalid-target");
  });
});

import { describe, it, expect } from "vitest";
import { levenshtein, suggest } from "msvg-schema";

describe("levenshtein", () => {
  it("computes edit distance", () => {
    expect(levenshtein("sparkle", "sparkles")).toBe(1);
    expect(levenshtein("kitten", "sitting")).toBe(3);
    expect(levenshtein("", "abc")).toBe(3);
    expect(levenshtein("same", "same")).toBe(0);
  });
});

describe("suggest (did-you-mean, Spec Section 22)", () => {
  it('suggests "sparkles" for "sparkle"', () => {
    expect(suggest("sparkle", ["body", "eyes", "sparkles", "loader"])).toBe(
      "sparkles",
    );
  });

  it("returns the closest of several candidates", () => {
    expect(suggest("lodaer", ["body", "loader", "leftArm"])).toBe("loader");
  });

  it("returns undefined when nothing is close enough", () => {
    expect(suggest("xyz", ["body", "eyes", "sparkles"])).toBeUndefined();
  });

  it("ignores an exact match (no self-suggestion)", () => {
    expect(suggest("body", ["body"])).toBeUndefined();
  });
});

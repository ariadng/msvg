import { afterEach, describe, expect, it } from "vitest";
import {
  prefersReducedMotion,
  reducedMotionDisablesLoop,
  transformTimelineForReducedMotion,
} from "msvg-core";
import type { MsvgClip } from "msvg-schema";
import { removeMatchMedia, setReducedMotionPreference } from "./waapi-mock.js";

const clips: MsvgClip[] = [
  {
    target: "body",
    at: 0,
    keyframes: [
      { opacity: 0, transform: "scale(0.9)" },
      { opacity: 1, transform: "scale(1)" },
    ],
    options: { duration: 500, easing: "soft", fill: "both" },
  },
  {
    target: "loader",
    at: 300,
    keyframes: [
      { transform: "rotate(0deg)" },
      { transform: "rotate(360deg)" },
    ],
    options: { duration: 1200, easing: "linear" },
  },
];

afterEach(() => {
  removeMatchMedia();
});

describe("prefersReducedMotion", () => {
  it("reflects the matchMedia result", () => {
    setReducedMotionPreference(true);
    expect(prefersReducedMotion()).toBe(true);
    setReducedMotionPreference(false);
    expect(prefersReducedMotion()).toBe(false);
  });

  it("returns false when matchMedia is absent (SSR-safe)", () => {
    removeMatchMedia();
    expect(prefersReducedMotion()).toBe(false);
  });
});

describe("transformTimelineForReducedMotion", () => {
  describe("static", () => {
    it("drops every clip so nothing runs", () => {
      expect(transformTimelineForReducedMotion(clips, "static")).toEqual([]);
      expect(reducedMotionDisablesLoop("static")).toBe(true);
    });
  });

  describe("fade", () => {
    it("strips transform keys and clamps duration to <= 200ms", () => {
      const result = transformTimelineForReducedMotion(clips, "fade");
      // First clip keeps opacity; second clip (transform-only) is dropped.
      expect(result).toHaveLength(1);
      const [first] = result;
      expect(first?.options.duration).toBe(200);
      for (const kf of first?.keyframes ?? []) {
        expect(kf).not.toHaveProperty("transform");
        expect(kf).toHaveProperty("opacity");
      }
    });

    it("does not disable looping", () => {
      expect(reducedMotionDisablesLoop("fade")).toBe(false);
    });
  });

  describe("shorten", () => {
    it("clamps durations to <= 120ms and scales at offsets proportionally", () => {
      const result = transformTimelineForReducedMotion(clips, "shorten");
      expect(result).toHaveLength(2);
      // factor = 120 / 1200 = 0.1
      expect(result[0]?.at).toBe(0);
      expect(result[0]?.options.duration).toBe(120);
      expect(result[1]?.at).toBeCloseTo(30); // 300 * 0.1
      expect(result[1]?.options.duration).toBe(120);
    });

    it("disables looping", () => {
      expect(reducedMotionDisablesLoop("shorten")).toBe(true);
    });
  });

  describe("none", () => {
    it("returns the clips unchanged", () => {
      expect(transformTimelineForReducedMotion(clips, "none")).toBe(clips);
      expect(reducedMotionDisablesLoop("none")).toBe(false);
    });
  });
});

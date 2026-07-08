import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { playTimeline, playTimelineLoop } from "msvg-core";
import type { MsvgClip, MsvgTargets } from "msvg-schema";
import { easings } from "msvg-schema";
import { MockAnimation, flush, installWaapiMock } from "./waapi-mock.js";
import { mountRoot, targets, timelines } from "./fixtures.js";

let uninstall: () => void;

beforeEach(() => {
  uninstall = installWaapiMock();
});

afterEach(() => {
  uninstall();
  vi.restoreAllMocks();
  document.body.innerHTML = "";
});

describe("playTimeline", () => {
  it("creates one animation per resolved element with delay = at + delay", () => {
    const root = mountRoot();
    playTimeline(root, timelines.intro, targets, easings);
    expect(MockAnimation.instances).toHaveLength(2);
    const [body, sparkles] = MockAnimation.instances;
    expect(body?.part).toBe("body");
    expect(body?.options.delay).toBe(0);
    expect(sparkles?.part).toBe("sparkles");
    expect(sparkles?.options.delay).toBe(300);
  });

  it("resolves easing tokens in options and defaults fill to both", () => {
    const root = mountRoot();
    playTimeline(root, timelines.intro, targets, easings);
    const [body] = MockAnimation.instances;
    expect(body?.options.easing).toBe("cubic-bezier(.2, 0, 0, 1)"); // standard
    expect(body?.options.fill).toBe("both");
  });

  it("resolves easing tokens inside per-keyframe easing fields", () => {
    const root = mountRoot();
    const clip: MsvgClip = {
      target: "body",
      at: 0,
      keyframes: [
        { opacity: 0, easing: "soft" },
        { opacity: 1 },
      ],
      options: { duration: 300 },
    };
    playTimeline(root, [clip], targets, easings);
    const [anim] = MockAnimation.instances;
    expect(anim?.keyframes[0]?.easing).toBe("cubic-bezier(.4, 0, .2, 1)");
  });

  it("resolves object-form targets (Section 9.3) via their selector", () => {
    const root = mountRoot();
    const objTargets: MsvgTargets = {
      body: { selector: "[data-part='body']", expect: "one" },
    };
    const clip: MsvgClip = {
      target: "body",
      at: 0,
      keyframes: [{ opacity: 0 }, { opacity: 1 }],
      options: { duration: 200 },
    };
    playTimeline(root, [clip], objTargets, easings);
    expect(MockAnimation.instances).toHaveLength(1);
    expect(MockAnimation.instances[0]?.part).toBe("body");
  });

  describe("transform preparation", () => {
    it("sets transform-box and transform-origin on a bare element", () => {
      const root = mountRoot();
      playTimeline(root, timelines.hover, targets, easings);
      const body = root.querySelector("[data-part='body']") as SVGElement;
      expect(body.style.getPropertyValue("transform-box")).toBe("fill-box");
      expect(body.style.getPropertyValue("transform-origin")).toBe("center");
    });

    it("skips preparation when transform-box is already declared inline", () => {
      const root = mountRoot();
      const body = root.querySelector("[data-part='body']") as SVGElement;
      body.style.setProperty("transform-box", "border-box");
      playTimeline(root, timelines.hover, targets, easings);
      expect(body.style.getPropertyValue("transform-box")).toBe("border-box");
      expect(body.style.getPropertyValue("transform-origin")).toBe("");
    });

    it("skips preparation when transform-origin is already declared inline", () => {
      const root = mountRoot();
      const body = root.querySelector("[data-part='body']") as SVGElement;
      body.style.setProperty("transform-origin", "top left");
      playTimeline(root, timelines.hover, targets, easings);
      // Because either declaration suppresses preparation, transform-box stays unset.
      expect(body.style.getPropertyValue("transform-box")).toBe("");
      expect(body.style.getPropertyValue("transform-origin")).toBe("top left");
    });
  });

  describe("missing targets", () => {
    it("warns and skips an unknown target in non-strict mode", () => {
      const root = mountRoot();
      const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
      const clip: MsvgClip = {
        target: "nope",
        at: 0,
        keyframes: [{ opacity: 0 }, { opacity: 1 }],
        options: { duration: 200 },
      };
      const playback = playTimeline(root, [clip], targets, easings);
      expect(playback.animations).toHaveLength(0);
      expect(warn).toHaveBeenCalledOnce();
      expect(warn.mock.calls[0]?.[0]).toContain("[msvg]");
    });

    it("warns and skips a target that matches no element in non-strict mode", () => {
      const root = mountRoot();
      const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
      const clip: MsvgClip = {
        target: "missing",
        at: 0,
        keyframes: [{ opacity: 0 }, { opacity: 1 }],
        options: { duration: 200 },
      };
      const playback = playTimeline(root, [clip], targets, easings);
      expect(playback.animations).toHaveLength(0);
      expect(warn).toHaveBeenCalledOnce();
    });

    it("throws on an unknown target in strict mode", () => {
      const root = mountRoot();
      const clip: MsvgClip = {
        target: "nope",
        at: 0,
        keyframes: [{ opacity: 0 }, { opacity: 1 }],
        options: { duration: 200 },
      };
      expect(() => playTimeline(root, [clip], targets, easings, { strict: true })).toThrow(
        /Unknown target/,
      );
    });

    it("throws on a missing element in strict mode", () => {
      const root = mountRoot();
      const clip: MsvgClip = {
        target: "missing",
        at: 0,
        keyframes: [{ opacity: 0 }, { opacity: 1 }],
        options: { duration: 200 },
      };
      expect(() => playTimeline(root, [clip], targets, easings, { strict: true })).toThrow(
        /not found/,
      );
    });
  });

  describe("finished + settle", () => {
    it("resolves finished when every clip completes naturally", async () => {
      const root = mountRoot();
      const playback = playTimeline(root, timelines.intro, targets, easings);
      MockAnimation.instances.forEach((a) => a.finish());
      await expect(playback.finished).resolves.toBeUndefined();
    });

    it("auto-settles on natural completion (commitStyles then cancel)", async () => {
      const root = mountRoot();
      const playback = playTimeline(root, timelines.hover, targets, easings);
      const [anim] = MockAnimation.instances;
      anim?.finish();
      await playback.finished;
      await flush();
      expect(anim?.commitStyles).toHaveBeenCalled();
      expect(anim?.cancel).toHaveBeenCalled();
    });

    it("stop() settles all animations and finished still resolves", async () => {
      const root = mountRoot();
      const playback = playTimeline(root, timelines.intro, targets, easings);
      playback.stop();
      for (const anim of MockAnimation.instances) {
        expect(anim.commitStyles).toHaveBeenCalled();
        expect(anim.cancel).toHaveBeenCalled();
      }
      await expect(playback.finished).resolves.toBeUndefined();
    });

    it("finished never rejects even when animations are cancelled", async () => {
      const root = mountRoot();
      const playback = playTimeline(root, timelines.hover, targets, easings);
      MockAnimation.instances[0]?.cancel();
      await expect(playback.finished).resolves.toBeUndefined();
    });

    it("pause() and resume() forward to every animation", () => {
      const root = mountRoot();
      const playback = playTimeline(root, timelines.intro, targets, easings);
      playback.pause();
      expect(MockAnimation.instances.every((a) => a.playState === "paused")).toBe(true);
      playback.resume();
      expect(MockAnimation.instances.every((a) => a.playState === "running")).toBe(true);
    });
  });

  it("resolves immediately when the timeline is empty", async () => {
    const root = mountRoot();
    const playback = playTimeline(root, [], targets, easings);
    expect(playback.animations).toHaveLength(0);
    await expect(playback.finished).resolves.toBeUndefined();
  });
});

describe("playTimelineLoop", () => {
  it("restarts all clips after the longest completes and resolves after the first cycle", async () => {
    const root = mountRoot();
    const playback = playTimelineLoop(root, timelines.loadingLoop, targets, easings);
    expect(MockAnimation.instances).toHaveLength(1);
    const first = MockAnimation.instances[0];

    first?.finish();
    await expect(playback.finished).resolves.toBeUndefined();
    await flush();

    // The completed cycle was settled and a fresh cycle started.
    expect(first?.commitStyles).toHaveBeenCalled();
    expect(first?.cancel).toHaveBeenCalled();
    expect(MockAnimation.instances).toHaveLength(2);

    playback.stop();
  });

  it("stops looping when interrupted", async () => {
    const root = mountRoot();
    const playback = playTimelineLoop(root, timelines.loadingLoop, targets, easings);
    const first = MockAnimation.instances[0];
    first?.finish();
    await flush();
    expect(MockAnimation.instances).toHaveLength(2); // restarted once

    playback.stop();
    const second = MockAnimation.instances[1];
    expect(second?.cancel).toHaveBeenCalled();

    // Finishing the (already-settled) second cycle must not spawn a third.
    second?.finish();
    await flush();
    expect(MockAnimation.instances).toHaveLength(2);
  });

  it("resolves the first cycle immediately when stopped mid-flight", async () => {
    const root = mountRoot();
    const playback = playTimelineLoop(root, timelines.loadingLoop, targets, easings);
    playback.stop();
    await expect(playback.finished).resolves.toBeUndefined();
  });
});

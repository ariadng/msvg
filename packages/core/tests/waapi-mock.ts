/**
 * A minimal Web Animations API mock. happy-dom does not implement
 * `Element.prototype.animate`, `Animation`, or a controllable `matchMedia`, so
 * these tests install their own. Not a `*.test.ts` file, so vitest never runs
 * it as a suite.
 */
import { vi } from "vitest";

function makeAbortError(): unknown {
  if (typeof DOMException === "function") {
    return new DOMException("The animation was aborted.", "AbortError");
  }
  const error = new Error("The animation was aborted.");
  error.name = "AbortError";
  return error;
}

/** A stand-in for `Animation` with test hooks to resolve/reject `finished`. */
export class MockAnimation {
  /** Every animation created since the last {@link installWaapiMock}. */
  static instances: MockAnimation[] = [];

  target: Element;
  keyframes: Keyframe[];
  options: KeyframeAnimationOptions;
  playState: "idle" | "running" | "paused" | "finished" = "running";
  finished: Promise<Animation>;

  commitStyles = vi.fn();
  cancel = vi.fn(() => {
    this.playState = "idle";
    this.rejectFinished(makeAbortError());
  });
  pause = vi.fn(() => {
    this.playState = "paused";
  });
  play = vi.fn(() => {
    this.playState = "running";
  });
  persist = vi.fn();

  private resolveFinished!: (value: Animation) => void;
  private rejectFinished!: (reason: unknown) => void;

  constructor(target: Element, keyframes: Keyframe[], options: KeyframeAnimationOptions) {
    this.target = target;
    this.keyframes = keyframes;
    this.options = options ?? {};
    this.finished = new Promise<Animation>((resolve, reject) => {
      this.resolveFinished = resolve;
      this.rejectFinished = reject;
    });
    // Prevent unhandled-rejection noise: consumers attach their own handlers,
    // but presets and ad-hoc callers may not.
    this.finished.catch(() => undefined);
    MockAnimation.instances.push(this);
  }

  /** Test hook: drive the animation to natural completion. */
  finish(): void {
    this.playState = "finished";
    this.resolveFinished(this as unknown as Animation);
  }

  /** Convenience: the element's `data-part` (or the raw selector target). */
  get part(): string | null {
    return this.target.getAttribute("data-part");
  }
}

/** Install the mock onto `Element.prototype.animate`. Returns an uninstaller. */
export function installWaapiMock(): () => void {
  MockAnimation.instances = [];
  const original = Object.getOwnPropertyDescriptor(Element.prototype, "animate");
  Element.prototype.animate = function animate(
    this: Element,
    keyframes: Keyframe[] | PropertyIndexedKeyframes | null,
    options?: number | KeyframeAnimationOptions,
  ): Animation {
    const normalized = Array.isArray(keyframes) ? keyframes : [];
    const opts = typeof options === "object" && options !== null ? options : {};
    return new MockAnimation(this, normalized, opts) as unknown as Animation;
  } as typeof Element.prototype.animate;

  return () => {
    if (original) {
      Object.defineProperty(Element.prototype, "animate", original);
    } else {
      delete (Element.prototype as { animate?: unknown }).animate;
    }
    MockAnimation.instances = [];
  };
}

/** Force `matchMedia("(prefers-reduced-motion: reduce)")` to (not) match. */
export function setReducedMotionPreference(matches: boolean): void {
  (window as unknown as { matchMedia: (q: string) => MediaQueryList }).matchMedia = (
    query: string,
  ) =>
    ({
      matches,
      media: query,
      onchange: null,
      addListener: () => {},
      removeListener: () => {},
      addEventListener: () => {},
      removeEventListener: () => {},
      dispatchEvent: () => false,
    }) as unknown as MediaQueryList;
}

/** Remove the `matchMedia` override entirely (SSR-absence simulation). */
export function removeMatchMedia(): void {
  delete (window as { matchMedia?: unknown }).matchMedia;
}

/** Flush pending micro- and macro-tasks so settle/loop callbacks run. */
export function flush(): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, 0));
}

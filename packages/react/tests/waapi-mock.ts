/**
 * A minimal, self-contained Web Animations API mock for the React adapter
 * tests. happy-dom implements neither `Element.prototype.animate` nor a
 * controllable `matchMedia`, so we install our own here. This file is owned by
 * `msvg-react` and does not import any other package's test helpers.
 *
 * Not a `*.test.tsx` file, so vitest never runs it as a suite.
 */

function makeAbortError(): unknown {
  if (typeof DOMException === "function") {
    return new DOMException("The animation was aborted.", "AbortError");
  }
  const error = new Error("The animation was aborted.");
  error.name = "AbortError";
  return error;
}

/** A stand-in for `Animation`; `finished` can be resolved via {@link finish}. */
class MockAnimation {
  playState: "idle" | "running" | "paused" | "finished" = "running";
  finished: Promise<Animation>;
  private resolveFinished!: (value: Animation) => void;
  private rejectFinished!: (reason: unknown) => void;

  constructor() {
    this.finished = new Promise<Animation>((resolve, reject) => {
      this.resolveFinished = resolve;
      this.rejectFinished = reject;
    });
    this.finished.catch(() => undefined);
  }

  commitStyles(): void {
    /* no-op in the mock */
  }
  cancel(): void {
    this.playState = "idle";
    this.rejectFinished(makeAbortError());
  }
  pause(): void {
    this.playState = "paused";
  }
  play(): void {
    this.playState = "running";
  }
  persist(): void {
    /* no-op */
  }
  finish(): void {
    this.playState = "finished";
    this.resolveFinished(this as unknown as Animation);
  }
}

/** Install the mock on `Element.prototype.animate`. Returns an uninstaller. */
export function installWaapiMock(): () => void {
  const original = Object.getOwnPropertyDescriptor(Element.prototype, "animate");
  Element.prototype.animate = function animate(): Animation {
    return new MockAnimation() as unknown as Animation;
  } as typeof Element.prototype.animate;

  return () => {
    if (original) {
      Object.defineProperty(Element.prototype, "animate", original);
    } else {
      delete (Element.prototype as { animate?: unknown }).animate;
    }
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

/**
 * `useMsvg` — the hook API (Spec Section 29.4).
 *
 * Returns a `ref` to attach to a host element and the live `controller`, which
 * is `null` until the element has mounted. The controller is recreated when
 * `animation` changes and destroyed on unmount.
 */

import { useEffect, useRef, useState } from "react";
import { createMsvg, type MsvgController } from "msvg";
import type { MsvgAnimationPackage } from "msvg-schema";

/** Options for {@link useMsvg}. */
export interface UseMsvgOptions {
  animation: MsvgAnimationPackage;
  initialState?: string;
  autoplay?: boolean;
  respectReducedMotion?: boolean;
  strict?: boolean;
}

/** Result of {@link useMsvg}: the host ref and the (initially null) controller. */
export interface UseMsvgResult {
  ref: React.RefObject<HTMLDivElement>;
  controller: MsvgController | null;
}

export function useMsvg(options: UseMsvgOptions): UseMsvgResult {
  const { animation, initialState, autoplay, respectReducedMotion, strict } = options;

  const ref = useRef<HTMLDivElement>(null);
  const [controller, setController] = useState<MsvgController | null>(null);

  // Capture creation-time options so only `animation` recreates the controller.
  const initialStateRef = useRef(initialState);
  initialStateRef.current = initialState;
  const autoplayRef = useRef(autoplay);
  autoplayRef.current = autoplay;
  const respectReducedMotionRef = useRef(respectReducedMotion);
  respectReducedMotionRef.current = respectReducedMotion;
  const strictRef = useRef(strict);
  strictRef.current = strict;

  useEffect(() => {
    const host = ref.current;
    if (!host) return;

    const created = createMsvg({
      container: host,
      animation,
      autoplay: autoplayRef.current,
      initialState: initialStateRef.current,
      respectReducedMotion: respectReducedMotionRef.current,
      strict: strictRef.current,
    });
    setController(created);

    return () => {
      created.destroy();
      setController(null);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [animation]);

  return { ref, controller };
}

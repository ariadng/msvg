/**
 * `<Msvg />` — the React adapter component (Spec Section 29).
 *
 * Renders a host `<div>` and mounts `animation.svgMarkup` into it through
 * `createMsvg({ container })`. Native `<div>` props pass through untouched
 * (Section 29.3 — they are never overloaded). The controlled `state` prop drives
 * `controller.setState`, `events` maps DOM events on the host to state-machine
 * events, and the whole controller is destroyed on unmount. Safe under React
 * StrictMode's double mount.
 */

import {
  type ComponentPropsWithoutRef,
  useEffect,
  useRef,
  type MutableRefObject,
} from "react";
import { createMsvg, type MsvgController } from "msvg-core";
import type { MsvgAnimationPackage } from "msvg-schema";

/** Props for {@link Msvg}. Everything not listed here is a native `<div>` prop. */
export interface MsvgProps extends Omit<ComponentPropsWithoutRef<"div">, "children"> {
  /** The animation package to mount (must include `svgMarkup`). */
  animation: MsvgAnimationPackage;
  /** Override the state machine's initial state at creation. */
  initialState?: string;
  /** Controlled state: changes drive `controller.setState`. */
  state?: string;
  /** Called after every state transition. */
  onStateChange?: (state: string) => void;
  /** Called once with the controller after mount/attach. */
  onReady?: (controller: MsvgController) => void;
  /** Map DOM event names on the host to state-machine events (Section 29.3). */
  events?: Record<string, string>;
  /** Enter the initial state on creation. Default `true`. */
  autoplay?: boolean;
  /** Respect `prefers-reduced-motion`. Default `true`. */
  respectReducedMotion?: boolean;
  /** Throw (instead of warn+skip) on missing targets/timelines. Default `false`. */
  strict?: boolean;
}

/** Keep a ref pointing at the most recent value, updated during render. */
function useLatest<T>(value: T): MutableRefObject<T> {
  const ref = useRef(value);
  ref.current = value;
  return ref;
}

export function Msvg(props: MsvgProps): JSX.Element {
  const {
    animation,
    initialState,
    state,
    onStateChange,
    onReady,
    events,
    autoplay,
    respectReducedMotion,
    strict,
    ...divProps
  } = props;

  const hostRef = useRef<HTMLDivElement>(null);
  const controllerRef = useRef<MsvgController | null>(null);

  const onReadyRef = useLatest(onReady);
  const onStateChangeRef = useLatest(onStateChange);
  const stateRef = useLatest(state);
  // Creation-time options captured via refs so callback changes never recreate
  // the controller; only `animation` does.
  const initialStateRef = useLatest(initialState);
  const autoplayRef = useLatest(autoplay);
  const respectReducedMotionRef = useLatest(respectReducedMotion);
  const strictRef = useLatest(strict);

  // Create / destroy the controller when the animation changes (Section 29.4).
  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;

    const controller = createMsvg({
      container: host,
      animation,
      autoplay: autoplayRef.current,
      initialState: initialStateRef.current,
      respectReducedMotion: respectReducedMotionRef.current,
      strict: strictRef.current,
    });
    controllerRef.current = controller;

    const unsubscribe = controller.onStateChange((next) => {
      onStateChangeRef.current?.(next);
    });

    // Apply a controlled state supplied at (re)creation.
    const controlled = stateRef.current;
    if (controlled !== undefined && controller.getState() !== controlled) {
      controller.setState(controlled);
    }

    onReadyRef.current?.(controller);

    return () => {
      unsubscribe();
      controller.destroy();
      controllerRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [animation]);

  // Controlled state: drive setState when the prop changes (Section 29.2).
  useEffect(() => {
    const controller = controllerRef.current;
    if (!controller || state === undefined) return;
    if (controller.getState() !== state) controller.setState(state);
  }, [state]);

  // Map DOM events on the host to state-machine events (Section 29.3).
  const eventsKey = events ? JSON.stringify(events) : "";
  useEffect(() => {
    const host = hostRef.current;
    if (!host || !events) return;

    const bound: Array<[string, EventListener]> = [];
    for (const [domEvent, machineEvent] of Object.entries(events)) {
      const handler: EventListener = () => controllerRef.current?.send(machineEvent);
      host.addEventListener(domEvent, handler);
      bound.push([domEvent, handler]);
    }

    return () => {
      for (const [domEvent, handler] of bound) {
        host.removeEventListener(domEvent, handler);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [eventsKey]);

  return <div ref={hostRef} {...divProps} />;
}

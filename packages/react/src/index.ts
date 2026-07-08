/**
 * msvg-react — the React adapter for MotionSVG animation packages (Section 29).
 *
 * Exposes the `<Msvg />` component and the `useMsvg` hook, both thin wrappers
 * over `msvg`'s `createMsvg`. No DOM access happens at import time.
 */

export { Msvg } from "./Msvg.js";
export type { MsvgProps } from "./Msvg.js";

export { useMsvg } from "./useMsvg.js";
export type { UseMsvgOptions, UseMsvgResult } from "./useMsvg.js";

/**
 * Shared TypeScript types for msvg (MotionSVG) animation packages.
 *
 * The core domain types are transcribed verbatim from Spec Section 31 so the
 * schema package remains the single source of truth for the package shape.
 */

export type MsvgAnimationPackage = {
  config: MsvgAnimationConfig;
  targets: MsvgTargets;
  timelines: MsvgTimelines;
  states?: MsvgStateMachine;
  svgMarkup?: string;
  presets?: Record<string, MsvgPreset>;
};

export type MsvgAnimationConfig = {
  schemaVersion: string;
  id: string;
  name: string;
  version?: string;
  description?: string;
  asset: {
    svg: string;
    preview?: string;
  };
  motion: {
    targets: string;
    timelines: string;
    states?: string;
    idleCss?: string;
  };
  accessibility?: {
    title?: string;
    description?: string;
    decorative?: boolean;
  };
  reducedMotion?: {
    strategy: "static" | "fade" | "shorten" | "none";
    fallbackState?: string;
  };
};

export type MsvgTarget =
  | string
  | {
      selector: string;
      expect?: "one" | "many";
    };

export type MsvgTargets = Record<string, MsvgTarget>;

export type MsvgTimelines = Record<string, MsvgClip[]>;

export type MsvgClip = {
  target: string;
  at: number;
  keyframes: Keyframe[];
  options: {
    duration: number;
    easing?: string;
    delay?: number;
    fill?: FillMode;
    iterations?: number; // finite only; see Section 16.1
    direction?: PlaybackDirection;
  };
};

export type MsvgStateMachine = {
  initial: string;
  states: Record<string, MsvgState>;
};

export type MsvgState = {
  onEnter?: MsvgStateAction;
  /** Reserved for a future version. Ignored by the v1 runtime. */
  onExit?: MsvgStateAction;
  on?: Record<string, string>;
  /** Marks an intentional dead-end state (Section 11.2). */
  final?: boolean;
};

export type MsvgStateAction = {
  timeline?: string;
  loop?: boolean;
};

export type MsvgPresetContext = {
  root: Element;
  getTarget: (name: string) => Element | null;
  getTargets: (name: string) => Element[];
};

export type MsvgPreset = (context: MsvgPresetContext) => Animation | null;

/**
 * A single validation finding. `severity: "error"` marks a package invalid;
 * `"warning"` is advisory. `code` is a stable kebab-case identifier, `path`
 * is a dotted/bracketed location (e.g. `timelines.intro[0].target`).
 */
export type MsvgValidationIssue = {
  severity: "error" | "warning";
  code: string;
  path: string;
  message: string;
  suggestion?: string;
};

/** Aggregate result of validating a package: `valid` is true iff no errors. */
export type MsvgValidationResult = {
  valid: boolean;
  issues: MsvgValidationIssue[];
};

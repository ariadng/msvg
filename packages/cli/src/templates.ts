/**
 * Embedded file templates for `msvg create` (Spec Sections 12, 14, 21, 26, 34).
 *
 * Every scaffolded file is produced from these constants — there are no template
 * files on disk. Contents are adapted from the Section 34 complete example, with
 * the animation id/name substituted in. A freshly created package passes
 * `msvg validate` with no errors.
 */

/** Convert a kebab-case id to a Title Case display name. */
export function titleize(name: string): string {
  return name
    .split("-")
    .filter((w) => w.length > 0)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

function configJson(name: string, title: string): string {
  return `${JSON.stringify(
    {
      schemaVersion: "1.0",
      id: name,
      name: title,
      version: "0.1.0",
      description: `Animated SVG for ${title}.`,
      asset: {
        svg: "./assets/main.svg",
        preview: "./assets/preview.png",
      },
      motion: {
        targets: "./motion/targets.json",
        timelines: "./motion/timelines.json",
        states: "./motion/states.json",
        idleCss: "./motion/idle.css",
      },
      accessibility: {
        title,
        description: `Animated ${title} illustration.`,
        decorative: false,
      },
      reducedMotion: {
        strategy: "static",
        fallbackState: "idle",
      },
    },
    null,
    2,
  )}\n`;
}

function targetsJson(name: string): string {
  return `${JSON.stringify(
    {
      root: `[data-animation='${name}']`,
      body: "[data-part='body']",
      eyes: "[data-part='eyes']",
      leftArm: "[data-part='arm-left']",
      sparkles: "[data-part='sparkles']",
      loader: "[data-part='loader']",
    },
    null,
    2,
  )}\n`;
}

function timelinesJson(): string {
  return `${JSON.stringify(
    {
      intro: [
        {
          target: "body",
          at: 0,
          keyframes: [
            { opacity: 0, transform: "translateY(12px) scale(0.96)" },
            { opacity: 1, transform: "translateY(0) scale(1)" },
          ],
          options: { duration: 500, easing: "standard", fill: "both" },
        },
        {
          target: "sparkles",
          at: 300,
          keyframes: [
            { opacity: 0, transform: "scale(0.6)" },
            { opacity: 1, transform: "scale(1)" },
          ],
          options: { duration: 350, easing: "soft", fill: "both" },
        },
      ],
      hover: [
        {
          target: "body",
          at: 0,
          keyframes: [{ transform: "scale(1)" }, { transform: "scale(1.03)" }],
          options: { duration: 200, easing: "soft", fill: "both" },
        },
      ],
      loadingLoop: [
        {
          target: "loader",
          at: 0,
          keyframes: [
            { transform: "rotate(0deg)" },
            { transform: "rotate(360deg)" },
          ],
          options: { duration: 1200, easing: "linear", fill: "both" },
        },
      ],
      success: [
        {
          target: "sparkles",
          at: 0,
          keyframes: [
            { opacity: 0, transform: "scale(0.4)" },
            { opacity: 1, transform: "scale(1.1)" },
            { opacity: 1, transform: "scale(1)" },
          ],
          options: { duration: 500, easing: "soft", fill: "both" },
        },
      ],
      error: [
        {
          target: "body",
          at: 0,
          keyframes: [
            { transform: "translateX(0)" },
            { transform: "translateX(-6px)" },
            { transform: "translateX(6px)" },
            { transform: "translateX(0)" },
          ],
          options: { duration: 400, easing: "standard", fill: "both" },
        },
      ],
    },
    null,
    2,
  )}\n`;
}

function statesJson(): string {
  return `${JSON.stringify(
    {
      initial: "idle",
      states: {
        idle: { on: { HOVER: "hovered", LOAD: "loading" } },
        hovered: {
          onEnter: { timeline: "hover" },
          on: { LEAVE: "idle", LOAD: "loading" },
        },
        loading: {
          onEnter: { timeline: "loadingLoop", loop: true },
          on: { RESOLVE: "success", REJECT: "error" },
        },
        success: { onEnter: { timeline: "success" }, on: { RESET: "idle" } },
        error: { onEnter: { timeline: "error" }, on: { RESET: "idle" } },
      },
    },
    null,
    2,
  )}\n`;
}

/** A placeholder SVG authored in its resting state (Section 8.1). */
function mainSvg(name: string): string {
  return `<svg data-animation="${name}" viewBox="0 0 512 512" xmlns="http://www.w3.org/2000/svg" role="img">
  <g data-part="body">
    <rect x="146" y="176" width="220" height="200" rx="36" fill="#6366f1" />
  </g>
  <g data-part="eyes">
    <circle cx="216" cy="262" r="16" fill="#ffffff" />
    <circle cx="296" cy="262" r="16" fill="#ffffff" />
  </g>
  <g data-part="arm-left">
    <rect x="104" y="252" width="52" height="18" rx="9" fill="#4f46e5" />
  </g>
  <g data-part="sparkles">
    <circle cx="392" cy="150" r="9" fill="#fbbf24" />
    <circle cx="150" cy="150" r="6" fill="#fbbf24" />
  </g>
  <g data-part="loader">
    <circle cx="256" cy="412" r="26" fill="none" stroke="#6366f1" stroke-width="6"
      stroke-dasharray="96 68" stroke-linecap="round" />
  </g>
</svg>
`;
}

/** The idle stylesheet (Section 12) — a sparkle loop plus a reduced-motion guard. */
function idleCss(name: string): string {
  return `[data-animation="${name}"] [data-part="sparkles"] {
  animation: ${name}-sparkle 2.8s ease-in-out infinite alternate;
  transform-box: fill-box;
  transform-origin: center;
}

@keyframes ${name}-sparkle {
  from {
    opacity: 0.45;
    transform: scale(0.96);
  }

  to {
    opacity: 1;
    transform: scale(1.04);
  }
}

@media (prefers-reduced-motion: reduce) {
  [data-animation="${name}"] [data-part="sparkles"] {
    animation: none;
  }
}
`;
}

/** The public export module (Section 14). */
function indexTs(name: string): string {
  const camel = name
    .split("-")
    .map((w, i) =>
      i === 0 ? w : w.charAt(0).toUpperCase() + w.slice(1),
    )
    .join("");
  return `import config from "./animation.config.json";
import targets from "./motion/targets.json";
import timelines from "./motion/timelines.json";
import states from "./motion/states.json";
import svgMarkup from "./assets/main.svg?raw";
import "./motion/idle.css";

export const ${camel} = {
  config,
  targets,
  timelines,
  states,
  svgMarkup,
};
`;
}

/** The agent-instructions file (Section 26). */
function agentsMd(name: string): string {
  return `# Agent Instructions for ${name}

You may safely edit:

- motion/timelines.json
- motion/states.json
- motion/targets.json
- motion/idle.css
- animation.config.json

Be careful when editing:

- assets/main.svg

Do not edit:

- index.ts unless exports are broken

Rules:

1. Use only target names defined in motion/targets.json.
2. Do not create random selectors inside timelines.json.
3. Prefer transform and opacity animations.
4. Avoid path morphing unless explicitly requested.
5. Keep product UI timelines under 1200ms.
6. Always preserve accessibility metadata.
7. Always run \`msvg validate\` after editing.
`;
}

function readmeMd(name: string, title: string): string {
  return `# ${title}

A [MotionSVG](https://github.com/) animation package.

## Structure

\`\`\`txt
${name}/
  animation.config.json   # manifest (source of truth)
  index.ts                # human-friendly package export
  AGENTS.md               # editing rules for AI agents

  assets/
    main.svg              # the illustration, authored in its resting state

  motion/
    targets.json          # logical name -> SVG selector
    timelines.json        # named, time-based motion
    states.json           # event-driven state machine
    idle.css              # passive decorative loops
\`\`\`

## Usage

\`\`\`ts
import { createMsvg } from "msvg-core";
import { ${name.replace(/-([a-z])/g, (_, c) => c.toUpperCase())} } from "./${name}";

const controller = createMsvg({
  container: document.querySelector("#slot")!,
  animation: ${name.replace(/-([a-z])/g, (_, c) => c.toUpperCase())},
});

controller.play("intro");
controller.send("LOAD");
\`\`\`

Validate after editing:

\`\`\`bash
msvg validate ${name}
\`\`\`
`;
}

/**
 * Build the full set of files for a new package, keyed by path relative to the
 * package directory.
 */
export function scaffoldFiles(name: string): Record<string, string> {
  const title = titleize(name);
  return {
    "animation.config.json": configJson(name, title),
    "index.ts": indexTs(name),
    "README.md": readmeMd(name, title),
    "AGENTS.md": agentsMd(name),
    "assets/main.svg": mainSvg(name),
    "motion/targets.json": targetsJson(name),
    "motion/timelines.json": timelinesJson(),
    "motion/states.json": statesJson(),
    "motion/idle.css": idleCss(name),
  };
}

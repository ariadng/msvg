# msvg — MotionSVG

A schema-first SVG animation system built on native web primitives (SVG, CSS, the Web Animations API). Every animation is a portable folder-package of JSON motion definitions that **AI agents can safely create, edit, and validate**, and that **human developers consume through a small runtime API**.

```txt
AI agents edit structured animation packages.
Humans consume clean runtime APIs.
The browser runs native SVG animation.
```

No Lottie, no GSAP, no design-tool exports. The full specification lives in [Spec.md](./Spec.md).

## Packages

| Package | Description |
| --- | --- |
| [`msvg-core`](./packages/core) | Runtime: `createMsvg`, timeline playback, state machine, reduced motion, accessibility. No third-party runtime dependencies (only `msvg-schema`). |
| [`msvg-schema`](./packages/schema) | TypeScript types, JSON Schemas, and the validator behind `msvg validate`. Zero dependencies. |
| [`msvg-cli`](./packages/cli) | `msvg create / validate / inspect / check-targets / summarize / preview`. |
| [`msvg-react`](./packages/react) | `<Msvg />` component and `useMsvg()` hook. |
| [`msvg-mcp`](./packages/mcp) | Stdio MCP server (`msvg_*` tools) for Claude Desktop and other MCP clients. |

## Quick start

```bash
npm install msvg-core
```

```ts
import { createMsvg } from "msvg-core";
import { inventoryAgent } from "./animations/inventory-agent";

const controller = createMsvg({
  container: document.querySelector("#slot")!,
  animation: inventoryAgent
});

controller.play("intro");
controller.send("LOAD");
controller.send("RESOLVE");
```

See [examples/inventory-agent](./examples/inventory-agent) for a complete animation package, and the guides in [docs/](./docs):

- [Human guide](./docs/human-guide.md) — installing, mounting, playing timelines, React usage.
- [Agent guide](./docs/agent-guide.md) — the editing workflow and rules for AI agents.
- [Package format](./docs/package-format.md) — every file in an animation package.

## Claude

Author msvg animations from inside [Claude Code](https://claude.com/claude-code) with the plugin:

```text
/plugin marketplace add ariadng/msvg
/plugin install msvg@msvg
```

Adds four skills — `/msvg:create` (scaffold a package), `/msvg:animate` (design meaningful
motion), `/msvg:validate` (run the CLI), `/msvg:preview` (live gallery) — plus the
`msvg:msvg-animator` agent. See [plugin/README.md](./plugin/README.md).

For **Claude Desktop** and other MCP clients, the `msvg-mcp` server exposes the toolchain
as `msvg_*` tools (installable as a one-click `.mcpb` bundle). See
[docs/claude-integrations.md](./docs/claude-integrations.md).

## Development

```bash
npm install        # workspace install
npm run build      # builds schema → core → cli → react
npm test           # vitest, all packages + example
```

Node ≥ 18.17. All packages are ESM-only, strict TypeScript, built with `tsc`.

## License

MIT

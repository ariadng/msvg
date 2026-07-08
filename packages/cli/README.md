# msvg-cli

Command-line tool for [msvg (MotionSVG)](https://github.com/ariadng/msvg) animation packages. The binary is named `msvg`.

## Install

```bash
npm install -g msvg-cli     # global: msvg <command>
npx -p msvg-cli msvg validate path/to/animation   # or one-off via npx
```

## Commands

| Command | What it does |
| --- | --- |
| `msvg create <name>` | Scaffold a new animation package under `animations/<name>/` |
| `msvg validate <path>` | Validate a package against the schema and its SVG (`--json` for raw issues) |
| `msvg inspect <path>` | Human-readable overview: targets, timelines, states |
| `msvg check-targets <path>` | Resolve every target selector against `assets/main.svg` |
| `msvg summarize <path>` | AI-friendly Markdown summary of the package |
| `msvg preview <path>` | Local preview server with a control panel (`--port`, `--host`) |

## As a library

Every command is also an importable, testable function returning `{ exitCode, output }`:

```ts
import { runValidate, runSummarize, createPreviewServer } from "msvg-cli";

const result = runValidate("animations/spinner", { json: true });
```

This is what powers [`msvg-mcp`](https://www.npmjs.com/package/msvg-mcp) (the MCP server for Claude Desktop and other MCP clients).

## More

- [Agent guide](https://github.com/ariadng/msvg/blob/main/docs/agent-guide.md) — the edit → validate → inspect workflow
- [Spec](https://github.com/ariadng/msvg/blob/main/Spec.md) §20–25 — CLI reference

MIT © ariadng

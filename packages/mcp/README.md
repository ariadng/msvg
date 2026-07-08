# msvg-mcp

A [Model Context Protocol](https://modelcontextprotocol.io) server for the
**MotionSVG (msvg)** toolchain. It exposes msvg's create/validate/inspect/preview
workflow — plus an SVG subpath splitter — as MCP tools, so any MCP client
(Claude Desktop, Claude Code, or a generic client) can author and check msvg
animation packages.

It is a thin, stdio MCP wrapper around the tested [`msvg-cli`](../cli) library
functions, so it stays in lock-step with the CLI's behavior.

## Tools

All directory arguments must be **absolute paths**. Tools return
`isError: true` results (never thrown crashes) on operational failure.

| Tool | When to use |
| --- | --- |
| `msvg_create` | Start a new animation. Scaffolds a valid package at `animations/<name>/` under an absolute `parentDir`. `name` must be kebab-case. |
| `msvg_validate` | After editing a package. Validates against the schema + SVG. Returns `{ valid, errorCount, warningCount, issues }`. |
| `msvg_inspect` | Understand an existing package: assets, target→selector table, timelines (clip counts + durations), states. |
| `msvg_check_targets` | Fast check right after editing `motion/targets.json` or the SVG — resolves every selector against `assets/main.svg`. |
| `msvg_summarize` | An agent's first read: AI-friendly Markdown of safe-to-edit files, available names, and validation status. |
| `msvg_preview_start` | Visually review an animation. Starts a `127.0.0.1` preview server (default port 4321, auto-increments if busy); returns the URL. |
| `msvg_preview_stop` | Stop one preview by `port`, or all running previews (`all: true`, or omit `port`). |
| `msvg_split_subpaths` | Prepare an SVG for per-part animation. Splits a path `d` (or an .svg file's first path) into absolutized subpaths `[{ start:[x,y], d }]`. |

### Hole warning for `msvg_split_subpaths`

A subpath drawn counter-directionally inside another acts as a **hole** via the
fill rule and must stay in the **same** `<path>` as its outer shape, or the hole
fills solid. This tool does **not** recombine holes — concatenate a hole's `d`
onto its outer shape's `d` (outer first). Use each subpath's `start` to detect
nesting: a `start` inside another subpath's bounds is almost always its hole.

## Install in Claude Desktop (.mcpb, double-click)

1. Build the bundle (see below) or download `msvg-0.1.0.mcpb`.
2. Double-click the `.mcpb` file, or drag it into Claude Desktop's
   **Settings → Extensions**.
3. Enable the extension. The eight `msvg_*` tools become available in chats.

Claude Desktop runs the bundled server with its own Node runtime; the bundle
vendors all dependencies, so nothing else needs to be installed.

## Use from a generic MCP client

Once published to npm, configure the server to run via `npx`:

```json
{
  "mcpServers": {
    "msvg": {
      "command": "npx",
      "args": ["-y", "msvg-mcp"]
    }
  }
}
```

Or, from a local checkout, point at the built binary:

```json
{
  "mcpServers": {
    "msvg": {
      "command": "node",
      "args": ["/absolute/path/to/msvg/packages/mcp/bin/msvg-mcp.js"]
    }
  }
}
```

For the Claude Code plugin (skills + agent) and a fuller integration guide, see
[`docs/claude-integrations.md`](../../docs/claude-integrations.md).

## Build from source

From the monorepo root:

```bash
npm install
npm run build -w msvg-mcp        # compile TypeScript to dist/
npx vitest run packages/mcp      # run the test suite
```

Build the Claude Desktop bundle:

```bash
npm run build:mcpb -w msvg-mcp   # → packages/mcp/dist-mcpb/msvg-0.1.0.mcpb
```

`build:mcpb` packs `msvg-mcp`, installs the tarball in a clean directory so its
dependencies resolve from the public npm registry (proving the published
packages are self-sufficient), lays out the bundle per the MCPB spec, and
validates + packs it with `@anthropic-ai/mcpb`. Requires network access; the icon
is rendered from `mcpb/icon.svg` via `qlmanage` on macOS (shipped as
`mcpb/icon.png` otherwise).

## License

MIT © ariadng

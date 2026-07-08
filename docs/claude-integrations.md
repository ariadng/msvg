# Claude integrations

msvg plugs into Claude through two surfaces, for two different Claude products, plus any
generic MCP client:

- **Claude Code** — the [msvg plugin](../plugin/README.md): authoring **skills** and an
  **agent**. This is *knowledge* — the house rules for designing motion.
- **Claude Desktop** — the `msvg-mcp` server shipped as an **`.mcpb` bundle**: a set of
  **tools**. This is *capability* — running the validator, preview, and splitter.
- **Any MCP client** (Claude Code's `.mcp.json`, other editors) — the same `msvg-mcp`
  server over stdio.

## Plugin vs. MCP — what lives where

They are not redundant; they carry different things.

| | Claude Code plugin | `msvg-mcp` (MCPB / MCP) |
| --- | --- | --- |
| Ships | Skills + the `msvg-animator` agent | Callable tools |
| Nature | Knowledge — *how to design meaningful, seamless, bounds-safe motion* | Capability — *run the toolchain* |
| Authoring rules (`/msvg:animate`) | Yes — this is the whole point | No (an MCP client's own model supplies the authoring judgment) |
| Validate / preview / split subpaths | Yes — the skills shell out to the `msvg` CLI | Yes — exposed as `msvg_*` tools |
| Runs in | Claude Code only | Claude Desktop and any MCP client |

The authoring intelligence (what a motion should *mean*, seamless-loop discipline, the
viewBox-bounds math) lives in the plugin's `/msvg:animate` skill and the `msvg-animator`
agent, because that is guidance for the model, not a function to call. The mechanical
operations — validate, inspect, summarize, preview, split subpaths — live in **both**:
the plugin's skills invoke them through the CLI, and Claude Desktop invokes them through
the MCP tools. So a Claude Desktop user gets the toolchain but not the skill prose; pair
the `.mcpb` with the [agent guide](./agent-guide.md) for the workflow.

---

## 1. Claude Code plugin

Install from the in-repo marketplace:

```text
/plugin marketplace add ariadng/msvg
/plugin install msvg@msvg
```

Reload if the commands don't appear (`/reload-plugins`); the `/msvg:*` skills then show
up in `/help`.

**Skills** (invoke with `/msvg:<name>`, or let Claude trigger them by context):

| Skill | What it's for |
| --- | --- |
| `/msvg:create` | Scaffold a new, valid package (all files + the canonical loading state machine), then validate it. |
| `/msvg:animate` | Design meaningful motion for an existing icon — decide what it *means*, split parts, author expressive keyframes, keep loops seamless and in-bounds. |
| `/msvg:validate` | Run the `msvg` CLI against one package or a whole tree and map every error/warning to a fix. |
| `/msvg:preview` | Serve a live browser gallery of every package under a directory, each looping its state machine. |

**Agent** — `msvg:msvg-animator`: a subagent specialized in end-to-end MotionSVG
authoring. Mention it with `@msvg:msvg-animator`, or let Claude delegate icon-animation
work to it. It applies the same house rules and finishes by validating.

**Local development** — to iterate on the plugin from a checkout without publishing to the
marketplace, launch Claude Code pointed at the plugin directory:

```bash
claude --plugin-dir ./plugin
```

Full details in [plugin/README.md](../plugin/README.md).

---

## 2. Claude Desktop (`.mcpb` bundle)

Claude Desktop loads MCP servers as **MCPB bundles** — an MCP server packaged in a zip
with a `manifest.json` that declares how to launch it and what tools it provides. A single
`.mcpb` file installs the whole server with no terminal, no `npm install`, and no JSON
editing by the user.

### Build the bundle

The `.mcpb` is produced from the `msvg-mcp` workspace package and is **not** committed to
the repo (the build output is gitignored). Build it on demand:

```bash
npm install                       # once, at the repo root
npm run build:mcpb -w msvg-mcp    # → packages/mcp/dist-mcpb/msvg-0.1.0.mcpb
```

Under the hood the build script packs the server with the MCPB CLI (`npx -y
@anthropic-ai/mcpb`); you don't need to install that globally.

### Install it

- **Double-click** `packages/mcp/dist-mcpb/msvg-0.1.0.mcpb` — Claude Desktop opens the
  install prompt, or
- In Claude Desktop: **Settings → Extensions**, then add the `.mcpb` file.

Once installed, the eight `msvg_*` tools are available to Claude in Desktop chats.

### Tools

All eight are stdio MCP tools backed by the same code as the `msvg` CLI (plus the subpath
splitter from the plugin):

| Tool | What it does |
| --- | --- |
| `msvg_create` | Scaffold a new animation package under `animations/<name>/`. |
| `msvg_validate` | Validate a package against the schema and its SVG (structured issue list available). |
| `msvg_inspect` | Human-readable overview of a package's structure. |
| `msvg_check_targets` | Resolve every target selector against `assets/main.svg`. |
| `msvg_summarize` | AI-friendly Markdown summary (safe files, targets, timelines, states, validation status). |
| `msvg_preview_start` | Start the local preview server for a package/tree. |
| `msvg_preview_stop` | Stop a running preview server. |
| `msvg_split_subpaths` | Split an SVG path `d` into subpaths with absolutized starts (holes/counter-wound subpaths must be recombined by the caller). |

---

## 3. Any MCP client

`msvg-mcp` is a plain stdio MCP server, so any MCP-capable client can run it. In Claude
Code, add it to the project's `.mcp.json`:

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

The same `command`/`args` shape works in other MCP clients that accept a stdio server
command.

> **Note.** The `npx -y msvg-mcp` form requires `msvg-mcp` to be published to npm. Until
> it is, run the server directly from a checkout:
>
> ```json
> {
>   "mcpServers": {
>     "msvg": {
>       "command": "node",
>       "args": ["packages/mcp/bin/msvg-mcp.js"]
>     }
>   }
> }
> ```
>
> (Run `npm install && npm run build -w msvg-mcp` first so the server's `dist/` exists.)

The tools are identical to the eight listed above; only the transport differs from the
`.mcpb` install.

---

## See also

- [Agent guide](./agent-guide.md) — the edit → validate → inspect workflow, available as
  both CLI commands and `msvg_*` MCP tools.
- [plugin/README.md](../plugin/README.md) — the Claude Code plugin in depth.
- [Spec.md](../Spec.md) — the normative specification.

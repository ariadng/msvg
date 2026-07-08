/**
 * msvg-mcp — a stdio Model Context Protocol server for the MotionSVG toolchain.
 *
 * `main()` builds the server (see `./server.ts`) and connects it to a
 * `StdioServerTransport`, so it can be launched by any MCP client (Claude
 * Desktop via the .mcpb bundle, Claude Code, or a generic client configured
 * with `{ "command": "npx", "args": ["-y", "msvg-mcp"] }`). The tool
 * implementations are also exported for embedding and testing.
 */

import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { createMsvgServer, MSVG_MCP_VERSION } from "./server.js";

export { createMsvgServer, MSVG_MCP_VERSION } from "./server.js";
export { splitSubpaths, firstPathData } from "./subpaths.js";
export type { Subpath } from "./subpaths.js";

/** Start the stdio MCP server and keep it running until the transport closes. */
export async function main(): Promise<void> {
  const { server, closeAllPreviews } = createMsvgServer();
  const transport = new StdioServerTransport();

  const shutdown = async (): Promise<void> => {
    try {
      await closeAllPreviews();
    } finally {
      await server.close().catch(() => {});
    }
  };

  // Close any running preview servers on interrupt so no ports leak.
  process.on("SIGINT", () => void shutdown().then(() => process.exit(0)));
  process.on("SIGTERM", () => void shutdown().then(() => process.exit(0)));
  transport.onclose = () => void closeAllPreviews();

  await server.connect(transport);
  // Announce readiness on stderr (stdout is reserved for the JSON-RPC stream).
  process.stderr.write(`msvg-mcp ${MSVG_MCP_VERSION} listening on stdio\n`);
}

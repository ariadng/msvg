/**
 * Shared test helpers: an in-memory client/server pair, tool-call helpers, and
 * fixture/repo path resolution. Not a `*.test.ts` file, so vitest never runs it
 * as a suite.
 *
 * As in the CLI tests, happy-dom installs its own global `URL` that does not
 * round-trip `file:` URLs, so we use Node's `URL` from `node:url` explicitly.
 */
import { fileURLToPath, URL as NodeURL } from "node:url";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import type { CallToolResult } from "@modelcontextprotocol/sdk/types.js";
import { createMsvgServer } from "../src/index.js";

/** Absolute path to a fixture under `tests/fixtures/`. */
export function fixture(name: string): string {
  return fileURLToPath(new NodeURL(`./fixtures/${name}`, import.meta.url));
}

/** Absolute path to a file relative to the monorepo root. */
export function repoPath(relative: string): string {
  return fileURLToPath(new NodeURL(`../../../${relative}`, import.meta.url));
}

export interface Harness {
  client: Client;
  closeAllPreviews: () => Promise<void>;
  close: () => Promise<void>;
}

/** Spin up an in-memory client connected to a fresh msvg MCP server. */
export async function connect(): Promise<Harness> {
  const { server, closeAllPreviews } = createMsvgServer();
  const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
  const client = new Client({ name: "msvg-mcp-test", version: "0.0.0" });
  await Promise.all([
    server.connect(serverTransport),
    client.connect(clientTransport),
  ]);
  return {
    client,
    closeAllPreviews,
    close: async () => {
      await closeAllPreviews();
      await client.close();
      await server.close();
    },
  };
}

/** Call a tool and return its typed result. */
export async function call(
  client: Client,
  name: string,
  args: Record<string, unknown>,
): Promise<CallToolResult> {
  return (await client.callTool({ name, arguments: args })) as CallToolResult;
}

/** Extract the first text content block from a tool result. */
export function textOf(result: CallToolResult): string {
  const first = result.content?.[0];
  if (first && first.type === "text") return first.text;
  return "";
}

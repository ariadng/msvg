#!/usr/bin/env node
import { main } from "../dist/index.js";

main().catch((err) => {
  process.stderr.write(`msvg-mcp fatal: ${err?.stack ?? err}\n`);
  process.exit(1);
});

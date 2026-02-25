#!/usr/bin/env node

import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { createCodexServer } from "./codex-server.js";

async function main() {
  const server = createCodexServer();
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("codex-mcp started on stdio");
}

main().catch((error) => {
  console.error("fatal error", error);
  process.exit(1);
});

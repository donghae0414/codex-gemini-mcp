#!/usr/bin/env node

import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { createGeminiServer } from "./gemini-server.js";

async function main() {
  const server = createGeminiServer();
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("gemini-mcp started on stdio");
}

main().catch((error) => {
  console.error("fatal error", error);
  process.exit(1);
});

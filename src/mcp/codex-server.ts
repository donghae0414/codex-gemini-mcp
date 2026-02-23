import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { askCodex } from "../providers/codex.js";
import { AskSchema } from "../tools/schema.js";

export function createCodexServer(): McpServer {
  const server = new McpServer({
    name: "codex-mcp",
    version: "0.1.0",
  });

  server.registerTool(
    "ask_codex",
    {
      description: "Send a prompt to local Codex CLI and return its output.",
      inputSchema: AskSchema.shape,
    },
    async (input) => {
      try {
        const output = await askCodex(input);
        return { content: [{ type: "text", text: output }] };
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        return { isError: true, content: [{ type: "text", text: message }] };
      }
    },
  );

  return server;
}

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { askGemini } from "../providers/gemini.js";
import { AskSchema } from "../tools/schema.js";

export function createGeminiServer(): McpServer {
  const server = new McpServer({
    name: "gemini-mcp",
    version: "0.1.0",
  });

  server.registerTool(
    "ask_gemini",
    {
      description: "Send a prompt to local Gemini CLI and return its output.",
      inputSchema: AskSchema.shape,
    },
    async (input) => {
      try {
        const output = await askGemini(input);
        return { content: [{ type: "text", text: output }] };
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        return { isError: true, content: [{ type: "text", text: message }] };
      }
    },
  );

  return server;
}

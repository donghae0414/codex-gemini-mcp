import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { askCodex } from "./providers/codex.js";
import { askGemini } from "./providers/gemini.js";
import { AskSchema } from "./tools/schema.js";

const server = new McpServer({
  name: "codex-gemini-mcp",
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

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("codex-gemini-mcp started on stdio");
}

main().catch((error) => {
  console.error("fatal error", error);
  process.exit(1);
});

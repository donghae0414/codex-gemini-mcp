import { spawn } from "node:child_process";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";

const server = new McpServer({
  name: "codex-gemini-mcp",
  version: "0.1.0",
});

const AskSchema = z.object({
  prompt: z.string().min(1),
  model: z.string().min(1).optional(),
  timeout_ms: z.number().int().positive().max(600000).optional(),
  working_directory: z.string().min(1).optional(),
});

type AskInput = z.infer<typeof AskSchema>;

server.tool(
  "ask_codex",
  "Send a prompt to local Codex CLI and return its output.",
  AskSchema.shape,
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

server.tool(
  "ask_gemini",
  "Send a prompt to local Gemini CLI and return its output.",
  AskSchema.shape,
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

function askCodex(input: AskInput): Promise<string> {
  const args = ["exec", "--ephemeral"];
  if (input.model) {
    args.push("--model", input.model);
  }
  args.push(input.prompt);
  return runCli("codex", args, input.timeout_ms, input.working_directory);
}

function askGemini(input: AskInput): Promise<string> {
  const args = [input.prompt, "--quiet"];
  if (input.model) {
    args.push("--model", input.model);
  }
  return runCli("gemini", args, input.timeout_ms, input.working_directory);
}

function runCli(
  command: string,
  args: string[],
  timeoutMs = 120000,
  cwd?: string,
): Promise<string> {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      stdio: ["ignore", "pipe", "pipe"],
      cwd,
      env: {
        ...process.env,
        NO_COLOR: "1",
        FORCE_COLOR: "0",
        TERM: "dumb",
      },
    });

    let stdout = "";
    let stderr = "";

    const timer = setTimeout(() => {
      child.kill("SIGTERM");
      reject(new Error(`${command} timed out after ${timeoutMs}ms`));
    }, timeoutMs);

    child.stdout.on("data", (chunk: Buffer) => {
      stdout += chunk.toString();
    });

    child.stderr.on("data", (chunk: Buffer) => {
      stderr += chunk.toString();
    });

    child.on("error", (error) => {
      clearTimeout(timer);
      reject(new Error(`${command} failed to start: ${error.message}`));
    });

    child.on("close", (code) => {
      clearTimeout(timer);
      if (code === 0) {
        resolve(stdout.trim() || "(empty response)");
        return;
      }
      reject(
        new Error(
          `${command} exited with code ${code}: ${stderr.trim() || "no stderr"}`,
        ),
      );
    });
  });
}

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("codex-gemini-mcp started on stdio");
}

main().catch((error) => {
  console.error("fatal error", error);
  process.exit(1);
});

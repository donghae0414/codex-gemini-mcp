import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import {
  checkJobStatus,
  killJob,
  listJobs,
  waitForJob,
} from "../job-management.js";
import { handleAskGemini } from "../tools/gemini-handlers.js";
import {
  AskGeminiSchema,
  CheckJobStatusSchema,
  KillJobSchema,
  ListJobsSchema,
  WaitForJobSchema,
} from "../tools/schema.js";

export function createGeminiServer(): McpServer {
  const server = new McpServer({
    name: "gemini-mcp",
    version: "0.1.0",
  });

  server.registerTool(
    "ask_gemini",
    {
      description: "Send a prompt to local Gemini CLI and return its output.",
      inputSchema: AskGeminiSchema.shape,
    },
    async (input) => {
      try {
        const output = await handleAskGemini(input);
        return { content: [{ type: "text", text: output }] };
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        return { isError: true, content: [{ type: "text", text: message }] };
      }
    },
  );

  server.registerTool(
    "wait_for_job",
    {
      description: "Block until a background job reaches terminal state.",
      inputSchema: WaitForJobSchema.shape,
    },
    async (input) => {
      try {
        const result = await waitForJob({
          provider: "gemini",
          jobId: input.job_id,
          timeoutMs: input.timeout_ms,
        });
        if (result.status.status === "completed") {
          return {
            content: [{ type: "text", text: result.responseText ?? "(empty response)" }],
          };
        }
        return {
          isError: true,
          content: [{ type: "text", text: JSON.stringify(result.status) }],
        };
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        return { isError: true, content: [{ type: "text", text: message }] };
      }
    },
  );

  server.registerTool(
    "check_job_status",
    {
      description: "Get current metadata/status of a background job.",
      inputSchema: CheckJobStatusSchema.shape,
    },
    async (input) => {
      try {
        const status = await checkJobStatus("gemini", input.job_id);
        return { content: [{ type: "text", text: JSON.stringify(status) }] };
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        return { isError: true, content: [{ type: "text", text: message }] };
      }
    },
  );

  server.registerTool(
    "kill_job",
    {
      description: "Send a signal to a running background job.",
      inputSchema: KillJobSchema.shape,
    },
    async (input) => {
      try {
        const status = await killJob({
          provider: "gemini",
          jobId: input.job_id,
          signal: input.signal,
        });
        return { content: [{ type: "text", text: JSON.stringify(status) }] };
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        return { isError: true, content: [{ type: "text", text: message }] };
      }
    },
  );

  server.registerTool(
    "list_jobs",
    {
      description: "List background jobs filtered by status.",
      inputSchema: ListJobsSchema.shape,
    },
    async (input) => {
      try {
        const jobs = await listJobs({
          provider: "gemini",
          statusFilter: input.status_filter,
          limit: input.limit,
        });
        return { content: [{ type: "text", text: JSON.stringify(jobs) }] };
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        return { isError: true, content: [{ type: "text", text: message }] };
      }
    },
  );

  return server;
}

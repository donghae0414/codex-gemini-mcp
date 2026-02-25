import { z } from "zod";

const BaseAskSchema = z.object({
  prompt: z.string().min(1).describe("Prompt text to send to the CLI. Must be a non-empty string."),
  model: z
    .string()
    .trim()
    .min(1)
    .max(128)
    .regex(/^[A-Za-z0-9][A-Za-z0-9._:-]*$/)
    .optional()
    .describe(
      "Optional model override. Must match /^[A-Za-z0-9][A-Za-z0-9._:-]*$/ and be <= 128 chars.",
    ),
  working_directory: z
    .string()
    .min(1)
    .optional()
    .describe("Optional working directory for CLI execution. Defaults to process.cwd()."),
  background: z
    .boolean()
    .optional()
    .describe("Run as background job (default true; recommended for long-running tasks)"),
});

export const AskCodexSchema = BaseAskSchema.extend({
  reasoning_effort: z
    .enum(["minimal", "low", "medium", "high", "xhigh"])
    .optional()
    .describe(
      "Codex reasoning effort: minimal|low|medium|high|xhigh. If omitted, Codex CLI default is used.",
    ),
});

export const AskGeminiSchema = BaseAskSchema;

const JobIdSchema = z
  .string()
  .regex(/^[0-9a-f]{8}$/)
  .describe("Background job ID (8-char lowercase hex) returned by ask_* with background=true.");

export const WaitForJobSchema = z.object({
  job_id: JobIdSchema,
  timeout_ms: z
    .number()
    .int()
    .positive()
    .max(3600000)
    .optional()
    .describe("Optional wait timeout in milliseconds (max 3600000)."),
});

export const CheckJobStatusSchema = z.object({
  job_id: JobIdSchema,
});

export const KillJobSchema = z.object({
  job_id: JobIdSchema,
  signal: z
    .enum(["SIGTERM", "SIGINT"])
    .optional()
    .describe("Signal sent to running job. Defaults to SIGTERM."),
});

export const ListJobsSchema = z.object({
  status_filter: z
    .enum(["active", "completed", "failed", "all"])
    .optional()
    .describe("Filter jobs by status. Defaults to active."),
  limit: z.number().int().positive().optional().describe("Maximum number of jobs to return. Defaults to 50."),
});

export const AskSchema = AskCodexSchema;

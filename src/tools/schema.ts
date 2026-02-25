import { z } from "zod";

const BaseAskSchema = z.object({
  prompt: z.string().min(1),
  model: z
    .string()
    .trim()
    .min(1)
    .max(128)
    .regex(/^[A-Za-z0-9][A-Za-z0-9._:-]*$/)
    .optional(),
  working_directory: z.string().min(1).optional(),
  background: z
    .boolean()
    .optional()
    .describe("Run as background job (default true; recommended for long-running tasks)"),
});

export const AskCodexSchema = BaseAskSchema.extend({
  reasoning_effort: z.enum(["minimal", "low", "medium", "high", "xhigh"]).optional(),
});

export const AskGeminiSchema = BaseAskSchema;

const JobIdSchema = z.string().regex(/^[0-9a-f]{8}$/);

export const WaitForJobSchema = z.object({
  job_id: JobIdSchema,
  timeout_ms: z.number().int().positive().max(3600000).optional(),
});

export const CheckJobStatusSchema = z.object({
  job_id: JobIdSchema,
});

export const KillJobSchema = z.object({
  job_id: JobIdSchema,
  signal: z.enum(["SIGTERM", "SIGINT"]).optional(),
});

export const ListJobsSchema = z.object({
  status_filter: z.enum(["active", "completed", "failed", "all"]).optional(),
  limit: z.number().int().positive().optional(),
});

export const AskSchema = AskCodexSchema;

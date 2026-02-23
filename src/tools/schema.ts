import { z } from "zod";

const BaseAskSchema = z.object({
  prompt: z.string().min(1),
  model: z.string().min(1).optional(),
  timeout_ms: z
    .number()
    .int()
    .positive()
    .optional()
    .describe("CLI timeout in milliseconds (default 600000; >=300000 recommended)"),
  working_directory: z.string().min(1).optional(),
  background: z.boolean().optional(),
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

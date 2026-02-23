import { z } from "zod";

export const AskSchema = z.object({
  prompt: z.string().min(1),
  model: z.string().min(1).optional(),
  timeout_ms: z.number().int().positive().max(600000).optional(),
  working_directory: z.string().min(1).optional(),
});

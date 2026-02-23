import { z } from "zod";

export const AskSchema = z.object({
  prompt: z.string().min(1),
  model: z.string().min(1).optional(),
  timeout_ms: z
    .number()
    .int()
    .positive()
    .optional()
    .describe("CLI timeout in milliseconds (default 600000; >=300000 recommended)"),
  working_directory: z.string().min(1).optional(),
});

import { runCli } from "../runtime/run-cli.js";
import type { AskInput } from "../types.js";

export function askGemini(input: AskInput): Promise<string> {
  const args = ["--prompt", input.prompt];
  if (input.model) {
    args.push("--model", input.model);
  }
  return runCli("gemini", args, input.timeout_ms, input.working_directory);
}

import { runCli } from "../runtime/run-cli.js";
import type { AskInput } from "../types.js";

export function askCodex(input: AskInput): Promise<string> {
  const args = ["exec", "--ephemeral"];
  if (input.model) {
    args.push("--model", input.model);
  }
  args.push(input.prompt);
  return runCli("codex", args, input.timeout_ms, input.working_directory);
}

import { resolveModel } from "../config.js";
import { runCli } from "../runtime/run-cli.js";
import type { AskInput } from "../types.js";

export function askCodex(input: AskInput): Promise<string> {
  const args = ["exec", "--ephemeral"];
  args.push("--model", resolveModel("codex", input.model));
  args.push(input.prompt);
  return runCli("codex", args, input.timeout_ms, input.working_directory);
}

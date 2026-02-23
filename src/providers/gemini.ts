import { resolveModel } from "../config.js";
import { runCli } from "../runtime/run-cli.js";
import type { AskGeminiInput } from "../types.js";

export function buildGeminiCommand(input: AskGeminiInput): {
  command: "gemini";
  args: string[];
  model: string;
} {
  const model = resolveModel("gemini", input.model);
  const args = ["--prompt", input.prompt];
  args.push("--model", model);
  return {
    command: "gemini",
    args,
    model,
  };
}

export function askGemini(input: AskGeminiInput): Promise<string> {
  const command = buildGeminiCommand(input);
  return runCli(
    command.command,
    command.args,
    input.timeout_ms,
    input.working_directory,
  );
}

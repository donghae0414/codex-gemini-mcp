import { resolveModel } from "../config.js";
import { runCli } from "../runtime/run-cli.js";
import type { AskCodexInput } from "../types.js";

export function buildCodexCommand(input: AskCodexInput): {
  command: "codex";
  args: string[];
  model: string;
} {
  const model = resolveModel("codex", input.model);
  const args = ["exec", "--ephemeral"];
  args.push("--model", model);
  if (input.reasoning_effort) {
    args.push("-c", `model_reasoning_effort=${input.reasoning_effort}`);
  }
  args.push(input.prompt);
  return {
    command: "codex",
    args,
    model,
  };
}

export function askCodex(input: AskCodexInput): Promise<string> {
  const command = buildCodexCommand(input);
  return runCli(
    command.command,
    command.args,
    undefined,
    input.working_directory,
  );
}

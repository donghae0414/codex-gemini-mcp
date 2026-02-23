import { getDefaultTimeoutMs } from "../config.js";
import { buildCodexCommand } from "../providers/codex.js";
import { runCli } from "../runtime/run-cli.js";
import { runCliBackground } from "../runtime/run-cli-background.js";
import type { AskCodexInput } from "../types.js";

export async function handleAskCodex(input: AskCodexInput): Promise<string> {
  const command = buildCodexCommand(input);
  if (input.background) {
    const metadata = await runCliBackground({
      provider: "codex",
      command: command.command,
      args: command.args,
      prompt: input.prompt,
      model: command.model,
      timeoutMs: input.timeout_ms ?? getDefaultTimeoutMs(),
      cwd: input.working_directory,
    });
    return JSON.stringify(metadata);
  }

  return runCli(
    command.command,
    command.args,
    input.timeout_ms,
    input.working_directory,
  );
}

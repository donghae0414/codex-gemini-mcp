import { getDefaultTimeoutMs } from "../config.js";
import { buildGeminiCommand } from "../providers/gemini.js";
import { runCli } from "../runtime/run-cli.js";
import { runCliBackground } from "../runtime/run-cli-background.js";
import type { AskGeminiInput } from "../types.js";

export async function handleAskGemini(input: AskGeminiInput): Promise<string> {
  const command = buildGeminiCommand(input);
  if (input.background) {
    const metadata = await runCliBackground({
      provider: "gemini",
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

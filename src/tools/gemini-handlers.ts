import { randomUUID } from "node:crypto";

import { getDefaultTimeoutMs } from "../config.js";
import { logRequest } from "../logger/index.js";
import { buildGeminiCommand } from "../providers/gemini.js";
import { runCli } from "../runtime/run-cli.js";
import { runCliBackground } from "../runtime/run-cli-background.js";
import type { AskGeminiInput, RuntimeLogContext } from "../types.js";

export async function handleAskGemini(input: AskGeminiInput): Promise<string> {
  const timeoutMs = getDefaultTimeoutMs();
  const command = buildGeminiCommand(input);
  const logContext: RuntimeLogContext = {
    requestId: randomUUID(),
    provider: "gemini",
    tool: "ask_gemini",
    model: command.model,
    timeoutMs,
    cwd: input.working_directory,
  };

  logRequest({ context: logContext, prompt: input.prompt });

  if (input.background ?? true) {
    const metadata = await runCliBackground({
      provider: "gemini",
      command: command.command,
      args: command.args,
      prompt: input.prompt,
      model: command.model,
      timeoutMs,
      cwd: input.working_directory,
      logContext,
    });
    return JSON.stringify(metadata);
  }

  return runCli(
    command.command,
    command.args,
    timeoutMs,
    input.working_directory,
    logContext,
  );
}

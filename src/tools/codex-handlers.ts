import { randomUUID } from "node:crypto";

import { getDefaultTimeoutMs } from "../config.js";
import { logRequest } from "../logger/index.js";
import { buildCodexCommand } from "../providers/codex.js";
import { runCli } from "../runtime/run-cli.js";
import { runCliBackground } from "../runtime/run-cli-background.js";
import type { AskCodexInput, RuntimeLogContext } from "../types.js";

const MIN_TIMEOUT_MS = 300000;

function ensureTimeoutMs(timeoutMs: number): void {
  if (timeoutMs >= MIN_TIMEOUT_MS) {
    return;
  }

  throw new Error(
    `timeout_ms must be >= ${MIN_TIMEOUT_MS}. Retry with timeout_ms: ${MIN_TIMEOUT_MS} (recommended: 1800000) and background: true for long-running tasks.`,
  );
}

export async function handleAskCodex(input: AskCodexInput): Promise<string> {
  const timeoutMs = input.timeout_ms ?? getDefaultTimeoutMs();
  ensureTimeoutMs(timeoutMs);
  const command = buildCodexCommand(input);
  const logContext: RuntimeLogContext = {
    requestId: randomUUID(),
    provider: "codex",
    tool: "ask_codex",
    model: command.model,
    timeoutMs,
    cwd: input.working_directory,
  };

  logRequest({ context: logContext, prompt: input.prompt });

  if (input.background ?? true) {
    const metadata = await runCliBackground({
      provider: "codex",
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

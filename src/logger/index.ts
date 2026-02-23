import { getLogDir, getLoggingFlags } from "../config.js";
import type { RuntimeLogContext } from "../types.js";
import type { ErrorLogEvent, LogEvent, RequestLogEvent, ResponseLogEvent } from "./event.js";
import { appendJsonlEvent } from "./file-sink.js";

const PREVIEW_CHARS = 200;

function nowIso(): string {
  return new Date().toISOString();
}

function previewText(value: string): string | undefined {
  const trimmed = value.trim();
  if (!trimmed) {
    return undefined;
  }
  return trimmed.slice(0, PREVIEW_CHARS);
}

function withBase(context: RuntimeLogContext): Omit<RequestLogEvent, "type" | "prompt_chars" | "cwd"> {
  const base: Omit<RequestLogEvent, "type" | "prompt_chars" | "cwd"> = {
    ts: nowIso(),
    request_id: context.requestId,
    provider: context.provider,
    tool: context.tool,
    model: context.model,
    timeout_ms: context.timeoutMs,
  };

  if (context.jobId) {
    base.job_id = context.jobId;
  }

  return base;
}

export async function logEvent(event: LogEvent, cwd?: string): Promise<void> {
  try {
    await appendJsonlEvent(getLogDir(cwd), event);
  } catch (error) {
    console.error("failed to write log event", error);
  }
  console.error(JSON.stringify(event));
}

export function logRequest(params: { context: RuntimeLogContext; prompt: string }): void {
  const flags = getLoggingFlags();
  const event: RequestLogEvent = {
    ...withBase(params.context),
    type: "request",
    prompt_chars: params.prompt.length,
    cwd: params.context.cwd,
  };

  if (flags.fullText) {
    event.prompt_text = params.prompt;
  } else if (flags.preview) {
    event.prompt_preview = previewText(params.prompt);
  }

  void logEvent(event, params.context.cwd);
}

export function logResponse(params: {
  context: RuntimeLogContext;
  durationMs: number;
  exitCode: number;
  stdout: string;
  stderr: string;
  truncated: boolean;
}): void {
  const flags = getLoggingFlags();
  const event: ResponseLogEvent = {
    ...withBase(params.context),
    type: "response",
    duration_ms: params.durationMs,
    exit_code: params.exitCode,
    stdout_bytes: Buffer.byteLength(params.stdout, "utf8"),
    stderr_bytes: Buffer.byteLength(params.stderr, "utf8"),
    truncated: params.truncated,
  };

  if (flags.fullText) {
    event.response_text = params.stdout;
  } else if (flags.preview) {
    event.response_preview = previewText(params.stdout);
  }

  void logEvent(event, params.context.cwd);
}

export function logError(params: {
  context: RuntimeLogContext;
  durationMs: number;
  errorCode: string;
  errorMessage: string;
  stderr?: string;
}): void {
  const flags = getLoggingFlags();
  const event: ErrorLogEvent = {
    ...withBase(params.context),
    type: "error",
    duration_ms: params.durationMs,
    error_code: params.errorCode,
    error_message: params.errorMessage,
  };

  const stderr = params.stderr ?? "";
  if (flags.fullText) {
    event.stderr_text = stderr;
  } else if (flags.preview) {
    event.stderr_preview = previewText(stderr);
  }

  void logEvent(event, params.context.cwd);
}

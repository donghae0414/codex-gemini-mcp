import type { Provider } from "../types.js";

export type LogEventType = "request" | "response" | "error";

interface BaseLogEvent {
  type: LogEventType;
  ts: string;
  request_id: string;
  job_id?: string;
  provider: Provider;
  tool: "ask_codex" | "ask_gemini";
  model: string;
  timeout_ms: number;
}

export interface RequestLogEvent extends BaseLogEvent {
  type: "request";
  prompt_chars: number;
  cwd?: string;
  prompt_preview?: string;
  prompt_text?: string;
}

export interface ResponseLogEvent extends BaseLogEvent {
  type: "response";
  duration_ms: number;
  exit_code: number;
  stdout_bytes: number;
  stderr_bytes: number;
  truncated: boolean;
  response_preview?: string;
  response_text?: string;
}

export interface ErrorLogEvent extends BaseLogEvent {
  type: "error";
  duration_ms: number;
  error_code: string;
  error_message: string;
  stderr_preview?: string;
  stderr_text?: string;
}

export type LogEvent = RequestLogEvent | ResponseLogEvent | ErrorLogEvent;

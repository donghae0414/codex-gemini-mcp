export type Provider = "codex" | "gemini";

export interface BaseAskInput {
  prompt: string;
  model?: string;
  timeout_ms?: number;
  working_directory?: string;
  background?: boolean;
}

export interface AskCodexInput extends BaseAskInput {
  reasoning_effort?: "minimal" | "low" | "medium" | "high" | "xhigh";
}

export type AskGeminiInput = BaseAskInput;

export type AskInput = AskCodexInput;

export type JobState = "spawned" | "running" | "completed" | "failed" | "timeout";

export interface JobStatus {
  provider: Provider;
  jobId: string;
  status: JobState;
  pid?: number;
  promptFile: string;
  responseFile: string;
  model: string;
  spawnedAt: string;
  completedAt?: string;
  error?: string;
  killedByUser?: boolean;
}

export interface BackgroundRunRequest {
  provider: Provider;
  command: string;
  args: string[];
  prompt: string;
  model: string;
  timeoutMs: number;
  cwd?: string;
}

export interface BackgroundRunResult {
  provider: Provider;
  jobId: string;
  status: "spawned";
  promptFile: string;
  responseFile: string;
  statusFile: string;
}

export type JobListStatusFilter = "active" | "completed" | "failed" | "all";

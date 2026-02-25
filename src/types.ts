export type Provider = "codex" | "gemini";

export interface BaseAskInput {
  prompt: string;
  model?: string;
  working_directory?: string;
  background?: boolean;
}

export interface RuntimeLogContext {
  requestId: string;
  jobId?: string;
  provider: Provider;
  tool: "ask_codex" | "ask_gemini";
  model: string;
  timeoutMs: number;
  cwd?: string;
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
  requestId?: string;
  status: JobState;
  pid?: number;
  contentFile: string;
  model: string;
  spawnedAt: string;
  completedAt?: string;
  error?: string;
  killedByUser?: boolean;
}

export interface JobContent {
  provider: Provider;
  jobId: string;
  requestId?: string;
  model: string;
  prompt: string;
  response?: string;
  spawnedAt: string;
  completedAt?: string;
  error?: string;
}

export interface BackgroundRunRequest {
  provider: Provider;
  command: string;
  args: string[];
  prompt: string;
  model: string;
  timeoutMs: number;
  cwd?: string;
  logContext?: RuntimeLogContext;
}

export interface BackgroundRunResult {
  provider: Provider;
  jobId: string;
  status: "spawned";
  contentFile: string;
  statusFile: string;
}

export type JobListStatusFilter = "active" | "completed" | "failed" | "all";

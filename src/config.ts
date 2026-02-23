import path from "node:path";

import type { Provider } from "./types.js";

const HARDCODED_DEFAULTS: Record<Provider, string> = {
  codex: "gpt-5.3-codex",
  gemini: "gemini-3-pro-preview",
};

const DEFAULT_TIMEOUT_MS = 600000;
const DEFAULT_MAX_OUTPUT_BYTES = 1048576;

function readEnvNumber(name: string): number | undefined {
  const raw = process.env[name];
  if (!raw) {
    return undefined;
  }
  const value = Number.parseInt(raw, 10);
  if (!Number.isFinite(value) || value <= 0) {
    return undefined;
  }
  return value;
}

function readEnvFlag(name: string): boolean {
  return process.env[name] === "1";
}

function getBaseDir(cwd?: string): string {
  return path.resolve(cwd ?? process.cwd());
}

export function getDefaultModel(provider: Provider): string {
  const envName =
    provider === "codex"
      ? "MCP_CODEX_DEFAULT_MODEL"
      : "MCP_GEMINI_DEFAULT_MODEL";
  const envModel = process.env[envName]?.trim();
  if (envModel) {
    return envModel;
  }
  return HARDCODED_DEFAULTS[provider];
}

export function resolveModel(provider: Provider, requestedModel?: string): string {
  const requested = requestedModel?.trim();
  if (requested) {
    return requested;
  }
  return getDefaultModel(provider);
}

export function getDefaultTimeoutMs(): number {
  return readEnvNumber("MCP_CLI_TIMEOUT_MS") ?? DEFAULT_TIMEOUT_MS;
}

export function getMaxOutputBytes(): number {
  return readEnvNumber("MCP_MAX_OUTPUT_BYTES") ?? DEFAULT_MAX_OUTPUT_BYTES;
}

export function getLoggingFlags(): { preview: boolean; fullText: boolean } {
  return {
    preview: readEnvFlag("MCP_LOG_PREVIEW"),
    fullText: readEnvFlag("MCP_LOG_FULL_TEXT"),
  };
}

export function getRuntimeDir(cwd?: string): string {
  const configured = process.env.MCP_RUNTIME_DIR?.trim();
  if (configured) {
    return path.resolve(configured);
  }
  return path.join(getBaseDir(cwd), ".codex-gemini-mcp");
}

export function getLogDir(cwd?: string): string {
  const configured = process.env.MCP_LOG_DIR?.trim();
  if (configured) {
    return path.resolve(configured);
  }
  return path.join(getRuntimeDir(cwd), "logs");
}

export function getJobsDir(cwd?: string): string {
  return path.join(getRuntimeDir(cwd), "jobs");
}

export function getPromptsDir(cwd?: string): string {
  return path.join(getRuntimeDir(cwd), "prompts");
}

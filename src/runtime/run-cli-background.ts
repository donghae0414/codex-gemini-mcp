import { spawn } from "node:child_process";

import { getMaxOutputBytes } from "../config.js";
import { logError, logResponse } from "../logger/index.js";
import { createJobFiles, finalizeContentFile, initializeContentFile, writeJobStatus } from "../prompt-store.js";
import type { BackgroundRunRequest, BackgroundRunResult, JobStatus, RuntimeLogContext } from "../types.js";

function nowIso(): string {
  return new Date().toISOString();
}

async function persistStatus(statusFile: string, status: JobStatus): Promise<void> {
  try {
    await writeJobStatus(statusFile, status);
  } catch (error) {
    console.error("failed to persist job status", error);
  }
}

export async function runCliBackground(
  request: BackgroundRunRequest,
): Promise<BackgroundRunResult> {
  const { provider, command, args, prompt, model, timeoutMs, cwd, logContext } = request;
  const { jobId, contentFile, statusFile } = await createJobFiles(
    provider,
    prompt,
    cwd,
  );

  const spawnedAt = nowIso();
  const startedAtMs = Date.now();
  const backgroundLogContext: RuntimeLogContext | undefined = logContext
    ? { ...logContext, jobId }
    : undefined;

  await initializeContentFile(contentFile, {
    provider,
    jobId,
    requestId: logContext?.requestId,
    model,
    prompt,
    spawnedAt,
  });

  const child = spawn(command, args, {
    cwd,
    detached: true,
    stdio: ["ignore", "pipe", "pipe"],
    env: {
      ...process.env,
      NO_COLOR: "1",
      FORCE_COLOR: "0",
      TERM: "dumb",
    },
  });

  const status: JobStatus = {
    provider,
    jobId,
    requestId: logContext?.requestId,
    status: "spawned",
    pid: child.pid,
    contentFile,
    model,
    spawnedAt,
  };
  await persistStatus(statusFile, status);

  status.status = "running";
  await persistStatus(statusFile, status);

  let stdout = "";
  let stderr = "";
  let totalOutputBytes = 0;
  const maxOutputBytes = getMaxOutputBytes();
  const outputLimitMessage = `${command} output exceeded MCP_MAX_OUTPUT_BYTES=${maxOutputBytes} bytes`;
  let terminal = false;

  const appendChunk = (target: "stdout" | "stderr", chunk: Buffer): boolean => {
    const remaining = maxOutputBytes - totalOutputBytes;
    if (remaining <= 0) {
      return true;
    }

    if (chunk.length <= remaining) {
      const text = chunk.toString();
      if (target === "stdout") {
        stdout += text;
      } else {
        stderr += text;
      }
      totalOutputBytes += chunk.length;
      return false;
    }

    const clipped = chunk.subarray(0, remaining).toString();
    if (target === "stdout") {
      stdout += clipped;
    } else {
      stderr += clipped;
    }
    totalOutputBytes += remaining;
    return true;
  };

  const complete = async (
    nextStatus: "completed" | "failed" | "timeout",
    error?: string,
    errorCode?: string,
  ) => {
    if (terminal) {
      return;
    }
    terminal = true;
    clearTimeout(timer);

    const completedAt = nowIso();

    if (nextStatus === "completed") {
      await finalizeContentFile(contentFile, {
        response: stdout.trim() || "(empty response)",
        completedAt,
      });
    } else {
      await finalizeContentFile(contentFile, {
        completedAt,
        error,
      });
    }

    status.status = nextStatus;
    status.completedAt = completedAt;
    if (error) {
      status.error = error;
    }
    await persistStatus(statusFile, status);

    if (backgroundLogContext) {
      const durationMs = Date.now() - startedAtMs;
      if (nextStatus === "completed") {
        logResponse({
          context: backgroundLogContext,
          durationMs,
          exitCode: 0,
          stdout,
          stderr,
          truncated: false,
        });
      } else {
        logError({
          context: backgroundLogContext,
          durationMs,
          errorCode: errorCode ?? "CLI_EXEC_ERROR",
          errorMessage: error ?? `${command} failed`,
          stderr,
        });
      }
    }
  };

  const timer = setTimeout(() => {
    try {
      child.kill("SIGTERM");
    } catch {
    }
    void complete("timeout", `${command} timed out after ${timeoutMs}ms`, "CLI_TIMEOUT");
  }, timeoutMs);

  child.stdout.on("data", (chunk: Buffer) => {
    const exceeded = appendChunk("stdout", chunk);
    if (!exceeded) {
      return;
    }
    try {
      child.kill("SIGTERM");
    } catch {
    }
    void complete("failed", outputLimitMessage, "CLI_OUTPUT_LIMIT_EXCEEDED");
  });

  child.stderr.on("data", (chunk: Buffer) => {
    const exceeded = appendChunk("stderr", chunk);
    if (!exceeded) {
      return;
    }
    try {
      child.kill("SIGTERM");
    } catch {
    }
    void complete("failed", outputLimitMessage, "CLI_OUTPUT_LIMIT_EXCEEDED");
  });

  child.on("error", (error) => {
    const errno = error as NodeJS.ErrnoException;
    const errorCode = errno.code === "ENOENT" ? "CLI_NOT_FOUND" : "CLI_SPAWN_ERROR";
    void complete("failed", `${command} failed to start: ${error.message}`, errorCode);
  });

  child.on("close", (code) => {
    if (code === 0) {
      void complete("completed");
      return;
    }
    void complete(
      "failed",
      `${command} exited with code ${code}: ${stderr.trim() || "no stderr"}`,
      "CLI_NON_ZERO_EXIT",
    );
  });

  child.unref();

  return {
    provider,
    jobId,
    status: "spawned",
    contentFile,
    statusFile,
  };
}

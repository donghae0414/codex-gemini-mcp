import { spawn } from "node:child_process";

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
  let terminal = false;

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
    stdout += chunk.toString();
  });

  child.stderr.on("data", (chunk: Buffer) => {
    stderr += chunk.toString();
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

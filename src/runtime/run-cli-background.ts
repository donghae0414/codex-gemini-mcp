import { spawn } from "node:child_process";

import { createJobFiles, writeJobStatus, writePromptFile, writeResponseFile } from "../prompt-store.js";
import type { BackgroundRunRequest, BackgroundRunResult, JobStatus } from "../types.js";

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
  const { provider, command, args, prompt, model, timeoutMs, cwd } = request;
  const { jobId, promptFile, responseFile, statusFile } = await createJobFiles(
    provider,
    prompt,
    cwd,
  );

  await writePromptFile(promptFile, prompt);

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
    status: "spawned",
    pid: child.pid,
    promptFile,
    responseFile,
    model,
    spawnedAt: nowIso(),
  };
  await persistStatus(statusFile, status);

  status.status = "running";
  await persistStatus(statusFile, status);

  let stdout = "";
  let stderr = "";
  let terminal = false;

  const complete = async (nextStatus: "completed" | "failed" | "timeout", error?: string) => {
    if (terminal) {
      return;
    }
    terminal = true;
    clearTimeout(timer);

    if (nextStatus === "completed") {
      await writeResponseFile(responseFile, stdout.trim() || "(empty response)");
    }

    status.status = nextStatus;
    status.completedAt = nowIso();
    if (error) {
      status.error = error;
    }
    await persistStatus(statusFile, status);
  };

  const timer = setTimeout(() => {
    try {
      child.kill("SIGTERM");
    } catch {
    }
    void complete("timeout", `${command} timed out after ${timeoutMs}ms`);
  }, timeoutMs);

  child.stdout.on("data", (chunk: Buffer) => {
    stdout += chunk.toString();
  });

  child.stderr.on("data", (chunk: Buffer) => {
    stderr += chunk.toString();
  });

  child.on("error", (error) => {
    void complete("failed", `${command} failed to start: ${error.message}`);
  });

  child.on("close", (code) => {
    if (code === 0) {
      void complete("completed");
      return;
    }
    void complete(
      "failed",
      `${command} exited with code ${code}: ${stderr.trim() || "no stderr"}`,
    );
  });

  child.unref();

  return {
    provider,
    jobId,
    status: "spawned",
    promptFile,
    responseFile,
    statusFile,
  };
}

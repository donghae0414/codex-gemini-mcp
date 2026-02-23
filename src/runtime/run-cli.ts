import { spawn } from "node:child_process";

import { getDefaultTimeoutMs } from "../config.js";
import { logError, logResponse } from "../logger/index.js";
import type { RuntimeLogContext } from "../types.js";

export function runCli(
  command: string,
  args: string[],
  timeoutMs = getDefaultTimeoutMs(),
  cwd?: string,
  logContext?: RuntimeLogContext,
): Promise<string> {
  return new Promise((resolve, reject) => {
    const startedAt = Date.now();
    const child = spawn(command, args, {
      stdio: ["ignore", "pipe", "pipe"],
      cwd,
      env: {
        ...process.env,
        NO_COLOR: "1",
        FORCE_COLOR: "0",
        TERM: "dumb",
      },
    });

    let stdout = "";
    let stderr = "";
    let settled = false;

    const rejectWithLog = (errorCode: string, message: string, stderrText?: string): void => {
      if (settled) {
        return;
      }
      settled = true;
      clearTimeout(timer);
      if (logContext) {
        logError({
          context: logContext,
          durationMs: Date.now() - startedAt,
          errorCode,
          errorMessage: message,
          stderr: stderrText ?? stderr,
        });
      }
      reject(new Error(message));
    };

    const resolveWithLog = (): void => {
      if (settled) {
        return;
      }
      settled = true;
      clearTimeout(timer);
      if (logContext) {
        logResponse({
          context: logContext,
          durationMs: Date.now() - startedAt,
          exitCode: 0,
          stdout,
          stderr,
          truncated: false,
        });
      }
      resolve(stdout.trim() || "(empty response)");
    };

    const timer = setTimeout(() => {
      try {
        child.kill("SIGTERM");
      } catch {
      }
      rejectWithLog("CLI_TIMEOUT", `${command} timed out after ${timeoutMs}ms`);
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
      rejectWithLog(errorCode, `${command} failed to start: ${error.message}`);
    });

    child.on("close", (code) => {
      if (code === 0) {
        resolveWithLog();
        return;
      }
      rejectWithLog(
        "CLI_NON_ZERO_EXIT",
        `${command} exited with code ${code}: ${stderr.trim() || "no stderr"}`,
      );
    });
  });
}

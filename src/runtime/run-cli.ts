import { spawn } from "node:child_process";

import { getDefaultTimeoutMs, getMaxOutputBytes } from "../config.js";
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
    let totalOutputBytes = 0;
    let settled = false;
    const maxOutputBytes = getMaxOutputBytes();

    const outputLimitMessage = `${command} output exceeded MCP_MAX_OUTPUT_BYTES=${maxOutputBytes} bytes`;

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
      const exceeded = appendChunk("stdout", chunk);
      if (!exceeded) {
        return;
      }
      try {
        child.kill("SIGTERM");
      } catch {
      }
      rejectWithLog("CLI_OUTPUT_LIMIT_EXCEEDED", outputLimitMessage, stderr);
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
      rejectWithLog("CLI_OUTPUT_LIMIT_EXCEEDED", outputLimitMessage, stderr);
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

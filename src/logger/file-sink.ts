import { appendFile, mkdir } from "node:fs/promises";
import path from "node:path";

import type { LogEvent } from "./event.js";

function datePart(ts: string): string {
  return ts.slice(0, 10);
}

function getLogFilePath(logDir: string, ts: string): string {
  return path.join(logDir, `mcp-${datePart(ts)}.jsonl`);
}

export async function appendJsonlEvent(logDir: string, event: LogEvent): Promise<void> {
  await mkdir(logDir, { recursive: true });
  const logFile = getLogFilePath(logDir, event.ts);
  await appendFile(logFile, `${JSON.stringify(event)}\n`, "utf8");
}

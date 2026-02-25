import {
  findStatusFileByJobId,
  listJobStatuses,
  readJobContent,
  readJobStatus,
  writeJobStatus,
} from "./prompt-store.js";
import type { JobListStatusFilter, JobState, JobStatus, Provider } from "./types.js";

const INITIAL_POLL_MS = 250;
const MAX_POLL_MS = 5000;
const BACKOFF_FACTOR = 1.5;
const DEFAULT_WAIT_TIMEOUT_MS = 3600000;
const DEFAULT_LIST_LIMIT = 50;

function isTerminal(state: JobState): boolean {
  return state === "completed" || state === "failed" || state === "timeout";
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

async function getStatusOrThrow(
  provider: Provider,
  jobId: string,
  cwd?: string,
): Promise<{ status: JobStatus; statusFile: string }> {
  const statusFile = await findStatusFileByJobId(provider, jobId, cwd);
  if (!statusFile) {
    throw new Error(`job not found: ${jobId}`);
  }
  const status = await readJobStatus(statusFile);
  return { status, statusFile };
}

export async function checkJobStatus(
  provider: Provider,
  jobId: string,
  cwd?: string,
): Promise<JobStatus> {
  const { status } = await getStatusOrThrow(provider, jobId, cwd);
  return status;
}

export async function waitForJob(params: {
  provider: Provider;
  jobId: string;
  timeoutMs?: number;
  cwd?: string;
}): Promise<{ status: JobStatus; responseText?: string }> {
  const timeoutMs = Math.min(params.timeoutMs ?? DEFAULT_WAIT_TIMEOUT_MS, DEFAULT_WAIT_TIMEOUT_MS);
  const deadline = Date.now() + timeoutMs;

  let pollMs = INITIAL_POLL_MS;

  while (Date.now() <= deadline) {
    const status = await checkJobStatus(params.provider, params.jobId, params.cwd);
    if (isTerminal(status.status)) {
      if (status.status === "completed") {
        try {
          const content = await readJobContent(status.contentFile);
          return { status, responseText: content.response ?? "(empty response)" };
        } catch {
          return { status };
        }
      }
      return { status };
    }

    const remainingMs = deadline - Date.now();
    if (remainingMs <= 0) {
      break;
    }

    await delay(Math.min(pollMs, remainingMs));
    pollMs = Math.min(MAX_POLL_MS, Math.ceil(pollMs * BACKOFF_FACTOR));
  }

  throw new Error(`wait_for_job timed out after ${timeoutMs}ms`);
}

export async function killJob(params: {
  provider: Provider;
  jobId: string;
  signal?: "SIGTERM" | "SIGINT";
  cwd?: string;
}): Promise<JobStatus> {
  const signal = params.signal ?? "SIGTERM";
  const { status, statusFile } = await getStatusOrThrow(params.provider, params.jobId, params.cwd);
  if (!status.pid) {
    throw new Error(`job has no pid: ${params.jobId}`);
  }

  process.kill(status.pid, signal);

  const updated: JobStatus = {
    ...status,
    status: "failed",
    killedByUser: true,
    completedAt: new Date().toISOString(),
    error: `killed by user with ${signal}`,
  };
  await writeJobStatus(statusFile, updated);
  return updated;
}

export async function listJobs(params: {
  provider: Provider;
  statusFilter?: JobListStatusFilter;
  limit?: number;
  cwd?: string;
}): Promise<JobStatus[]> {
  const statusFilter = params.statusFilter ?? "active";
  const limit = params.limit ?? DEFAULT_LIST_LIMIT;
  const jobs = await listJobStatuses(params.provider, params.cwd);

  const filtered = jobs.filter((job) => {
    if (statusFilter === "all") {
      return true;
    }
    if (statusFilter === "completed") {
      return job.status === "completed";
    }
    if (statusFilter === "failed") {
      return job.status === "failed" || job.status === "timeout";
    }
    return job.status === "spawned" || job.status === "running";
  });

  return filtered
    .sort((a, b) => b.spawnedAt.localeCompare(a.spawnedAt))
    .slice(0, limit);
}

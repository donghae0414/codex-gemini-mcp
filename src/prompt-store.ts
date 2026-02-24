import { mkdir, readdir, readFile, rename, writeFile } from "node:fs/promises";
import path from "node:path";

import { getJobsDir, getPromptsDir } from "./config.js";
import type { JobContent, JobStatus, Provider } from "./types.js";

function makeJobId(): string {
  return Math.random().toString(16).slice(2, 10).padEnd(8, "0").slice(0, 8);
}

function makeSlug(prompt: string): string {
  const normalized = prompt
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  if (!normalized) {
    return "prompt";
  }
  return normalized.slice(0, 32);
}

function makeTimestampPart(): string {
  return new Date().toISOString().replace(/[-:]/g, "").replace(/\.\d{3}Z$/, "Z");
}

async function ensureDirs(cwd?: string): Promise<void> {
  await mkdir(getPromptsDir(cwd), { recursive: true });
  await mkdir(getJobsDir(cwd), { recursive: true });
}

export interface JobFiles {
  jobId: string;
  contentFile: string;
  statusFile: string;
}

export async function createJobFiles(
  provider: Provider,
  prompt: string,
  cwd?: string,
): Promise<JobFiles> {
  await ensureDirs(cwd);
  const jobId = makeJobId();
  const timestampPart = makeTimestampPart();
  const slug = makeSlug(prompt);
  const promptsDir = getPromptsDir(cwd);
  const jobsDir = getJobsDir(cwd);
  return {
    jobId,
    contentFile: path.join(promptsDir, `${provider}-content-${timestampPart}-${slug}-${jobId}.json`),
    statusFile: path.join(jobsDir, `${provider}-status-${timestampPart}-${slug}-${jobId}.json`),
  };
}

async function writeJsonAtomic(filePath: string, value: unknown): Promise<void> {
  const tempPath = `${filePath}.tmp`;
  await writeFile(tempPath, JSON.stringify(value, null, 2), "utf8");
  await rename(tempPath, filePath);
}

export async function initializeContentFile(contentFile: string, content: JobContent): Promise<void> {
  await writeJsonAtomic(contentFile, content);
}

export async function finalizeContentFile(
  contentFile: string,
  params: { response?: string; completedAt: string; error?: string },
): Promise<void> {
  const content = await readJobContent(contentFile);
  const next: JobContent = {
    ...content,
    completedAt: params.completedAt,
  };

  if (params.response !== undefined) {
    next.response = params.response;
  }
  if (params.error !== undefined) {
    next.error = params.error;
  }

  await writeJsonAtomic(contentFile, next);
}

export async function readJobContent(contentFile: string): Promise<JobContent> {
  const content = await readFile(contentFile, "utf8");
  return JSON.parse(content) as JobContent;
}

export async function writeJobStatus(statusFile: string, status: JobStatus): Promise<void> {
  await writeJsonAtomic(statusFile, status);
}

export async function readJobStatus(statusFile: string): Promise<JobStatus> {
  const content = await readFile(statusFile, "utf8");
  return JSON.parse(content) as JobStatus;
}

export async function findStatusFileByJobId(
  provider: Provider,
  jobId: string,
  cwd?: string,
): Promise<string | undefined> {
  const jobsDir = getJobsDir(cwd);
  let entries: string[];
  try {
    entries = await readdir(jobsDir);
  } catch {
    return undefined;
  }
  const fileName = entries
    .filter((name) => name.startsWith(`${provider}-status-`) && name.endsWith(".json"))
    .find((name) => name.endsWith(`-${jobId}.json`));
  if (!fileName) {
    return undefined;
  }
  return path.join(jobsDir, fileName);
}

export async function listJobStatuses(provider: Provider, cwd?: string): Promise<JobStatus[]> {
  const jobsDir = getJobsDir(cwd);
  let entries: string[];
  try {
    entries = await readdir(jobsDir);
  } catch {
    return [];
  }

  const files = entries.filter(
    (name) => name.startsWith(`${provider}-status-`) && name.endsWith(".json"),
  );

  const statuses = await Promise.all(
    files.map(async (name) => {
      try {
        return await readJobStatus(path.join(jobsDir, name));
      } catch {
        return undefined;
      }
    }),
  );

  return statuses.filter((status): status is JobStatus => status !== undefined);
}

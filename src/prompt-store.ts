import { mkdir, readdir, readFile, rename, writeFile } from "node:fs/promises";
import path from "node:path";

import { getJobsDir, getPromptsDir } from "./config.js";
import type { JobStatus, Provider } from "./types.js";

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

async function ensureDirs(cwd?: string): Promise<void> {
  await mkdir(getPromptsDir(cwd), { recursive: true });
  await mkdir(getJobsDir(cwd), { recursive: true });
}

export interface JobFiles {
  jobId: string;
  promptFile: string;
  responseFile: string;
  statusFile: string;
}

export async function createJobFiles(
  provider: Provider,
  prompt: string,
  cwd?: string,
): Promise<JobFiles> {
  await ensureDirs(cwd);
  const jobId = makeJobId();
  const slug = makeSlug(prompt);
  const promptsDir = getPromptsDir(cwd);
  const jobsDir = getJobsDir(cwd);
  return {
    jobId,
    promptFile: path.join(promptsDir, `${provider}-prompt-${slug}-${jobId}.md`),
    responseFile: path.join(promptsDir, `${provider}-response-${slug}-${jobId}.md`),
    statusFile: path.join(jobsDir, `${provider}-status-${slug}-${jobId}.json`),
  };
}

export async function writePromptFile(promptFile: string, prompt: string): Promise<void> {
  await writeFile(promptFile, prompt, "utf8");
}

export async function writeResponseFile(
  responseFile: string,
  response: string,
): Promise<void> {
  await writeFile(responseFile, response, "utf8");
}

export async function writeJobStatus(statusFile: string, status: JobStatus): Promise<void> {
  const tempPath = `${statusFile}.tmp`;
  await writeFile(tempPath, JSON.stringify(status, null, 2), "utf8");
  await rename(tempPath, statusFile);
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

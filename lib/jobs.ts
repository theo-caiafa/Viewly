import { randomUUID } from "crypto";

export type JobStatus = "running" | "done" | "error" | "cancelled";

export interface JobProgressEntry {
  device: string;
  current: number;
  total: number;
}

export interface JobImage {
  label: string;
  dataUrl: string;
}

export interface Job {
  id: string;
  status: JobStatus;
  progress: JobProgressEntry[];
  warning?: string;
  error?: string;
  images?: JobImage[];
  zipDataUrl?: string;
  pdfDataUrl?: string;
  cancelRequested: boolean;
  createdAt: number;
}

const JOB_TTL_MS = 10 * 60 * 1000;
const jobs = new Map<string, Job>();

function cleanupExpiredJobs(): void {
  const now = Date.now();
  for (const [id, job] of jobs) {
    if (now - job.createdAt > JOB_TTL_MS) {
      jobs.delete(id);
    }
  }
}

export function createJob(): Job {
  cleanupExpiredJobs();
  const job: Job = {
    id: randomUUID(),
    status: "running",
    progress: [],
    cancelRequested: false,
    createdAt: Date.now(),
  };
  jobs.set(job.id, job);
  return job;
}

export function getJob(id: string): Job | undefined {
  return jobs.get(id);
}

export function updateJob(id: string, patch: Partial<Job>): void {
  const job = jobs.get(id);
  if (job) {
    Object.assign(job, patch);
  }
}

export function requestCancel(id: string): boolean {
  const job = jobs.get(id);
  if (!job) return false;
  job.cancelRequested = true;
  return true;
}

export function setProgress(id: string, device: string, current: number, total: number): void {
  const job = jobs.get(id);
  if (!job) return;
  const entry = job.progress.find((p) => p.device === device);
  if (entry) {
    entry.current = current;
    entry.total = total;
  } else {
    job.progress.push({ device, current, total });
  }
}

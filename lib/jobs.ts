import { randomUUID } from "crypto";
import type { CaptureQuality, DeviceConfig, HttpCredentials, ScreenReplay } from "./capture/capture";

export type JobStatus = "running" | "done" | "error" | "cancelled";

export interface JobProgressEntry {
  device: string;
  current: number;
  total: number;
}

export interface JobImage {
  label: string;
  dataUrl: string;
  width: number;
  height: number;
}

// Kept server-side only, keyed by the same label as JobImage — a later
// "capture this screen as video" request re-navigates from scratch (the
// mockup pass's browser context is long closed), so it needs the original
// URL/auth/device plus how to get back to this exact screen.
export interface JobSourceContext {
  url: string;
  httpCredentials?: HttpCredentials;
  devices: DeviceConfig[];
  quality: CaptureQuality;
  slug: string;
  replaysByLabel: Record<string, ScreenReplay>;
}

export interface Job {
  id: string;
  status: JobStatus;
  progress: JobProgressEntry[];
  warning?: string;
  error?: string;
  images?: JobImage[];
  sourceContext?: JobSourceContext;
  cancelRequested: boolean;
  createdAt: number;
}

const JOB_TTL_MS = 10 * 60 * 1000;
const CLEANUP_INTERVAL_MS = 60 * 1000;
const jobs = new Map<string, Job>();

function cleanupExpiredJobs(): void {
  const now = Date.now();
  for (const [id, job] of jobs) {
    if (now - job.createdAt > JOB_TTL_MS) {
      jobs.delete(id);
    }
  }
}

// Runs on its own schedule rather than only inside createJob(): a job that
// reaches "done" and then just sits there (the results page stays open,
// nobody starts a new capture) previously stayed alive indefinitely or got
// purged at an unrelated moment depending on when the next createJob() call
// happened to land — neither of which matches the intended 10-minute TTL.
if (typeof setInterval !== "undefined") {
  const timer = setInterval(cleanupExpiredJobs, CLEANUP_INTERVAL_MS);
  timer.unref?.();
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

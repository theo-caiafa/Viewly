import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createJob, getJob, requestCancel, setProgress, updateJob } from "./jobs";

// jobs.ts keeps its Map and cleanup timer at module scope (a real in-memory
// store, not a class you can instantiate fresh per test) — fake timers let
// the 10-minute TTL be exercised without the suite actually taking 10
// minutes, and advancing the clock is how expiry gets triggered at all.
beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
});

describe("createJob", () => {
  it("creates a job with a unique id and running status", () => {
    const job = createJob();
    expect(job.status).toBe("running");
    expect(job.cancelRequested).toBe(false);
    expect(job.progress).toEqual([]);
    expect(job.id).toMatch(/^[0-9a-f-]{36}$/);
  });

  it("gives distinct ids to successive jobs", () => {
    const a = createJob();
    const b = createJob();
    expect(a.id).not.toBe(b.id);
  });
});

describe("getJob", () => {
  it("returns the job for a known id", () => {
    const job = createJob();
    expect(getJob(job.id)).toBe(job);
  });

  it("returns undefined for an unknown id", () => {
    expect(getJob("does-not-exist")).toBeUndefined();
  });

  it("returns undefined once the job has expired past the 10-minute TTL", () => {
    const job = createJob();
    vi.advanceTimersByTime(11 * 60 * 1000);
    // Expiry is swept by createJob() and by the periodic cleanup timer —
    // creating a second job is what triggers the sweep here.
    createJob();
    expect(getJob(job.id)).toBeUndefined();
  });

  it("keeps a job alive just under the TTL", () => {
    const job = createJob();
    vi.advanceTimersByTime(9 * 60 * 1000);
    createJob();
    expect(getJob(job.id)).toBeDefined();
  });
});

describe("updateJob", () => {
  it("merges a partial patch into the existing job", () => {
    const job = createJob();
    updateJob(job.id, { status: "done", warning: "slow page" });
    const updated = getJob(job.id);
    expect(updated?.status).toBe("done");
    expect(updated?.warning).toBe("slow page");
    expect(updated?.id).toBe(job.id); // untouched fields survive the merge
  });

  it("silently no-ops for an unknown job id", () => {
    expect(() => updateJob("missing", { status: "done" })).not.toThrow();
  });
});

describe("requestCancel", () => {
  it("flags an existing job and reports success", () => {
    const job = createJob();
    expect(requestCancel(job.id)).toBe(true);
    expect(getJob(job.id)?.cancelRequested).toBe(true);
  });

  it("reports failure for an unknown job id", () => {
    expect(requestCancel("missing")).toBe(false);
  });
});

describe("setProgress", () => {
  it("adds a new progress entry for a device not seen before", () => {
    const job = createJob();
    setProgress(job.id, "desktop", 2, 5);
    expect(getJob(job.id)?.progress).toEqual([{ device: "desktop", current: 2, total: 5 }]);
  });

  it("updates the existing entry for a device instead of duplicating it", () => {
    const job = createJob();
    setProgress(job.id, "desktop", 1, 5);
    setProgress(job.id, "desktop", 3, 5);
    expect(getJob(job.id)?.progress).toEqual([{ device: "desktop", current: 3, total: 5 }]);
  });

  it("tracks multiple devices independently", () => {
    const job = createJob();
    setProgress(job.id, "desktop", 1, 5);
    setProgress(job.id, "mobile", 2, 3);
    expect(getJob(job.id)?.progress).toEqual([
      { device: "desktop", current: 1, total: 5 },
      { device: "mobile", current: 2, total: 3 },
    ]);
  });

  it("silently no-ops for an unknown job id", () => {
    expect(() => setProgress("missing", "desktop", 1, 5)).not.toThrow();
  });
});

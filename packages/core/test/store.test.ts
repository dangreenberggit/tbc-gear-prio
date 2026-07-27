import { describe, expect, it } from "vitest";
import { MemoryStore } from "../src/seams/store.js";

describe("MemoryStore", () => {
  it("returns undefined for a missing key", async () => {
    const store = new MemoryStore();
    expect(await store.get("missing")).toBeUndefined();
  });

  it("round-trips a value through put and get", async () => {
    const store = new MemoryStore();
    await store.put("k", { dps: 2042.85 });
    expect(await store.get("k")).toEqual({ dps: 2042.85 });
  });

  it("creates a job that can be read back", async () => {
    const store = new MemoryStore(() => new Date("2026-07-26T12:00:00.000Z"));
    const job = await store.job.create({
      contentHash: "abc",
      input: { character: "slamaltman" },
    });
    expect(job.id).toMatch(/^job_/);
    expect(job.status).toBe("queued");
    expect(job.contentHash).toBe("abc");
    expect(await store.job.read(job.id)).toEqual(job);
  });

  it("updates a job status and result", async () => {
    const store = new MemoryStore(() => new Date("2026-07-26T12:00:00.000Z"));
    const created = await store.job.create({
      contentHash: "abc",
      input: {},
    });
    const updated = await store.job.update(created.id, {
      status: "done",
      result: { cutoff: { absDps: 3.4, pct: 0.15 } },
    });
    expect(updated?.status).toBe("done");
    expect(updated?.result).toEqual({ cutoff: { absDps: 3.4, pct: 0.15 } });
    expect(await store.job.read(created.id)).toEqual(updated);
  });
});

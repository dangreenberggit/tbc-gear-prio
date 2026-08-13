/**
 * One suite, both adapters (ticket 01 scope 3). The point is not coverage of
 * MemoryStore — store.test.ts already has that — it is that the two adapters
 * are provably interchangeable, so swapping SqliteStore in for Stage 4
 * deployment cannot change rankUpgrades' behaviour.
 */

import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterAll, describe, expect, it } from "vitest";
import { MemoryStore, SqliteStore, type Store } from "../src/seams/store.js";

const tempDirs: string[] = [];
const openStores: SqliteStore[] = [];

afterAll(() => {
  // Windows refuses to unlink a db file whose handle is still open, so the
  // stores close before the directories go.
  for (const store of openStores) store.close();
  for (const dir of tempDirs) rmSync(dir, { recursive: true, force: true });
});

function sqliteStore(clock?: () => Date): Store {
  const dir = mkdtempSync(join(tmpdir(), "tbc-store-"));
  tempDirs.push(dir);
  const store = new SqliteStore(join(dir, "store.db"), clock);
  openStores.push(store);
  return store;
}

const adapters: Array<{ name: string; make: (clock?: () => Date) => Store }> = [
  { name: "MemoryStore", make: (clock) => new MemoryStore(clock) },
  { name: "SqliteStore", make: sqliteStore },
];

const FIXED = () => new Date("2026-08-05T12:00:00.000Z");

describe.each(adapters)("$name satisfies the Store contract", ({ make }) => {
  describe("the blob half", () => {
    it("returns undefined for a missing key", async () => {
      expect(await make().get("missing")).toBeUndefined();
    });

    it("round-trips a value through put and get", async () => {
      const store = make();
      await store.put("k", { dps: 2042.85 });
      expect(await store.get("k")).toEqual({ dps: 2042.85 });
    });

    it("round-trips a nested value without losing shape", async () => {
      // The ranking blob is deeply nested; a naive TEXT column that stringified
      // only the top level would pass the flat case above and lose items here.
      const store = make();
      const ranking = {
        contentHash: "abc",
        items: [{ rank: 1, itemId: 29381, bisTags: ["BiS"], owned: true }],
        substitutions: [],
      };
      await store.put("ranking:abc", ranking);
      expect(await store.get("ranking:abc")).toEqual(ranking);
    });

    it("overwrites the value at an existing key", async () => {
      const store = make();
      await store.put("k", { v: 1 });
      await store.put("k", { v: 2 });
      expect(await store.get("k")).toEqual({ v: 2 });
    });

    it("keeps distinct keys independent", async () => {
      const store = make();
      await store.put("a", { v: 1 });
      await store.put("b", { v: 2 });
      expect(await store.get("a")).toEqual({ v: 1 });
      expect(await store.get("b")).toEqual({ v: 2 });
    });
  });

  describe("the job half", () => {
    it("creates a job that can be read back", async () => {
      const store = make(FIXED);
      const job = await store.job.create({
        contentHash: "abc",
        input: { character: "slamaltman" },
      });
      expect(job.id).toMatch(/^job_/);
      expect(job.status).toBe("queued");
      expect(job.contentHash).toBe("abc");
      expect(job.input).toEqual({ character: "slamaltman" });
      expect(await store.job.read(job.id)).toEqual(job);
    });

    it("issues distinct ids to successive jobs", async () => {
      const store = make(FIXED);
      const a = await store.job.create({ contentHash: "a", input: {} });
      const b = await store.job.create({ contentHash: "b", input: {} });
      expect(a.id).not.toBe(b.id);
    });

    it("updates a job status and result", async () => {
      const store = make(FIXED);
      const created = await store.job.create({ contentHash: "abc", input: {} });
      const updated = await store.job.update(created.id, {
        status: "done",
        result: { cutoff: { absDps: 3.4, pct: 0.15 } },
      });
      expect(updated?.status).toBe("done");
      expect(updated?.result).toEqual({ cutoff: { absDps: 3.4, pct: 0.15 } });
      expect(await store.job.read(created.id)).toEqual(updated);
    });

    it("preserves fields the patch does not mention", async () => {
      const store = make(FIXED);
      const created = await store.job.create({
        contentHash: "abc",
        input: { keep: true },
      });
      await store.job.update(created.id, { status: "running" });
      const read = await store.job.read(created.id);
      expect(read?.contentHash).toBe("abc");
      expect(read?.input).toEqual({ keep: true });
      expect(read?.createdAt).toBe(created.createdAt);
    });

    it("records an error kind and detail", async () => {
      const store = make(FIXED);
      const created = await store.job.create({ contentHash: "abc", input: {} });
      const updated = await store.job.update(created.id, {
        status: "error",
        errorKind: "sim-failed",
        errorDetail: "wowsimcli panicked",
      });
      expect(updated?.status).toBe("error");
      expect(updated?.errorKind).toBe("sim-failed");
      expect(updated?.errorDetail).toBe("wowsimcli panicked");
    });

    it("returns undefined when updating a job that does not exist", async () => {
      const store = make(FIXED);
      expect(
        await store.job.update("job_nope", { status: "done" })
      ).toBeUndefined();
    });

    it("returns undefined when reading a job that does not exist", async () => {
      expect(await make().job.read("job_nope")).toBeUndefined();
    });
  });
});

describe("SqliteStore persistence", () => {
  it("serves a blob written by an earlier connection to the same file", async () => {
    // §11 calls gear snapshots and sim results permanent. An adapter that only
    // held them for the life of one process would satisfy every test above and
    // still lose the entire WCL point-budget defence on restart.
    const dir = mkdtempSync(join(tmpdir(), "tbc-store-"));
    tempDirs.push(dir);
    const path = join(dir, "persist.db");

    const first = new SqliteStore(path);
    await first.put("gear:abc123|7", { items: [{ id: 29381 }] });
    const job = await first.job.create({ contentHash: "abc", input: {} });
    first.close();

    const second = new SqliteStore(path);
    expect(await second.get("gear:abc123|7")).toEqual({
      items: [{ id: 29381 }],
    });
    expect((await second.job.read(job.id))?.contentHash).toBe("abc");
    second.close();
  });
});

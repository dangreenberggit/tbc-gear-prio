/**
 * Store seam — content-addressed blob cache + job rows (PLAN.md §5.5, §11).
 *
 * Adapters: MemoryStore (tests / offline), SqliteStore (production).
 */

import { DatabaseSync } from "node:sqlite";

export type JobStatus = "queued" | "running" | "done" | "error";

export type Job = {
  id: string;
  contentHash: string;
  status: JobStatus;
  input: unknown;
  progress?: unknown;
  errorKind?: string;
  errorDetail?: string;
  result?: unknown;
  createdAt: string;
  updatedAt: string;
};

export type JobCreateInput = {
  contentHash: string;
  input: unknown;
};

export type JobUpdateInput = {
  status?: JobStatus;
  progress?: unknown;
  errorKind?: string;
  errorDetail?: string;
  result?: unknown;
};

export interface Store {
  get<T>(key: string): Promise<T | undefined>;
  put<T>(key: string, value: T): Promise<void>;
  job: {
    create(input: JobCreateInput): Promise<Job>;
    update(id: string, patch: JobUpdateInput): Promise<Job | undefined>;
    read(id: string): Promise<Job | undefined>;
  };
}

export class MemoryStore implements Store {
  private readonly blobs = new Map<string, unknown>();
  private readonly jobs = new Map<string, Job>();
  private seq = 0;

  constructor(private readonly clock: () => Date = () => new Date()) {}

  async get<T>(key: string): Promise<T | undefined> {
    if (!this.blobs.has(key)) return undefined;
    return this.blobs.get(key) as T;
  }

  async put<T>(key: string, value: T): Promise<void> {
    this.blobs.set(key, value);
  }

  readonly job = {
    create: async (input: JobCreateInput): Promise<Job> => {
      this.seq += 1;
      const now = this.clock().toISOString();
      const job: Job = {
        id: `job_${this.seq}`,
        contentHash: input.contentHash,
        status: "queued",
        input: input.input,
        createdAt: now,
        updatedAt: now,
      };
      this.jobs.set(job.id, job);
      return job;
    },

    update: async (
      id: string,
      patch: JobUpdateInput
    ): Promise<Job | undefined> => {
      const existing = this.jobs.get(id);
      if (!existing) return undefined;
      const updated: Job = {
        ...existing,
        ...patch,
        updatedAt: this.clock().toISOString(),
      };
      this.jobs.set(id, updated);
      return updated;
    },

    read: async (id: string): Promise<Job | undefined> => {
      return this.jobs.get(id);
    },
  };
}

/**
 * The two-table schema from PLAN.md §11. Values are JSON text rather than a
 * typed column per field because `kv` holds whole ranking / gear / sim blobs
 * whose shape is owned by the caller, not by this adapter.
 *
 * Retention is deliberately absent: §11 makes gear snapshots and sim results
 * immutable and permanent, and keeps job rows. The TTL that does exist (§12,
 * on the fight-list query) is Stage 3 and belongs to the WCL client.
 */
const SCHEMA = `
CREATE TABLE IF NOT EXISTS kv (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS jobs (
  id TEXT PRIMARY KEY,
  content_hash TEXT NOT NULL,
  status TEXT NOT NULL,
  input TEXT NOT NULL,
  progress TEXT,
  error_kind TEXT,
  error_detail TEXT,
  result TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS jobs_content_hash ON jobs (content_hash);
`;

type JobRow = {
  id: string;
  content_hash: string;
  status: string;
  input: string;
  progress: string | null;
  error_kind: string | null;
  error_detail: string | null;
  result: string | null;
  created_at: string;
  updated_at: string;
};

export class SqliteStore implements Store {
  private readonly db: DatabaseSync;

  constructor(
    path = ":memory:",
    private readonly clock: () => Date = () => new Date()
  ) {
    this.db = new DatabaseSync(path);
    this.db.exec(SCHEMA);
  }

  /** Tests and short-lived CLI runs close explicitly; a server holds it open. */
  close(): void {
    this.db.close();
  }

  async get<T>(key: string): Promise<T | undefined> {
    const row = this.db
      .prepare("SELECT value FROM kv WHERE key = ?")
      .get(key) as { value: string } | undefined;
    if (!row) return undefined;
    return JSON.parse(row.value) as T;
  }

  async put<T>(key: string, value: T): Promise<void> {
    this.db
      .prepare(
        "INSERT INTO kv (key, value) VALUES (?, ?) " +
          "ON CONFLICT(key) DO UPDATE SET value = excluded.value"
      )
      .run(key, JSON.stringify(value));
  }

  readonly job = {
    create: async (input: JobCreateInput): Promise<Job> => {
      const now = this.clock().toISOString();
      // Sequence read from the table rather than an instance counter: a second
      // SqliteStore over the same file would otherwise restart at job_1 and
      // overwrite the first one's rows.
      const row = this.db.prepare("SELECT COUNT(*) AS n FROM jobs").get() as {
        n: number;
      };
      const job: Job = {
        id: `job_${row.n + 1}`,
        contentHash: input.contentHash,
        status: "queued",
        input: input.input,
        createdAt: now,
        updatedAt: now,
      };
      this.db
        .prepare(
          "INSERT INTO jobs (id, content_hash, status, input, created_at, updated_at) " +
            "VALUES (?, ?, ?, ?, ?, ?)"
        )
        .run(
          job.id,
          job.contentHash,
          job.status,
          JSON.stringify(job.input ?? null),
          job.createdAt,
          job.updatedAt
        );
      return job;
    },

    update: async (
      id: string,
      patch: JobUpdateInput
    ): Promise<Job | undefined> => {
      const existing = await this.job.read(id);
      if (!existing) return undefined;
      const updated: Job = {
        ...existing,
        ...patch,
        updatedAt: this.clock().toISOString(),
      };
      this.db
        .prepare(
          "UPDATE jobs SET status = ?, progress = ?, error_kind = ?, " +
            "error_detail = ?, result = ?, updated_at = ? WHERE id = ?"
        )
        .run(
          updated.status,
          updated.progress === undefined
            ? null
            : JSON.stringify(updated.progress),
          updated.errorKind ?? null,
          updated.errorDetail ?? null,
          updated.result === undefined ? null : JSON.stringify(updated.result),
          updated.updatedAt,
          id
        );
      return updated;
    },

    read: async (id: string): Promise<Job | undefined> => {
      const row = this.db.prepare("SELECT * FROM jobs WHERE id = ?").get(id) as
        JobRow | undefined;
      if (!row) return undefined;
      const job: Job = {
        id: row.id,
        contentHash: row.content_hash,
        status: row.status as JobStatus,
        input: JSON.parse(row.input) as unknown,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
      };
      // Rebuilt field-by-field rather than spread from the row, because
      // exactOptionalPropertyTypes makes `progress: undefined` a different
      // type from an absent key — and job.read's result is deep-equal
      // compared against job.update's return in the contract suite.
      if (row.progress !== null) job.progress = JSON.parse(row.progress);
      if (row.error_kind !== null) job.errorKind = row.error_kind;
      if (row.error_detail !== null) job.errorDetail = row.error_detail;
      if (row.result !== null) job.result = JSON.parse(row.result);
      return job;
    },
  };
}

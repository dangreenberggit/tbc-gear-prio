Status: open
Type: task
Origin: pre-merge review of `phase-2/caches` (adversarial + spec axes), 2026-08-05
Blocks: phase-4
Blocked by: none

# `SqliteStore` job ids race, and `kv` omits §11's `created_at`

Both found by the pre-merge review of `phase-2/caches`. Deferred deliberately:
ticket 01 scoped `SqliteStore` as *"the adapter and its tests, not a deployed
database"*, and neither defect can bite until something deploys it with more
than one writer. `MemoryStore` remains the only adapter with a production call
site (`cli.ts`), so nothing today is exposed.

## 1. Job ids come from `SELECT COUNT(*)`

`packages/core/src/seams/store.ts` — `job.create` derives the next id as
`job_${count + 1}`.

Two failure modes, neither reachable from the current single-process CLI:

- **Concurrent writers.** Two `create` calls that read the count before either
  inserts both compute the same id; the second `INSERT` violates the primary
  key and throws, or — worse if the insert were ever made idempotent —
  overwrites the first job's row.
- **Any deletion wedges the table permanently.** Confirmed by probe during the
  review, not predicted: delete `job_1` from a two-row table and the next
  `create` throws `UNIQUE constraint failed: jobs.id` — and keeps throwing,
  because `COUNT(*)` never catches up to the surviving ids. It fails loudly
  rather than overwriting, which is the good half. Retention today keeps job
  rows forever (§11), so a delete has to exist first.

Note that two connections *in-process* are safe: `DatabaseSync` is synchronous,
so the `async` wrapper cannot interleave between the `COUNT` and the `INSERT`.
The race needs two OS processes.

The counter also exists to survive reopening the file, which `MemoryStore`'s
instance counter does not — that part is deliberate and should be kept. Likely
fix: `INTEGER PRIMARY KEY AUTOINCREMENT`, or a `MAX(rowid)`-based sequence, or
a UUID. Whatever replaces it must keep the shared contract suite green,
including `issues distinct ids to successive jobs` and the persistence case.

## 2. `kv` has no `created_at`

PLAN.md §11 spells the `kv` table with a `created_at` column; the adapter
created `(key, value)` only. Nothing reads it today and retention is
permanent-by-design, so it changes no behaviour — but it is a divergence from
the documented schema, and an operator eventually wants to know when a blob
landed. Add the column (nullable or defaulted, so existing rows migrate).

## 3. The adapters diverge on `undefined`

`job.create({ input: undefined })` reads back as `null` from `SqliteStore`
(`JSON.stringify(job.input ?? null)`) and as `undefined` from `MemoryStore`.
The contract suite never passes `undefined`, so the file's own claim that the
two are *"provably interchangeable"* has this hole in it. `undefined` nested
*inside* a blob behaves identically on both (keys dropped, array holes nulled)
— verified during the review, so only the top-level case is affected.

Fix is a decision, not just code: either `input` is non-nullable and the type
should say so, or both adapters must agree on what they store. Whichever way,
add the case to the shared suite so the claim is backed.

## Done when

- Concurrent `job.create` cannot collide, proven by a test that interleaves two
  creates against one file, and a delete no longer wedges the table.
- `kv` matches §11's column list.
- The adapters agree on a top-level `undefined` input, with a contract case
  covering it.
- The shared `Store` contract suite still passes for both adapters.

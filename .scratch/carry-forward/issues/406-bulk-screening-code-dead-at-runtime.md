# 406 — Bulk screening code is dead at runtime on both transports

Status: open
Type: task
Origin: ticket 403's fix (Track C, 2026-09-16) — deliberately deferred there
Blocks: —
Blocked by: none

## What

Since 403 the upgrades tab takes the per-candidate loop on both transports, so
nothing at runtime constructs `BulkHttpSimRunner` or reaches the bulk screening
machinery. The code stays in the tree and still compiles, lints and passes its
tests. It is dead, not broken.

Dead at runtime, in the fork
(`vendor/tbc-new-fork/ui/core/components/individual_sim_ui/`):

- `upgrades/adapters/bulk_http_sim_runner.ts` — the runner itself. The class name
  is still *referenced* in `upgrades_tab.tsx` (the `data-runner` attribute's
  `instanceof` test at `:1208`, and two type positions), so it cannot simply be
  deleted without touching that file.
- `upgrades/adapters/bulk_request_builder.ts` — builds the `BulkSimRequest`.
- `upgrades/engine/bulk/partition.ts` — cuts candidates into 25-set chunks.
- the rest of `upgrades/engine/bulk/`.

**Six vitest files keep passing while testing code nothing reaches**, in
`vendor/tbc-new-fork/ui/core/components/individual_sim_ui/upgrades/engine/bulk/`:
`bulk-boundary`, `bulk-partition`, `bulk-screen-branch`, `bulk-screen-driver`,
`bulk-screen-fallback`, `bulk-screen-http-fixture` (all `*.test.ts`). Green and
dead is the worst combination to leave undocumented — it reads as coverage.

## Why it stays for now

Deleting it is a much larger fork diff than 403's two-file change, and it forecloses
a re-enable the owner may want if the underlying engine cost is ever fixed. 403
removed the runtime path deliberately and left the code, so this is a decision to
revisit, not an oversight to correct.

## What re-enabling would require

The blocker is **not** the RPC. It is that our builder must set `topResults` to
the candidate count or most rows silently vanish
(`wasm/bulk_sim/statistics.ts:104-111`), and on the Go server that same field
sizes the finalist stage — so the stage refines *every* candidate. Measured cost
at cap 40: 263 s screened against 19 s loop, with 174.5 s of the 263 s inside the
finalist stage. See 403.

A second cost sits behind it and is **untested**: the `high` stage is asked for
3,000 iterations and appears to deliver 16,599-19,686 per sim (from the per-sim
`Running N iterations` lines in the packaged server's stderr). If that adaptive
inflation is real, removing the finalist stage alone would still leave desktop
screening several times slower per candidate than the loop. Settle it by
capturing the packaged server's stderr during a screened run and reading those
lines — the previous capture was a one-time artifact and is not re-derivable.

**Adaptive-pass question, one line:** whether the `high` stage's iteration
inflation is a deliberate convergence target or an unintended floor is unanswered,
and upstream logs `Target error: 0.00%` from an unset field while its real
stopping test is never logged (`sim/core/bulk/stage.go:24`,
`statistics.go:130-142`).

## Done when

The owner has decided delete-or-keep. If delete: the six test files go with the
code, and `upgrades_tab.tsx`'s `data-runner` attribute needs a different way to
report the runner. If keep: the six tests get a comment saying what they cover is
unreachable, so the next reader is not misled by green.

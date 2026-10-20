Status: wontfix
Type: task
Origin: docs/reviews/fix-ticket-60-61-spec-and-caps.md (adversarial A4)
Blocks: none
Blocked by: none

# A `spec-mismatch` throw never reaches a job row

Ticket 61's guard sits immediately after `readGear` in `rankUpgrades`
(`packages/core/src/rank.ts`), which is **before** `deps.store.job.create`.
Every other `RankError` is raised after the job row exists and is recorded by
the `errorKind` catch further down; `spec-mismatch` is raised before there is
a row to record it on.

Reproduce by reading the order:

```bash
grep -n 'spec-mismatch\|job.create\|errorKind' packages/core/src/rank.ts
```

## Why it is not urgent

The CLI is the only caller today and it reports the error correctly —
`cli.ts` prints `${err.kind}: ${err.message}` and exits 1, so a user sees the
actionable message. What is missing is the *persisted* record: the Phase 2 job
API sees nothing at all for a spec-mismatched request, where it would see a
`done`/`error` row for any other failure.

That matters when the web shell (Phase 3) polls job status rather than reading
a CLI exit code — a request that fails this way would look like it never
happened.

## Why the guard sits where it does

Deliberately: refusing before `job.create` avoids writing a row for work that
was never going to run, and keeps the check adjacent to the `readGear` call
whose data it validates. Moving it after job creation is a sequencing change
with its own blast radius (the row's lifecycle, what `contentHash` means for a
request that never simmed), which is why this is a ticket rather than a
same-branch fix.

## Done when

- A `spec-mismatch` either records a job row like every other `RankError`, or
  the asymmetry is written down as intentional with the reason.
- If it records one: a test asserts the row reaches a terminal state carrying
  the kind, rather than being left `running` (see ticket 29 for that failure
  shape).

## Comments

### 2026-10-19 — wontfix (ticket housekeeping)

Per the owner's 2026-10-16 scope ruling: there is no standalone web app or Stage 4 deploy, and the work is the fork's Upgrades tab only (`PLAN.md:934`; `.scratch/plans/upgrades-tab-finish-line.md:53-56`): this concerns only this repo's command-line ranking or its HTML report, which the tab does not use. The fork has no spec-mismatch check (`ui/features/upgrades/model/engine/rank.ts:8-16`, tbc-new-fork@bc3cca6a1).

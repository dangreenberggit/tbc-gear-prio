# Pre-merge review — fix/890-891-store-faults

Diffed against: our repo `e8994c49..HEAD` (`e8994c49` is `dev` when the pair
was made; the branch re-pins the fork twice, closes tickets 890 and 891 and
adds this file), and the fork `ed1bc49a9..82d0c5818` on fork branch
`fix/890-891-store-faults` (`ed1bc49a9` is the pin on `dev`). The fork diff
touches only the tab's files under `ui/features/upgrades/model/`;
`upstream/master` has no `ui/features/upgrades`, so no upstream wowsims file
changed.

What the branch is for: tickets 890 (a store fault during the set-bonus sims
was reported as "its sim failed") and 891 (a store fault in `rankUpgrades`'
own store calls threw a plain `Error`), found by the Phase B review
(`docs/reviews/refactor-rank-split-b.md`, Notes, N2). The owner's words
(2026-11-22): "Sure do an end to end run. But we obviously have the two
issues you mentioned earlier about failed runs etc". The brief asked for both
fixed before the upstream pull request, with the tab's error reporting
matching what wowsims does.

Reports (gitignored, in the main checkout's `.scratch/agent-reports/`): the
three reviews `2026-11-22-general-task-890-891-review-{adversarial,domain,standards-spec}.md`
and this branch's summary `2026-11-22-general-task-890-891-store-faults.md`.

## What changed

- Fork `8628857ec`:
  - `rank.ts`: the saved-ranking read and write, the job row's create, its
    "running" update and both "done" updates go through `asInternal`
    (exported from `sim-calls.ts`), so a store fault there is
    `RankError('internal')`. The "error" update in the `catch` stays bare: its
    failure is swallowed so it cannot replace the error being rethrown.
  - `set-phase.ts`, `set-less-copies.ts`, `set-screen.ts`: the set sims'
    runners return a failed sim as `{ simError }` in place of throwing it,
    following `runCounted` in `sim-calls.ts`, so `measureSameGearBonus`,
    `measureWornSetCounts` and the set screen catch nothing and a store fault
    throws past the set phase. `runSimAt` is deleted; the set screen calls
    `simOrFailure`.
  - New test `model/rank_store_faults.test.ts`.
- Fork `82d0c5818`: the test's `talentPointsByTree` matches its talent string
  (domain note N1).
- Our repo: the lock re-pins, `sim-implemented-effects.json` regenerated for
  each pin, `docs/fork-provenance/engine.md` (five hashes and § Store faults
  are internal), tickets 890 and 891 closed.

What the player sees after a store fault, anywhere in the run: the run stops
with the status line "Ranking failed." and a toast with the store's own error
text, or no toast after Stop. That is the tab's existing failed-run path
(`model/run_session.ts:104-110`), which follows wowsims' bulk sim (upstream
`ui/features/bulk/model/run.ts:301-310`: log the error, toast its message
unless cancelling). No new player text. Before, a store fault in a set-bonus
sim left the run going with a note such as "The Thunderheart Harness 2-piece
set bonus was not measured, because its sim failed."

## Check output

`node --version` printed v22.23.2 in every shell. Logs in the main checkout's
`.scratch/store-faults/` (gitignored).

- **Red** (`red.log`, fork at `ed1bc49a9` with only the test added): the
  three sweeps failed. Calls 1, 2, 3, 123 and 124 (`rankUpgrades`' own) ended
  in `Error: store fault at call N`; 20 of the 42 set-phase store calls ended
  in a ranking with an "its sim failed" or "the check's sim failed" note.
  The Stop test, added after the fix, failed with its wrap removed
  (`red-stop.log`, `Tests 1 failed | 3 skipped (4)`).
- **Green** (`green.log`): `Tests 4 passed (4)`.
- **K2, trace** (five engine suites, `TBC_RANK_TRACE_DIR`, script
  `k2k3.sh`): base trace taken in the main checkout at fork `ed1bc49a9`
  (`logs/base-k3.log`, `Tests 246 passed (246)`); after the fix
  `logs/after-vs-base-k2.diff` 0 bytes; at the final tip `82d0c5818`
  `logs/tip-k2.diff` 0 bytes (`logs/tip-k3.log`, `Tests 246 passed (246)`).
- **Fork suite** (`logs/fork-vitest.log`): `Test Files 342 passed (342)`,
  `Tests 2866 passed (2866)`; locales valid; `oxlint`, `oxfmt --check` and
  `tsc --noEmit` rc=0.
- **`pnpm verify`** in the pair (`logs/verify.log`, GOFLAGS unset): rc=0,
  `gates: 1750 ran, 0 skipped`; the layout gate skipped for the absent
  `dist/`. That run was on fork `8628857ec`; the final tree is checked again
  by the pre-push hook when the branch is pushed.

## Findings

Three reviewers, all `general-task` on Opus: adversarial (effort xhigh),
standards and spec, and domain. No code defect was found.

The adversarial reviewer read every `catch` in `model/` against its `try`
and ran its own sweeps with one store fault per run: at concurrency 4 (124
of 124 calls stopped the run as `internal`), with paired replication (96 of 96) and after Stop in the set phase (6 of 6). Domain checked the test's
item ids, set ids, talents and race against the fork's `db.json` and Go,
and the synthetic sim's copy handling against `sim/core/item_sets.go`.

- **S1** (standards): the provenance prose and the lock's `_comment` said a
  store fault stops the run "wherever it happens" and that the job row's
  "create and updates" are wrapped; the "error" update in the `catch` is not.
- **S2** (standards): the `sim-calls.ts` row in § Ported files still names
  `runSimAt`, and the new section did not say the rows keep it as history.
- **S3** (standards): the tickets' closing notes said the player always gets
  a toast; there is none after Stop (`run_session.ts:108`).
- **S4** (standards): ticket 890 cited `.scratch/store-faults/k2k3.sh` without
  saying it is in the main checkout.
- **D1** (domain note N1): the test's `talentPointsByTree: [0, 45, 16]` did
  not match its talent string, which adds up to 0/44/17. The engine never
  reads the field.

## Disposition

| ID  | Axis      | Disposition | Ticket / note                                                                                                                                                        |
| --- | --------- | ----------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| S1  | Standards | fixed       | `engine.md` § Store faults are internal names the exception; the lock's `_comment` sentence for `82d0c5818` names it. The fork commit body of `8628857ec` is history |
| S2  | Standards | fixed       | The section says the rows keep `runSimAt` and the throwing runners as history, as § Pre-PR removals does                                                             |
| S3  | Standards | fixed       | Both tickets' closing notes say "no toast after Stop"                                                                                                                |
| S4  | Standards | fixed       | The tickets say "gitignored, main checkout" for each `.scratch/store-faults/` path                                                                                   |
| D1  | Domain    | fixed       | Fork `82d0c5818`: `[0, 44, 17]`; the test still passes (`Tests 4 passed (4)`)                                                                                        |

## Notes

- **A store fault after Stop now fails the run** (adversarial N1). Pressing
  Stop and then hitting a store fault in the set phase shows "Ranking
  failed." with no toast, where before the fault became a note that was
  dropped and the partial rows came back (hypothesis, untested at base). A
  store fault in the candidate loop after Stop already failed the run, and
  this is what the ticket asked for: handled as everywhere else in the run.
- **The toast shows the store's raw error text** (domain N2), not player
  wording. Wowsims' bulk sim does the same (`run.ts:303-308`), so this follows
  the owner's "match wowsims" ruling.
- **Overlapping tests** (adversarial N3): the first two sweeps are subsets of
  the every-call sweep; they stay so each ticket has a named test. All run at
  concurrency 1 with one seed; the adversarial probe covered concurrency 4,
  replication and Stop.
- **The trace that the "0 bytes" claim rests on** (adversarial N2): the
  reviewer asked whether the "after" trace predates the "done"-after-Stop
  wrap. It does not: that wrap was in the first fix; `red-stop.log` shows it
  removed for a few minutes to show the Stop test fail, then put back. The
  final-tip K2 above (0 bytes) settles it.
- **Out of scope** (adversarial N4): the CLI's own engine in
  `packages/core/src/rank.ts` keeps bare store calls with `SqliteStore`. The
  owner's scope is the fork's Upgrades tab only.
- **No review fix needed a new test.** S1 to S4 are wording in docs and
  tickets; D1 is a fixture value the engine does not read.
- **The lock says `pushed: false`.** The fork branch is pushed; the merging
  agent sets `pushed: true` after the merge (`docs/agents/paired-worktrees.md`
  § Land it on dev).
- **Sandbox workarounds used**, not product changes: GOFLAGS unset for
  `pnpm verify`; main-repo commits made through the T3 thread "store-faults:
  pair commits", because the sandbox mounts the main repo's `.git/worktrees`
  read-only.

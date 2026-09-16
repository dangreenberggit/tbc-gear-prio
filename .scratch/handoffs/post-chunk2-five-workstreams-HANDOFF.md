# Handoff — after Chunk 2, five workstreams to the merge

Written 2026-09-15 by the orchestrating session that ran Chunk 2.

**Read this section first.** This document contains the plan inline. There is no
separate plan file for it — it came from a Fable planner whose output lived only
in the orchestrating session's context. Do not go looking for
`.scratch/plans/post-chunk2-*.md`; it does not exist.

## How to treat the claims in this document

This branch produced three errors that were each a plausible sentence copied
forward through agent summaries until somebody opened the raw file:

1. "Ticket 211 owns the red `fork-universes:check`" — 211 is `Status: closed`.
2. "The Go bulk path runs multi-stage convergence per chunk" — the code holds
   chunks single-stage (`assertSingleStageChunk`) and throws otherwise.
3. "Both full runs used `DEFAULT_SEEDS`" — neither readback records a seed at
   all; it was an argument from reading code.

So: **every prose claim you inherit, including from this file, is unverified
until you open the artifact.** Numbers below are marked with how they were
established. Where a claim is an inference, it says so. Re-measure before you
rely on anything.

## State right now (measured this session)

| Thing | Value | How established |
| --- | --- | --- |
| Branch | `feat/desktop-transport-gate` at `3cfc0b62` | `git -C <core> rev-parse HEAD` |
| Core tree | two uncommitted paths (below) | `git -C <core> status --porcelain` |
| Fork clone | `eb040855c`, clean, **not pushed** | `git -C <fork> rev-parse HEAD`; `ls-remote` returns `2781486d6` |
| `pnpm verify` | **red on `fork-universes:check` only** | full run; every other gate printed ok, 1290 tests passed |
| `pnpm desktop-gate:check` | **green** | re-run by the orchestrator after the M1 fix: `desktop-gate: PASS.` |
| Chunk 2 review | `docs/reviews/feat-desktop-transport-gate.md`, committed | in `3cfc0b62` |

**Uncommitted, deliberately left for you to decide on:**

- `M .scratch/stage-gate/desktop-transport-gate/decision-log.md` — the Gate C
  dispositions and the final review/merge-check record. Content is correct;
  it was simply never committed.
- `?? .scratch/handoffs/tickets-398-397-HANDOFF.md` — the 398/397 handoff,
  untracked. **Note `.gitignore` tracks only named stage dirs**, so check
  whether `.scratch/handoffs/` is ignored before assuming a commit will take it.

## The plan — five workstreams, in this order

Recommended sequence: **E → merge → A(+D) → B → C**. The owner's original
preference was A → B → C → merge; the planner argued for merging earlier and the
orchestrator verified the load-bearing claim (see E and the merge note).

### E. Clear the CRLF drift — this is the only merge blocker

`pnpm merge-to-dev` runs `pnpm verify`, and verify is red on
`fork-universes:check`. **None of A–D fixes this.** It was missed in the original
four-item list.

What it is: `scripts/sync_fork_universes.py:168` compares raw bytes. The core's
`data/universes/*.json` are LF; the fork's bundled
`upgrades/data/*.universe.json` are CRLF. 29 of 63 pairs differ that way.

Verified by the orchestrator on one pair (`mage-p2`): core 173,111 bytes / 0 CR;
fork 181,708 bytes / 8,597 CR; **byte-equal after `CRLF→LF`**, and
`json.loads` equal. No item is added, dropped or altered. The page is unaffected
because `data.ts` loads these as static JSON imports, so the bundler parses at
build time and line endings never reach the parsed value.

Do: `python scripts/sync_fork_universes.py --write`, then re-check. It copies LF
over the fork's copies; it changes no data. It dirties 29 fork files, which need
a fork commit, and the fork's `PROVENANCE.md` convention expects a dated entry
per refresh.

**Caution — this recurs.** The same fix has been applied at least three times and
the drift came back each time. The root cause is ticket **283** (Python
generators omit `newline=` and write CRLF on Windows); 283 scopes itself to the
core repo and says committed bytes are safe there thanks to the core
`.gitattributes` catch-all — the **fork has no `.gitattributes` at all**, so the
fork case is a gap in 283's stated scope. Ticket **167** is the same failure
class for the sibling gate `check_engine_port_drift.py`. A durable fix is a
`.gitattributes` in the fork pinning `eol=lf` (would want `git add --renormalize`
in the same commit) or fixing 283 at the write sites. Decide whether you are
clearing the symptom to merge, or fixing the cause.

**Ticket 211 is NOT this.** 211 is closed; it owned the *absence* of a comparison
mechanism and was closed by building `sync_fork_universes.py` itself. No open
ticket currently owns this failure. Consider filing one.

*Not verified:* whether an unpushed fork commit blocks the merge. The
orchestrator grepped `scripts/check_lock_merge.py` for `pushed` and got **no
matches**, which suggests it does not — but that is a single grep, not a run.

### Then: the merge ask

`pnpm merge-to-dev` is the only supported door. **The owner must ask explicitly**
— a combined "review and merge" is not enough, and neither is this document.

Why merge before A–D: the desktop slowness that B and C investigate **predates
this branch**. Measured: pre-Chunk-1 desktop full run **3551 s**
(`readback-3333-old.json`, field `elapsedS`) against the tip's **3419 s**
(`readback-3333-tip.json`) — marginally worse on the older build. So B and C
investigate pre-existing behaviour, not defects this branch introduced, and
nothing in A–D changes what this branch does.

### A. Verify-summary line (+ D's CI-skip finding folds in here)

**The finding:** CI never clones the fork. The string `tbc-new-fork` appears
**0 times** in `.github/workflows/verify.yml` (verified by `grep -c`); CI
restores only `vendor/wowsims` and `vendor/atlasloot`. Meanwhile **8 of the 30
`pnpm verify` steps** are fork-gated scripts that exit 0 with a skip message when
the fork is absent, and **7 vitest files** are `describe.skipIf(!forkPresent)` —
including the only behavioural proof that the ported engine matches the core
engine, and every bulk-screen test.

Consequence: a CI run that tested none of the tab, none of the ported engine and
none of the bulk path emits **the same green tick** as a full local run. Nothing
counts the difference.

Do: add a tail step to `verify` printing `gates: N ran, M skipped` with one line
per skip naming the reason. Each fork-gated script already prints its skip
message, so the summary can collect those plus the vitest skip count.

Done when: a local full run prints 0 skipped; a run with `vendor/tbc-new-fork`
renamed prints the 8 scripts and 7 test files as skipped with reasons; the CI log
shows the same.

Core-only. Touches no fork. `tdd` skill fits.

### D. Audit follow-ups (mostly folded into A)

File two tickets so the work is recorded: the CI-skip gap (closed by A — file it
anyway so the closure has a record) and the layout gate's skip paths.

**Layout gate:** `scripts/check_layout_gate.py` has five ways to skip, all
returning 0, and `merge_to_dev.py` blocks only on a non-zero return. So a merge
proceeds identically whether the layout was proven correct or never examined.
Note this is partly deliberate (CI has no fork). **The question of whether a
skipped gate should ever block a merge is an owner preference — ask, do not
decide.** The part that needs no decision is reporting: print
`layout: skipped (reason)` in A's summary and in `merge-to-dev`'s output.

**Ticket 390** already exists and is understood: a fixture test whose comment
promises a guard against an engine-version change that it does not implement.
Core-only and small; fix it in passing. Nothing is currently mis-replaying
(recordings key on a commit sha, not the `api-vN` string).

### B. Ticket 398 — the accuracy question

`.scratch/carry-forward/issues/398-go-native-vs-wasm-baseline-gap.md`.

The Go-native desktop build and the WASM build report baselines **2231.5** vs
**2072.2** DPS for apparently identical gear — a ~159 DPS (7.7%) gap on the
baseline sim, which uses the per-candidate loop route with **no screening
involved**. Both figures verified from the readback JSONs (`baselineDps`, and
again in the rendered `statusText`).

What is already ruled out, and how: not seed choice as far as code-reading goes;
the desktop engine is internally reproducible (old 2229.7 vs tip 2231.5); and the
WASM figure is corroborated by Chunk 1's independent readback (2071.9, matching
to 0.3 DPS). Config checks that pass: same phase (`phaseSet '5'`), same pool
(`eligibleCount` 617 both), no cap (`candidatesRequested 0` both), identical page
stat blocks.

**The complication that changes how you plan this:** neither readback records a
seed or an iteration count. The orchestrator searched both JSONs — `seed`,
`randomSeed` absent. So "both runs used `DEFAULT_SEEDS`" is an argument from
reading `rank.ts`, never a measurement. Treat it as a hypothesis.

Do: one fixed-gear, fixed-seed sim, native vs WASM, comparing one scalar —
the `engine-delta.md` pattern from
`.scratch/stage-gate/upstream-catchup-chunk1/`, which answered a similar question
in ~25 s of simulation with a cause attached. ADR-0033 Consequence 5 is the
worked example.

Two decisions before measuring, both stated in the ticket before the run:
1. Which native binary. The pinned `17a8fb28` CLI is on disk but may not be the
   fork's engine; building `wowsimcli` at `eb040855c` from the fork's own
   makefile recipe makes both sides the same source. `go1.25.4` and
   `libprotoc 35.1` are present; check `protoc-gen-go` first.
2. Write the pre-registered outcomes (what result means what) *before* running,
   per the ticket's own pattern.

**No committed P5 ret skeleton exists** — only
`data/presets/ret/p2.raid-sim-skeleton.json` (the same input ADR-0033 used). So
the measurement is P2 gear, and the ticket should state that limit.

If the answer is "they agree", the follow-up is making the harness record seed
and iterations — a small fork edit, which goes in the fork queue.

### C. Ticket 397 — the speed question

`.scratch/carry-forward/issues/397-desktop-bulk-screen-not-a-speed-win.md`.

**Rewrite the ticket's mechanism first.** It claims the Go bulk path runs
multi-stage convergence per chunk; `assertSingleStageChunk` holds chunks at 25
precisely so they stay single-stage and throws otherwise, and no integrity error
or fallback was recorded. That sentence came from a summary and is contradicted
by the code.

**The sharper measurement was already on disk and nobody had drawn it out.**
Verified by the orchestrator from the smoke JSONs: same binary, same 20
candidates, screening **on** = 264 s (`smoke-3333-cap20.json`), screening
**off** = 13 s (`smoke-3333-cap20-fallback.json`). That is ~20× with transport
held constant, which reframes 397 from "desktop vs web" into "why does enabling
screening cost 20× on the same machine".

Do: reproduce that cap-20 pair, confirm both runs produced the same rows so it is
like-for-like, then chase the two leads the planner named — the `asyncProgress`
poll volume (46503 vs 6786 across the two full runs) and the `WorkerPool(1)`
serialisation.

Done when: the ticket names a measured cost driver, or names the measurement that
ruled each lead out. **The fix is out of scope for this pass.**

*Caveat that limits any row-level comparison:* both full readbacks predate the
D6 parser fix, so **568 of 601** rows in `readback-3333-tip.json` and **565 of
601** in `readback-wasm-tip.json` have empty item keys (verified by counting).
Row-by-row comparison between those two files is limited to the ~32 above-cutoff
rows. The cross-transport T1 result in the review is thinner than it reads.

## Orchestration

| Item | Mode | Why |
| --- | --- | --- |
| E | plain session | One command, one gate to watch |
| A + D | plain session, `tdd` | Core-only, well-specified; stage-gate ceremony costs more than the work |
| B | plain session | A measurement with a pre-registered readout; a wrong plan costs a rerun |
| C (investigation) | plain session, `diagnosing-bugs` | Capped runs, cheap iterations |
| C (fix), **only if** it touches the Go bulk path or runner architecture | **stage-gate** | Fork engine/adapter code with a 3419 s full-pool re-verify cost. Decide after the investigation, not before |
| `parallel-phase` | **nowhere** | The fork tree is one index, so fork work is serial regardless; fan-out overhead buys nothing here |

**Session topology: separate sessions, serial — not one overseer.** The four
topics share nothing but a branch; there is no parallelism to manage; and B and C
may rewrite their own tickets, so an overseer planning all of them up front would
be planning C against a ticket C is about to refute. The decisive argument is the
one at the top of this document: an overseer holding four workstreams is a fourth
summary-copy step, and this branch has already shown what that costs.

Sessions: **E + merge**, **A + D**, **B**, **C**, then Chunk 3 (unchanged plan in
`.scratch/plans/upgrades-tab-finish-line.md`).

Each session: open the primary artifacts named here before relying on any number,
and end by writing its own handoff to `.scratch/handoffs/` with every number
cited by file and field.

## Fork queue — strictly serial, one working tree

`vendor/tbc-new-fork` is a **single shared working tree**; a worktree symlink
resolves to the same index and HEAD, so two agents doing fork work at once
corrupt each other. Order: E's universe refresh → B's harness edit if any →
C's fix if any → Chunk 3 → Chunk 5. Never two at once. Ask whether another
session is live before touching it; registration does not tell you.

## Environment traps (each one cost this session real time)

- **`cd X && git ...` breaks.** fnm emits an error that breaks the chain — it
  also breaks `cd X && grep`. Use `git -C <abs path>`.
- **Bare `pnpm` fails** (tool shells default to Node 20):
  `fnm exec --using=22 -- pnpm.cmd <cmd>` as its own command. For a script in
  another directory, `pnpm.cmd --dir <abs path> <script>` rather than a `cd`.
- **A pipe reports the last command's status.** Append `; echo "rc=${PIPESTATUS[0]}"`
  in the *same* call — a later tool call is a new shell and has lost it. This
  session produced a "green" gate run that had actually failed, exactly this way.
- **An exit code is not evidence work happened.** The Chunk 2 gate had a bug
  where a crashed harness left a stale passing JSON on disk and the gate read it.
  Confirm the artifact, not the status.
- **`git add <paths>` does not scope a commit** — pre-commit runs `lint-staged`
  against `*`, so every dirty file rides along. `git status` before each commit.
- **Ticket collisions:** use the strict `^39[0-9]-` form; a bare `^39` matches
  ticket 39. `NEXT` is currently **399** (397 and 398 were filed this session).
- **Prose under `docs/` must pass prettier**; `.scratch/` is exempt.
- Repo-wide recursive greps match 15 worktree copies and can time out — scope to
  a named directory.

## Do not

Push the fork, merge to `dev`, or merge to `main` without the owner's explicit
ask. `pnpm merge-to-dev` is the only door to `dev`; never a raw `git merge`,
never `TBC_ALLOW_DEV_MERGE=1`. `main` only receives `dev` on a checked §14 gate
in `docs/verification-log.md`.

# Plan v2: close ticket 156 after the 2026-08-16 session

Supersedes `plan.md` §2 (slice A done, B done, C blocked). Inputs:
`handoff-2026-08-16.md` (this folder) and the ticket's slice A-C comments.
Status: **proposed, not started.**

## 0. Where we are

- Replication crash fixed in core (`aec062b`) and fork (`151f5905d`).
- Engine loads in the served build; the signal that proves it is
  `GET /tbc/lib.wasm` in the http-server access log (handoff §3).
- **Blocker:** every screening sim in the browser throws, and
  `screenCandidate` swallows the throw (`packages/core/src/rank.ts:973-977`,
  fork `engine/rank.ts:686-690`), so a fully failed run exits green as
  "No upgrades found above the cutoff". No measurement can be trusted until
  (a) failure is disclosed and (b) the cause is removed.

The whole job is serial: A → B → C → D. E is independent housekeeping.

## A. Disclose screening failure (core + fork, TDD)

Behaviour to build — the screening path gets the same honesty the full path
already has (`candidateSkips`, `rank.ts:1045`):

1. A screening sim that throws records a skip row
   `{ itemId, kind: 'sim', stage: 'screen', message }` and the candidate is
   ranked as screened with the failure visible, not clamped to `~0.0`.
2. If **every** screening sim threw (no finite screen at all), `rankUpgrades`
   throws `RankError('sim-failed', …)` naming the count and the first
   message. Zero real signal must never become "no upgrades".
3. `onProgress` emits during screening (`stage: 'screening', done, total,
   failed`) so the tab's status line shows failures as they happen.

Tests, red first, at the `rankUpgrades` interface with racing on
(`fullPool` unset) and a runner that throws — `respondingSim` shape,
`packages/core/test/rank.test.ts:1104`:

- all screens throw → `RankError` code `sim-failed`, no ranking cached;
- one slot attempt throws, others succeed → row present, one skip row with
  `stage: 'screen'`, `screened.promoted` unaffected;
- CLI path (`fullPool: true`) untouched — existing tests stay green.

Fork: port the same diff to `engine/rank.ts` and render skip rows /
`sim-failed` in `upgrades_tab.tsx` (status line + substitutions drawer);
follow the §9.1a order (fork commit → E-W3 rerun → `PROVENANCE.md` hash →
`scripts/check_engine_port_drift.py`).

Done when: `pnpm verify` green in both repos; a served build run with a
deliberately broken screen (e.g. Iterations 0) shows the failure text on
the page. Commit per green slice.

## B. Find why browser screening sims throw — **answered 2026-08-16**

**The exception is known and the diagnosis is complete; the fix is now
ticket 212, and C is blocked on it.** Everything below is kept as the record
of how it was found.

The panic is `sim error (0): No item with id: <candidate id>`, raised in
Go's `NewItem` (`sim/core/database.go:419`) during environment construction,
before any iteration runs. 455 of 455 candidates failed. Cause: the WASM
target is built without `--tags=with_db`, so `ItemsByID` is filled only from
the per-request `player.Database` — and `compose()` sets `slot.equipment`
without ever setting `slot.database`, while the skeleton is captured once
from the *worn* gear. Every candidate is by definition unworn, so every
candidate sim panics. `wowsimcli` is built `--tags=with_db`, which is why no
CLI run could reproduce it.

**None of the four candidates in the table below was right.** Candidate 1 is
closest but wrong in mechanism: the ids are present in `db.json`; they are
missing from the *request*. Candidates 2-4 are ruled out — the panic precedes
iteration entirely.

The route worked exactly as planned: one run, read the per-row text slice A
discloses, no console handle. Note the surface reported
`visibilityState: 'hidden'` despite being Claude-in-Chrome on Brave, and the
page header showed Phase 2 while `localStorage` and the gear modal both read
Phase 3 — the header is not a phase indicator.

### Original instructions, kept for the record

Rebuild + serve per handoff §3, open the ret page, run once at Phase 3 with
Candidates empty, and read the exception text slice A now prints per
screened row. That is the primary route — no console handle needed.

**No `isDevMode()` gate for anything slice B relies on.** `isDevMode()` is
`import.meta.env.DEV`, false in the production build that B must measure
(the same gate hid `Ready, isWasm: true`; ticket 156 slice B comment). Only
if the per-row text is not enough to discriminate the candidates below does
A add a console handle, and then it is gated on a URL parameter
(`?upgradesDebug=1`) and exposes what the tab actually holds:
`window.__upgrades = { sim, skeleton, gearSource, lastInput }` — the tab
does not hold candidate requests; the engine composes them inside
`rankUpgrades`, so a probe composes one from the skeleton and gear source.

Record the exact exception string in the ticket. Candidates, in the order
to check, each with its discriminating check:

| # | Candidate | Check |
| - | --- | --- |
| 1 | `result.error` from the Go sim — an item/gem/enchant id in the swapped request that the fork's bundled DB lacks (fork `ret-p3.universe.json` has 394 entries vs 390 here, handoff §9) | error message names the id; cross-check the id against `ui/core/proto/db` |
| 2 | `raidMetrics.dps` missing — request shape from `compose()` differs from what `raidSimAsync` returns for 1000 iterations | log `result` before the `!dps` throw |
| 3 | Concurrency > workers on a 3-core machine (`DEFAULT_WORKER_COUNT` 4) | run with `new WasmSimRunner(1)`; if it passes, cap `concurrency` at `hardwareConcurrency` |
| 4 | Screening request identical to the baseline except iterations — a `simOptions.iterations` < some engine minimum | try 3000 on the same request |

After A, a full run also lists the failure text per row, so B can be read
off the page if the one-call route stalls.

Done when: the exception is in the ticket with the reproducing call, and the
fix (core, fork, or adapter) is committed with a test where the seam allows
one. If the cause is environment-only (candidate 3), the fix is in
`wasm_sim_runner.ts` and the ticket says which machine class it affects.

## C. Measure (unchanged from plan.md slice C, plus the screening counts)

**Blocked on ticket 212.** Until candidate sims stop panicking there is
nothing to time. When it unblocks, re-baseline from scratch: no browser run
in this ticket's history ever actually simmed a candidate, so every number
recorded before 2026-08-16 describes a run that did almost no work.

Precondition: after A and B, a Phase 3, Candidates-empty run at 3000 shows
non-zero screening deltas and ≥ 1 promoted row (`screened.promoted` absent
on some rows), and the access log shows `lib.wasm`.

Cells: 3000 and 5000 iterations, Candidates = 20, four runs each, discard
the first, report three. Per run record: wall-clock (MutationObserver on
`.upgrades-run-button`, no polling), screening sims issued, full sims
issued, promoted count, worker count, adapter `concurrency`,
`hardwareConcurrency` (3 on this box), `visibilityState` + `hasFocus()`,
phase confirmed **after** Run (handoff §3 revert trap).

Done when: table in `docs/plans/wowsims-tab/candidate-pool.md` §5 with the
machine caveat (handoff §10) and the spread stated; ticket 156's acceptance
boxes tick.

## D. Decide D7

Unchanged from `plan.md` slice D: apply §6.4's break-even (promoted ratio <
0.571 at 3000, < 0.735 at 5000) to C's numbers; one paragraph in
`docs/plans/wowsims-tab/plan.md` at D7, one of: racing off at 3000 / default
5000 / accept the loss.

## E. File, do not fix here (handoff §8) — **done, and three were fixed**

Tickets 208-211 filed 2026-08-16, before C as intended. Investigating each
one to write it up honestly turned out to cost about as much as fixing it, so
three are already closed. Only 211's missing sync check is deferred.

1. **208 — not a defect.** `candidateCap` slicing EP order is deliberate:
   candidate-pool.md §11 records Dean Q2 ("cap must apply after screening")
   and Beck Q2 ("ordering stays committed EP") as separately accepted, with
   the note that the two questions are distinct. Screening decides
   membership, EP decides rank among the survivors. Ticket kept as the
   record so this is not re-filed a third time.
2. **209 — fixed** (fork `fc8980a1a`). The drawer told users racing "was not
   shipped"; it is always on in the browser. Both the rendered string and the
   comment now describe what runs.
3. **210 — fixed** (same commit). The placeholder rendered a raw `{{count}}`
   until a run finished and then lagged a run behind. `eligibleCount` is a
   pure synchronous filter, so the old comment's premise ("not known until
   Run is clicked") was false; it now refreshes at construction and on every
   settings change.
4. **211 — data fixed** (fork `5e26fa0d8`), mechanism still open. The "394 vs
   390, probably benign" reading was wrong three ways: **all six** universes
   had drifted, ret-p3 had 300 of 384 shared entries differing in content,
   and the differences were deliberate core decisions the stale copy was
   reverting — six SME-flagged ret trinkets/librams missing from the browser
   pool (`c718d38`), and stub-only-effect items still present that ticket
   171's ruling excludes (`1fcfcaf`). Copies refreshed; **no check yet stops
   it recurring**, which is what 211 now owns.

Both 209 and 210 are i18n strings, so neither is verified against a served
build. Slice B rebuilds and serves anyway — confirm both there.

## Lanes and budget

- A: workhorse, TDD, both repos — one session.
- B: workhorse driving Claude in Chrome on Brave; one call, then a fix —
  half a session, unless candidate 1 turns into a data-pipeline job
  (`data-pipeline-work` skill).
- C: workhorse, one session (8 timed runs ≤ 5 min each + one rebuild).
- D: design lane, one paragraph.
- E: ten minutes, any lane.

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

## B. Find why browser screening sims throw

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

## E. File, do not fix here (handoff §8) — **done**

Filed 2026-08-16, before C as intended:

1. `candidateCap` slices in EP order while the code around it says the sim
   picks — ticket 208.
2. Assumptions drawer says racing was not shipped — ticket 209.
3. `{{count}} / {{count}}` placeholder on load — ticket 210. Also records
   the lagging-indicator half, which is the part that costs measurement time.
4. Fork bundle vs `data/universes/ret-p3.json` — ticket 211. **The "394 vs
   390, probably benign" reading was wrong**: it is a 16-item symmetric
   difference (10 fork-only, 6 core-only) concentrated in trinkets and
   librams, including Darkmoon Card: Crusade and Hourglass of the Unraveller
   missing from the browser pool entirely. The two surfaces rank from
   different candidate sets.

## Lanes and budget

- A: workhorse, TDD, both repos — one session.
- B: workhorse driving Claude in Chrome on Brave; one call, then a fix —
  half a session, unless candidate 1 turns into a data-pipeline job
  (`data-pipeline-work` skill).
- C: workhorse, one session (8 timed runs ≤ 5 min each + one rebuild).
- D: design lane, one paragraph.
- E: ten minutes, any lane.

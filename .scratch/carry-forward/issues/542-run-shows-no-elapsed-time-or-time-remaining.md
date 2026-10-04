Status: closed
Type: feature
Origin: owner request in chat, 2026-10-02 ("we should have this", with a screenshot of the Bulk tab's progress dialog); no review round
Blocks: none
Blocked by: none
Related: 281

# A running Upgrades tab shows no elapsed time and no time remaining

## What the owner asked for

A screenshot of the Bulk tab's "Bulk Sim" progress dialog mid-run, with the
words "we should have this". That dialog shows, top to bottom:

- the current phase by name ("Running finalist tie-breaker rounds") and its
  step count (3/6), with a bar;
- "Elapsed Time: 7m 15s", ticking;
- iterations complete out of the total (57020 / 150000);
- an estimate of time remaining ("2m 10s remaining");
- a Cancel button.

## What the Upgrades tab shows today

Line numbers are from fork commit `cdb423505` on `feat/upgrades-tab`.

- While running: one status line, "Simming 243/277… (240 rows landed)", and a
  bar that is determinate only during the `simming` stage
  (`upgrades_tab.tsx:2130-2143`, ticket 281).
- No elapsed time until the run is done; then "Took Ns" under the table
  (`upgrades_tab.tsx:2629-2631`). A stopped run shows none (ticket 460).
- No time-remaining estimate at any point.
- Stop already exists, so Cancel is covered.

So the gap is the two time figures. Phase naming is partly there: the
`simming` count already includes the paired-replication re-sims of the top
rows (`rank.ts:1556-1561`, `rank.ts:1944-1951`), but the label does not say
when the run has moved from candidates to those re-sims.

## What the data supports

The `simming` total is fixed before the first candidate sim and already
counts the replication sims (`rank.ts:1556-1561`), so `done/total` is a
stable ratio for the whole sim phase. A remaining-time estimate of
`elapsed × (total − done) / done` needs nothing from the engine. Whether it
is accurate is **untested**: candidate sims and replication sims may not cost
the same, and the stages before `simming` (resolving, building the pool) are
not in the ratio at all.

The Bulk dialog's timer is a 100 ms `setInterval` started on `show()`
(`progress_tracker_modal.tsx:122-126`) and formats under a minute as `7.3s`,
otherwise `7m 15s` (`progress_tracker_modal.tsx:178-190`). Reusing that
format keeps the site's one idiom, as ticket 281 did for the bar.

## Done when

- A running tab shows elapsed time that ticks from the moment Run is pressed.
- During `simming`, it shows an estimate of time remaining, hidden until
  enough sims have finished for the estimate not to swing wildly (pick the
  threshold from a measured run, not a guess).
- The status line says when the run is re-simming the top rows rather than
  simming candidates, if that can be told apart without an engine change;
  otherwise record why not.
- The ticking figure does not flood assistive tech: the live region keeps
  announcing state changes only (ticket 446's progressbar naming stays).
- Checked live on :5173 on one full feral run: the remaining-time estimate
  shown at 50% done is within a stated error of the actual remaining time,
  and the error is written in the close note.

## Comments

**2026-10-02, owner:** "this is a popover with better stlying etc than what
we have. use our orchestration system." So the request is the whole dialog
presentation — a popover holding phase, bar, elapsed, remaining and cancel,
styled like the Bulk dialog — not only the two time figures added to the
existing status line. Scope widened accordingly; run through `stage-gate`
under `.scratch/stage-gate/run-progress-popover/`.

**2026-10-03, renumbered:** first filed as 537 on a side branch (`ad2802bb`);
that number was taken on `feat/tab-signoff-followups` by
`537-gear-change-mid-run-not-marked-stale.md`, so this ticket moved to 542
when the work was re-branched off `dev` as `feat/run-progress-panel`. Stage
artifacts keep the folder name `run-progress-popover` and may say 537.

**2026-10-03, owner:** "If a popover makes less sense (it's likely not
popping over anything with no results yet) you can have a similarly inspired
component that fits the area we have to work with (probably more a thing for
desktop)". So the target is a Bulk-dialog-inspired progress component that
fits the tab's own area, designed for desktop first; it need not float or
block.

**2026-10-03, closed** (stage-gate `run-progress-popover`, chunk K3b).
H below means `.scratch/handoffs/542-run-progress/`.

What shipped:

- While a run is going, the tab shows a progress component at the top of
  the results area, styled after the Bulk Sim dialog: a "Ranking upgrades"
  title over a divider; on the left the phase name, a bar and the
  done/total count; on the right Elapsed Time (ticking every 100 ms from
  the Run click, in the Bulk dialog's format), rows landed, time remaining
  and a Stop button with the Bulk dialog's cancel styling.
- Phase names follow the engine's event order with no engine edit:
  preparing (the existing stage labels), "Simming candidates", "Measuring
  set bonuses", "Re-simming the top rows", "Ranking results…". On run 2
  the phase sequence was preparing, candidates, set-bonuses, replication,
  ranking, and "Measuring set bonuses" started at done = boundary = 365
  (`H/facts-run2.json` `phaseSequence`, `setBonusesAtDone`).
- Status line: while running, the one-line status and thin bar are
  replaced by the component (the status row is hidden, so no empty row
  sits above it). The live-region announcement at Run is unchanged,
  "Starting… (0 rows landed)", with 2 announcement changes per run;
  nothing ticks into it (`announceFirstText`, `announceChanges`,
  `panelAriaLive` 0). The done, stopped, error and stale states render as
  before; the stale warning still shows after a run where an input
  changed (K3a check (c)). "Took" and the stopped state are unchanged;
  ticket 460 is already closed on this branch and this work does not
  touch it.
- Deliberate deviations from the Bulk look: the done/total count is
  gray-500 instead of gray-600, for contrast (gray-600 measures 3.82:1 and
  fails AA); the title is left-aligned for the wide layout.
- Mount: owner ruling of 2026-10-03 (above), an in-tab component, not a
  popover or modal.

Estimator:

- Shipped: the phased estimator with a per-candidate slowdown term and an
  exact re-sim count. Constants, all fitted on run 1 (in sample): kappa
  0.3221, psi 50.993, slowdown 0.003064, `showFromFraction` 0.35,
  `minCandidatesDone` 10. The re-sim count comes from rows that clear the
  cutoff as they land (exact once the last candidate finishes, projected
  before). Why: linear read -0.4504 at 50% on run 1 (out of sample), and
  the round-3 phased estimator read -0.2817 even in sample; the slowdown
  version reads -0.0382 in sample (`H/decision.md`).
- Run 1 (2026-10-03, fork 9b11bf214, feral `/tbc/druid/feralcat/`, phase
  3, preset "Phase 2 / BiS 6%", 3000 iterations, cold headless profile,
  concurrency 4, T 401): G (set phase) 23.19 s, r_rep/r_c = 585.8/454.7 =
  1.29. Linear e50 -0.4504 (out of sample).
- **Run 2 (the gate): e50_shown -0.0662**, inside the bound |e50| <= 0.25
  written before the run. Shown 127.68 s at 50% done against 136.73 s
  actual. 2026-10-03, fork 4d447adcd, the same setup as run 1, T 401, Took
  210 s. Re-run: `node .scratch/handoffs/542-run-progress/replay.mjs
  .scratch/handoffs/542-run-progress/trace-run2.json --shown`. Information
  only: e75_shown +0.0021; replication count matched: 9 rows cleared the
  cutoff, top-N 8 of them were re-simmed, and 36 re-sims = 4 extra seeds ×
  (baseline + 8 rows) were predicted and seen. Run 2 did not exercise the
  exact-count branch (9 rows ≥ top-N 8); the dry run did (5 rows, 24
  re-sims, done 78 of 90).
- Run-2 information checks: (i) slowdown refitted on run 2 is 0.00318473,
  inside [0.0015, 0.0046]; (ii) the raw stability fraction of the shown
  values is 0.3516 (<= 0.45); (iii) main-thread long tasks fill 0.9897 of
  wall time in the last 30-candidate window against 0.1440 in the first.
  All ok.
- Why later candidates cost more (round-4 finding): late in the candidate
  phase busy cores fall (run 1 from about the 219th candidate; run 2 one
  window earlier: 14.7-15.8 in the windows before d 189, 13.7 in d 189-218,
  9.4 in the last window, d 309-338) and wall time per candidate rises,
  while the sim server's CPU per candidate does not rise with it
  (5.15-5.84 CPU-s per candidate from d 249 on, inside the 2.78-7.94 of
  the windows before d 219; the d 219-248 window reads 9.94). Re-run: `node
  .scratch/handoffs/542-run-progress/replay.mjs
  .scratch/handoffs/542-run-progress/trace-run2.json --shown` prints these
  as its `window` lines; run 1: `node
  .scratch/handoffs/542-run-progress/replay.mjs
  .scratch/handoffs/542-run-progress/trace-run1.json --windows`. Check (iii)
  supports a client-side cause; that the long tasks are the running-table
  rebuilds is a hypothesis (render time per function not measured). The
  running table is rebuilt in full twice per finished candidate. Ticket
  543 tracks the fix; any such change requires refitting slowdown, kappa
  and psi.

Known limits:

- One setup, one machine (feral, 364 candidates, fresh profile), measured
  on the dev path: vite on :5174 plus the Go sim server on :3333. The
  players' WASM-worker path is not measured; an old WASM-path run spent
  most of its time in re-sims (C41 in
  `.scratch/stage-gate/run-progress-popover/plan.md`), so accuracy there is
  untested.
- Hypothesis, untested: many saved gear sets slow the table rebuild, so the
  estimate reads low there. Pools much longer than 364 candidates likely
  read low late (hypothesis).
- Small pools read high: on the dry run (candidate cap 40; 53 candidates
  simmed, because the cap keeps every owned row) the 50% estimate read
  +0.66. The set phase does shrink with the pool: 7.10 s on the dry run
  against 24.85 s on run 2, from the first `set-bonuses` sample to the
  next phase in `H/trace-dry.json` and `H/trace-run2.json`. Hypothesis,
  untested: psi, fitted on run 1's full pool as about 51 candidate-times,
  overstates a small pool's set phase, which on the dry run took about 26
  candidate-times (7.10 s at 14.5 s per 53 candidates).

Load control: run 1 and run 2 each passed the 60 s quiet gate on the first
attempt and replayed `load: clean`; no discards. Run 2: 46 monitor samples,
own sockets seen (max 4), no foreign socket, Claude app probe sockets max 0.
Residual risk: load that does not go through :3333 and slows the whole run
evenly is not detected; it scales candidate and re-sim times together.

Checks and records:

- Captures (dry run, cap 40, 53 candidates simmed):
  `H/542-*-1280-*.png`, `H/facts.json`,
  `H/a11y.json` (no axe violations); run 2: `H/trace-run2.json`,
  `H/trace-run2.load.jsonl`, `H/facts-run2.json`.
- Visual verdict: pass, `.scratch/handoffs/visual-review-542-run-progress-K3.md`
  (two advisory notes: one clip caught the bar mid-transition; axe ran on
  one phase only).
- Fork branch `feat/run-progress-542` (worktree `vendor/tbc-new-fork`),
  based on 9b11bf214: 88ff18586, 8fcdc6fb9, 5420f9cd3, 4d447adcd. No
  ported-engine file changed. Pin: `data/wowsims-fork.lock.json` at
  4d447adcd (repo commit f46e1a19); `pnpm verify` rc=0; fork-gated suites
  rc=0 (229 passed, 1 skipped). The fork branch is not merged into
  `feat/upgrades-tab` or pushed.
- Pre-merge review fixes: fork 8dfb8a292, 4bc719eaf, c5a2d9017, 7d4d69d6a
  on the same branch (comments, one Stop handler, singular "1 row
  landed"); pin moved to 7d4d69d6a with the lock's `branch` set to
  `feat/run-progress-542`. `pnpm verify` rc=0; fork-gated suites rc=0 (233
  passed, 1 skipped); `pnpm layout-gate:check` rc=0 (76 assertions passed).
- `tab-fixtures:check` warns that all five fixtures are stale, as it did
  before the re-pin; this change does not alter the ranking inputs.
- Flags: the `layout` verify gate skipped because the fork worktree has no
  built `dist/` (`make host` not run), so the layout gate did not run on
  this change. At 375 px the running results table overflows the viewport
  (layout width 503 px) while the progress component fits (7 to 368 px);
  the table is outside this ticket and likely older (hypothesis, not
  measured at 9b11bf214).

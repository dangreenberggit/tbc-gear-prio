# Orchestration plan — resolve tickets 90–99 (set-bonus value)

Written 2026-08-10 by the reviewing session. Executor: an Opus-high
orchestrator agent, using its own subagents for most work. The reviewing
session reviews at the end; the user reviews after that. **Do not land.**

## Ground rules (binding)

- Branch: `feat/set-bonus-value` (current). Commit per green slice. `pnpm
  verify` before any push; do not push unless already configured to.
- Follow AGENTS.md: comment policy, durable-claims rule (every causal claim
  in a committed artifact points at a re-runnable command or says
  hypothesis/untested), TDD for code fixes, no new architectural seams.
- **Stop after `pre-merge-review` writes `docs/reviews/feat-set-bonus-value.md`.
  Never `pnpm land`, never merge, never set `TBC_ALLOW_DEV_MERGE`.**
- Read first: `.scratch/handoffs/set-bonus-4pc-invisible-investigation.md`
  (the "Read this first" reliability section is load-bearing — many earlier
  figures were retracted; trust only what it lists as surviving), all ten
  tickets under `.scratch/carry-forward/issues/9*.md`, and
  `.scratch/set-bonus-value/*.md` as needed.
- **Sims are required.** Tickets 92 and 99 exist because no sims were ever
  run. Run them (wowsimcli via `pnpm fetch:wowsimcli`; Route B pattern in
  `scripts/five_seed_spread.py`; seeds [11,22,33,44,55], 3000 iterations).
  Sanity-check every measured figure against the upstream BiS gear sets
  (`vendor/wowsims/feral_p3_*.gear.json`) and TBC domain knowledge before
  writing it into any ticket disposition or code.

## Work order

### Wave 1 — parallel where disjoint

- **T93 (docs, disjoint):** fix `brokenSetBonuses` docstring
  (`packages/core/src/set-value.ts:220-234`) to the `(k−1)·B` closed form
  (k=1 → zero inflation), fix/drop the V0b citation, and correct
  `.scratch/set-bonus-value/verification.md:52-60`. Note: touches
  set-value.ts comments only — coordinate with T90's editor or serialize.
- **T99 (measurement, disjoint — new script only):** standalone Python
  script (`.scratch` outputs, no packages/core changes). Build the 0/2/4
  ladder per the ticket: A4 = `feral_p3_9p.gear.json` as committed; A2/A0
  with B-side items 32377/32252/32347/32271 (re-verify each is
  `setName: None` in `vendor/wowsims/db.json` before use); S1–S4 singles.
  Guard sim first: unmodified reference set must land in a plausible P3
  feral DPS ballpark. Then the Malorne 2pc variant on a phase-appropriate
  (T4-era) reference set. Record results + exact commands in a
  `.scratch/set-bonus-value/measurements-<date>.md`.
- **T90 (code):** keep any figure with non-empty `breaks` out of the sort
  key and cutoff comparison, still disclosed in the Set potential panel.
  TDD. Touches `view.ts` / `set-value.ts` / report rules — serialize with
  T95/T91.
- **T95 (code, small):** gate `applySetContext` (`rank.ts:1119-1152`) so
  owned rows get no prospective bonus; test first. Serialize with T90/T91
  (shared files).

### Wave 2 — after T99's numbers exist

- **T92:** run the single stat-identical-swap sim to measure the B the
  pipeline actually charges; compare against T99's isolated Malorne figure.
  Agreement corroborates the single-scalar-toll model; disagreement is
  itself the finding. Write the disposition either way.
- **T97:** check T99's 4pc figure against the mechanics band (~60–120,
  centre ~95). Also close the sourcing gap: diff `verification.md` V1's
  transcription against pinned `sim/druid/item_sets.go` at
  `8aa378b3671a0923fd11fb34b4b3753e53f20c9b`. Record pass/fail.

### Wave 3 — after Wave 1 code + measurements

- **T91:** implement design option **(d) package-as-card** (design review's
  recommended destination): surface set completion in the Set potential
  panel with package contents (`packageItemIds`) and prominent `breaks`;
  do NOT smear per-row numbers. Fall back to (a) only if the measurements
  force per-row credit. Record the decision + why in the ticket.
- **T94:** implement the `setId`-join dead-zone classification in the
  engine (join worn item against `data/items/index.json`), distinguishing
  set-break toll / benign / unique-effect / thin-pool. Also verify ret via
  one `pnpm rank` on ret-p3 `--with-set-potential` if cheap.
- **T98:** the two gates as warnings (never hard failures): (1)
  implausible-magnitude, calibrated from T99's measured figures, not a flat
  constant; (2) all-negative-slot, reusing T94's join. Do not re-implement
  T90's breaks-suppression here.
- **T96:** re-check after the above: does the BiS-badge-vs-below-cutoff
  contradiction dissolve? If not, add a reconciling disclosure on the row.
  Record disposition.

### Close-out

1. Update every ticket's Status/disposition (close what's fixed, record
   measured figures with re-run commands).
2. `pnpm verify` green on the integrated tip; commits per slice already made.
3. Run the `pre-merge-review` skill → `docs/reviews/<branch>.md`, commit it.
4. Write a final summary handoff at
   `.scratch/handoffs/set-bonus-resolution-<date>.md`: what landed, measured
   numbers, open questions. **Stop. Do not land.**

## Subagent guidance for the orchestrator

- Use worktree isolation (parallel-phase skill) only where slices are
  actually disjoint; T90/T95/T91 share files — do those serially or in one
  worker. T93 and T99 can run parallel to them.
- Sharp checks (does this measurement support this conclusion? is this
  bonus magnitude plausible for TBC?) go to a capable reviewer subagent,
  not a cheap worker.
- BiS sanity: upstream P3 BiS equips all four Thunderheart pieces; any
  result implying T6 chest/shoulders are large downgrades on P3 gear, or a
  T4 2pc worth >5% of baseline, is suspect — investigate before accepting.

Status: closed
Type: task
Origin: .scratch/carry-forward/issues/452-end-ret-feralcat-tunnel-vision-support-all-dps-specs.md (slicing, 2026-11-06, slice B)
Serves: .scratch/carry-forward/issues/452-end-ret-feralcat-tunnel-vision-support-all-dps-specs.md
Blocks: none
Blocked by: 803
Related: 452, 754, 803

# Run and judge Survival hunter and Arms warrior at phases 4 and 5

## Why

The owner ruled on 2026-11-06 that Survival hunter and Arms warrior are in
the epic's spec list (452 Notes). The p45 pass ran the other 11 specs and
left these two: "Survival and Arms runs after ticket 754 is fixed"
(`docs/live-runs/2026-11-03-p45-dps-pass.md:234-235`). Ticket 754
(`.scratch/carry-forward/issues/754-tab-harness-cannot-load-presets-on-six-spec-pages.md`)
is closed, so the harness can now load a gear set whose name another spec
on the same page also uses.

Slice B works ticket 803 first, in the same pair: today these two pages
gem candidates with the Beast Mastery and Fury EP weights, and runs made
before the fix would judge that known defect again.

## What to do

Four uncapped live runs, after 803 is fixed: Survival at phases 4 and 5,
Arms at phases 4 and 5. Each run starts from the preset gear of the phase
before the phase it ranks (owner rule, ticket 560 brief, quoted in
`scripts/check_desktop_tab.py:101-102`). The harness flags
(`scripts/tab-harness/run-tab-cdp.mjs:50-62`):

- Survival phase 4: `--preset-tab "Phase 3" --preset-spec Survival --preset "DW - 6% hit"`;
  phase 5 the same with `"Phase 4"`. This is the chip Beast Mastery ran
  with in the p45 pass (its run table).
- Arms phase 4: `--preset-tab "Phase 3" --preset-spec Arms --preset "BIS"`;
  phase 5 the same with `"Phase 4"`. Check the spec label with
  `--preset "?"`, which lists the chips as "[Spec] chip".

If a start set is missing or the harness cannot select it, stop and report
it; do not start from another set.

Judge each run with the `sme-rank-review` skill, as the p45 pass did, and
write a dated report under `docs/live-runs/` in the p45 report's form.
File a ticket for each defect that no open ticket covers. Follow the p45
report's § Setup for the run commands, and ticket 754's Comments for
running from the sandbox (one script that starts the servers, runs the
harness and stops the servers). Start the servers from slice B's pair,
whose fork has 803's fix, not from the checkout ticket 754 names.

Wall time to expect: in the p45 pass the two hunter runs took 1552 s and
1547 s, while they shared a wave with enhancement, and the warrior batch
of 2 runs took 1424 s (`docs/live-runs/2026-11-03-p45-dps-pass.md`, run
table and § Wall time).

## Done when

803 is closed on the branch. The four runs finish, each has an SME
verdict, the report is committed, each new defect has a ticket, and the
branch's `pre-merge-review` file exists.

## Comments

- 2026-11-06: the four runs finished and each has an SME verdict
  (`trust-with-caveats` for all four). Report:
  `docs/live-runs/2026-11-06-survival-arms-p45.md`. New ticket: 810 (the
  other build's BiS picks show as BiS losses on the Arms and Survival
  tabs). Comments added to 750 and 746. Still open here: the branch's
  `pre-merge-review` file, and a whole `pnpm verify`, which this sandbox
  cannot run (read-only `node_modules`).
- 2026-11-06: the run commands differ from the ones under "What to do".
  Each run added `--build <chip>`, which loads the site's Survival or
  Arms "Preset Configurations" build before the gear chip (harness flag
  added in commit `12014bfe`). A gear chip changes only the gear, so
  without it the page kept its Beast Mastery or Fury talents. The build
  also sets the rotation, buffs, consumables and encounter, so the runs
  use the build's values for those too (`docs/live-runs/2026-11-06-survival-arms-p45.md`,
  "Build chip, then gear chip").
- 2026-11-06: closed. Done when holds: 803 is closed; the four runs (the
  Arms runs redone with the P3 set after review finding D1) each have an
  SME verdict; the report `docs/live-runs/2026-11-06-survival-arms-p45.md`
  is committed; the one new defect has ticket 810; the review file
  `docs/reviews/feat-452-survival-arms.md` exists. Still open before any
  push or merge of the branch: a whole `pnpm verify` (not part of this
  ticket's Done when).

Verified by: docs/reviews/feat-452-survival-arms.md (the branch review the closing note names) and docs/live-runs/2026-11-06-survival-arms-p45.md

# Survival hunter and Arms warrior at phases 4 and 5 (2026-11-06)

## Verdict

The four runs that stand are Survival hunter at phases 4 and 5, and Arms
warrior at phases 4 and 5 run again with the P3 Arms EP weights after
review finding D1. All four finished and count: each JSON has
`done: true`, `panicHit: false`, `runTimedOut: false` and
`runFailed: false`, and the harness exited 0 for each (`runs.harness.log`
for Survival, `runs-r2.harness.log` for Arms). The SME seats rated all
four `trust-with-caveats` and none `do-not-trust`
(`.scratch/agent-reports/2026-11-06-general-task-sme-survival.md` and
`.scratch/agent-reports/2026-11-06-general-task-sme-arms.md`, § Verdict;
for the Arms re-runs, the Arms report § Round 2 runs: "pass with notes
(unchanged)"). The first Arms runs used the P1 Arms weights and are
superseded (§ Arms re-run with P3 weights).

Each run loaded the site's own build for the spec and phase (talents,
rotation, buffs, debuffs, consumables, encounter) and then the previous
phase's gear set. How the items that wowsims changes in its next-phase set
rank:

- Arms phase 4: all three items its Phase 4 set changes are above the
  cutoff. Arms phase 5: 13 of the 15 are. Of the two below it,
  Demontooth Shoulderpads (+0.1) breaks the worn 4-piece tier 6 set
  (ticket 523), and Hard Khorium Band (+2.9) has about the same stats as
  the Signet of Primal Wrath it replaces (SME Arms report, § Q1 table;
  values from `arms-p5-r2.json`). In the superseded P1 run, Leggings of
  the Immortal Night, whose hit the character cannot use, was also below
  the cutoff, at +2.4; it is now +3.3.
- Survival phase 4: two of the five are gains (Signet of Primal Wrath
  +25.7, Dagger of Bad Mojo +7.3). Cursed Vision of Sargeras and
  Gronnstalker's Leggings are losses as single swaps against the worn
  4-piece set (ticket 523). Berserker's Call is a small loss (-4.4):
  wowsims swaps it in for Madness of the Betrayer only after Cursed Vision
  adds hit, and in Phase 3 gear Madness's hit is still needed for the cap
  (SME Survival report, § Q1).
- Survival phase 5: Thori'dal leads at +210.6; the Sunwell pieces for
  slots of the worn 4-piece set are losses as single swaps (ticket 523).

The pass filed one new ticket (810: the other build's BiS picks show as
BiS losses), added comments to tickets 750 and 746, and filed nothing for
the SME's second draft, because ticket 687 already decided it (§ Not
filed). It closes the part of epic 452's bullet 1 that the p45 report
left open for these two specs (§ For epic 452).

## Setup

- **Checkout:** the T3 worktree
  `/home/daniel/.t3/worktrees/tbc-gear-prio/feat-452-survival-arms`,
  branch `feat/452-survival-arms` at `12014bfe`, with its own fork clone
  at `vendor/tbc-new-fork`, branch `feat/452-survival-arms` at
  `786a08f96`. The harness folder and the fork were clean when the batch
  started (`runs.harness.log` header). The Arms re-runs ran at main
  `49c32e07` with the fork at `a92fdc2f1`, both clean
  (`runs-r2.harness.log` header). `a92fdc2f1` has the same tree as
  `5d1ecb595`, the fork commit the branch now pins
  (`data/wowsims-fork.lock.json` `commit`; `git -C vendor/tbc-new-fork
diff --stat a92fdc2f1 5d1ecb595` prints nothing).
- **Pair built by hand, not with `pnpm wt:pair`:** `wt:pair` puts the pair
  at `<parent of the main checkout>/tbc-wt/<name>`
  (`docs/agents/paired-worktrees.md:35`). This sandbox mounts
  `/home/daniel/Code/lulz/tbc-wt` and the main checkout's fork
  `.git` read-only (`test -w` prints not writable for both). The fork is a
  `git clone` of the main checkout's fork clone (`git -C
vendor/tbc-new-fork remote -v` names
  `/home/daniel/Code/lulz/tbc-gear-prio/vendor/tbc-new-fork`). The vendor
  inputs were copied in (`ls vendor/`: atlasloot, tbc-new-fork, wowsims,
  wowsimcli). `npm ci` was run for the fork; its `node_modules` is a real
  folder, not a symlink (`ls -ld vendor/tbc-new-fork/node_modules`); that
  `npm ci` made it is the session's account, not checked by the report
  writer.
- **Build:** the fork's `dist/` was built with tsx run as
  `node --import <tsx loader>`, because `npx tsx` fails on its IPC socket
  with `listen EPERM` in the sandbox, as in the p45 pass
  (`docs/live-runs/2026-11-03-p45-dps-pass.md` § Setup). The build command
  is the session's account; the `dist` stamp is 2026-11-06 09:49 for the
  first batch (`runs.harness.log`) and 11:16 for the Arms re-runs
  (`runs-r2.harness.log`).
- **Servers:** one script, `run-batch.sh`, starts the backend
  (`node scripts/dev-tab.mjs backend`, `GOFLAGS=-buildvcs=false`) and
  vite, runs the harness once per run, and stops both. Vite is started
  directly with `--configLoader runner`, not through `dev-tab.mjs
frontend`. The root `node_modules` is a symlink to the main checkout's
  `node_modules` (`ls -la node_modules`), which the sandbox mounts
  read-only, and vite's default config loader writes into it:
  `failed-prep-1/prep.vite.log:4` shows `EROFS: read-only file system`.
- **Harness:** the tracked `scripts/tab-harness/run-tab-cdp.mjs` at
  `12014bfe`, which adds `--build <chip>`
  (`.scratch/agent-reports/2026-11-06-general-task-harness-talents.md`).
  It is the same at `49c32e07` (`git diff --stat 12014bfe 49c32e07 --
scripts/tab-harness` prints nothing).
  Headless Chromium 1200 through the p45 pass's `PLAYWRIGHT_BROWSERS_PATH`
  shim in the main checkout.
- **Build chip, then gear chip:** each run clicked the site's "Preset
  Configurations" build chip (`--build`) for the spec and the previous
  phase, then that phase's gear chip (`--preset`)
  (the `== cmd:` lines in `runs.harness.log` and `runs-r2.harness.log`).
  So talents, rotation,
  buffs, debuffs, consumables and encounter are the build's own. The p45
  runs used the page defaults instead, so a Survival or Arms run differs
  from the p45 Beast Mastery or Fury run in more than talents (harness
  report § Choice and why).
- **First batch stopped:** the first batch ran with the gear chip only
  (`stopped-runs-1-default-talents/runs.harness.log`: HEAD `0b1b0b59`, no
  `--build`) and was stopped during its first run, because a gear chip
  does not set talents, so the page kept its Beast Mastery or Fury
  defaults. Its smoke run had Beast Mastery talents and a baseline of 3441
  on Survival gear, against 2725.9 with the Survival build (harness
  report § Live runs).
- **EP weights:** no run output names the EP set. The assumptions line
  reads "EP weights: written for P1" in the Survival runs and "written
  for P3" in the Arms runs that stand (`assumptionsLine` in each JSON).
  Every hunter and warrior set is written for P1 except `warrior-arms`,
  which is P3 (`EP_WEIGHTS_PHASE_BY_SET`, fork
  `ui/features/upgrades/model/data/data.ts:106-120` at `5d1ecb595`), so on
  the warrior page "written for P3" is the Arms set. The Survival set is
  inferred from the recorded `talentPointsByTree` and the rule in
  `data.ts:37-58`: a build takes the variant set when the variant's tree
  has more than zero points and strictly more than each other tree.
  7/20/34 gives `hunter-sv`, 33/28/0 gives `warrior-arms`. The Survival
  runs ran at fork `786a08f96`, before the "more than zero" test was
  added; it changes nothing for 7/20/34
  (`.scratch/agent-reports/2026-11-06-general-task-review-r1-fixes.md`,
  § Per finding, A1 / S1). The bundled Arms set is `P3_ARMS_EP_PRESET`
  since fork `3e72c5033` (review finding D1); the first Arms runs took
  `P1_ARMS_EP_PRESET` (§ Arms re-run with P3 weights). The P1 Survival
  weights equal Beast Mastery's number for number
  (`.scratch/agent-reports/2026-11-06-general-task-803-sv-arms-ep-weights.md`,
  § Hunter finding), so on the hunter page the 803 fix moves no weight
  today.
- **Start gear:** each run starts from the previous phase's preset
  (ticket 799, § What to do).
- **Re-run:** `timeout 3h bash .scratch/agent-reports/2026-11-06-452b-runs/run-batch.sh <name> '<harness args>'`,
  with the harness arguments from `runs.harness.log` (Survival) or
  `runs-r2.harness.log` (Arms). The run folder is gitignored; it exists
  only in this worktree.
- **Tickets:** numbers from slice B's range 810-819; `NEXT` read 805 and
  ticket 810 set it to 811. Ticket 811 came later, from the pre-merge
  review, and set it to 812.

## Runs

Run JSON, in `.scratch/agent-reports/2026-11-06-452b-runs/`:
`survival-p<phase>.json` and `arms-p<phase>-r2.json`. Talent points are
`character.talentPointsByTree` in each JSON; rc and wall are from
`runs.harness.log` for Survival and `runs-r2.harness.log` for Arms.

| Spec     | Phase | Build (chip)                   | Start set                | rc  | Wall (s) | Rows | Baseline DPS | Above cutoff | Talent points | SME verdict        |
| -------- | ----- | ------------------------------ | ------------------------ | --- | -------- | ---- | ------------ | ------------ | ------------- | ------------------ |
| Survival | 4     | Phase 3 [Survival] DW - 6% hit | Phase 3 / DW - 6% hit SV | 0   | 464      | 932  | 2725.9       | 4            | 7/20/34       | trust-with-caveats |
| Survival | 5     | Phase 4 [Survival] DW - 6% hit | Phase 4 / DW - 6% hit SV | 0   | 516      | 1165 | 2785.4       | 22           | 7/20/34       | trust-with-caveats |
| Arms     | 4     | Phase 3 [Arms] Arms            | Phase 3 / BIS Arms       | 0   | 384      | 1000 | 2331.6       | 6            | 33/28/0       | trust-with-caveats |
| Arms     | 5     | Phase 4 [Arms] Arms            | Phase 4 / BIS Arms       | 0   | 458      | 1249 | 2351.3       | 21           | 33/28/0       | trust-with-caveats |

In every run, rows equal `eligibleCount` minus the 16 distinct worn items
(948, 1181, 1016, 1265), so no eligible item was left without a row (SME
reports, § Q3). Re-run:
`python3 -I -c "import json;j=json.load(open('<file>'));print(j['baselineDps'],j['eligibleCount'],len(j['rows']),j['aboveCutoff'],j['character']['talentPointsByTree'])"`.

Baselines next to the p45 runs of the same page:

- Survival 2725.9 and 2785.4 against Beast Mastery 3530 and 3572.7 (0.77
  at phase 4). The SME found the gap plausible: the fork's committed test
  results give Survival without melee weaving at 0.73 of Beast Mastery
  with weaving on equal gear (`sim/hunter/TestHunter.results`, SME
  Survival report § Q2).
- Arms 2331.6 and 2351.3 against Fury 2778.5 and 2819.8 (0.839 and
  0.834). The SME found this plausible from game knowledge, recalled and
  unverified (SME Arms report § Q2).

## Arms re-run with P3 weights

Pre-merge review round 1, finding D1
(`docs/reviews/feat-452-survival-arms.md` § Domain), found that the tab
bundled `P1_ARMS_EP_PRESET` for Arms. Fork commit `3e72c5033` bundles
`P3_ARMS_EP_PRESET` in its place; it prices hit at 1.01 per point,
against 1.81 in the P1 set (SME Arms report § Round 2 runs). Both Arms
runs were done again with it. The first Arms runs, `arms-p4.json` and
`arms-p5.json` (fork `786a08f96`, "EP weights: written for P1"), are
superseded; they stay in the run folder for the comparison.

What changed, from `compare-arms-p4.out` and `compare-arms-p5.out` in the
run folder (re-run:
`python3 -I .scratch/agent-reports/2026-11-06-452b-runs/compare-runs.py <old.json> <new.json>`):

- The baselines are equal (2331.6 and 2351.3), and each pair of runs has
  the same rows by item and slot.
- Phase 4: the same 6 items are above the cutoff, and the top 14 rows
  are unchanged.
- Phase 5: Leggings of the Immortal Night moved from +2.4 to +3.3 and is
  now above the 3 DPS cutoff, so 21 items are above it, against 20.
- 125 rows at phase 4 and 205 at phase 5 moved by more than 0.5 DPS,
  most of them far below zero.

The SME's verdict on the re-runs is pass with notes for both, unchanged
from round 1 (SME Arms report § Round 2 runs). The SME explains the
leggings' move: they have three red sockets, and by the SME's sums of the
weights the P3 set fills them with Inscribed gems where the P1 set chose
Bold. The run JSON does not record which gems the tab chose, so this is
the SME's reading. The SME's round 1 estimate that the
change was too small to see in any row was wrong, and so was its guess at
which rows would show ticket 746's meta-gem repair; § Round 2 runs,
"Corrections to round 1", says so and names the rows that did move.

## Wall time

The first batch ran four runs one after another, from 17:02:54Z to
17:34:19Z: total wall 1883 s. The two Survival runs that stand took 464
and 516 s; its two Arms runs, 429 and 474 s, are superseded
(`runs.harness.log`). The Arms re-runs were a second batch of two runs,
from 18:16:23Z to 18:30:26Z: total wall 842 s; walls 384 and 458 s
(`runs-r2.harness.log`, `runs-r2.stdout`). Neither log records another
batch running beside it; other load on the machine was not recorded. In
the p45 pass the two Beast Mastery runs took
1552 and 1547 s while they shared a wave with enhancement, and the two
Fury runs 627 and 794 s (p45 report, run table). Why the Survival runs
took about a third of the Beast Mastery time was not measured: the
Survival build does not melee-weave, and these runs had no second batch
beside them (hypothesis, untested).

## Defects filed

| Ticket | Spec / phase                 | What the player sees                                                                                                                                                                                                                                                                                                                                                                                                                                                      |
| ------ | ---------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 810    | Arms p4, p5; Survival p4, p5 | The main table lists the other build's BiS picks as BiS items that lose DPS: on Arms at phase 4, five Fury-only items (Dreadboots of the Legion -6.3 to Midnight Chestguard -29.6), at phase 5 Angelista's Revenge +1.3; on Survival at both phases, five Beast Mastery-only items (Stormrage Signet Ring, Choker of Serrated Blades, Boneweave Girdle, Choker of Endless Nightmares, Shadowmoon Destroyer's Drape). Status `blocked`: its first step is an owner ruling. |

Ticket 810 starts with the owner question Q-810-bis-build: "Should BiS
tags follow only the loaded build's sets?" The tab does what ADR-0038
§ Preset phase and BiS tags says: every preset at the phase is a BiS
set. The ticket gives what each answer costs. The Survival SME seat did
not flag these rows. The report writer found them with
`python3 -I .scratch/agent-reports/2026-11-06-452b-runs/bis-group-check.py`,
which joins each below-cutoff main-table row to the gear sets that hold
it. The script reads the first Arms runs; with `arms-p4-r2` and
`arms-p5-r2` in its run list it prints the same Fury-only rows, with
Grips of Silent Justice at -17.6 in place of -17.

## Known defects seen again

| Ticket                   | Runs                      | What showed                                                                                                                                                                                                                                                                                                                                                                                                                                                    |
| ------------------------ | ------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 523 (open)               | Survival p4, p5; Arms p5  | Single swaps out of the worn 4-piece tier 6 set show as losses, and the paired move wowsims makes cannot be shown: Survival p4 Cursed Vision of Sargeras -56.9 and Gronnstalker's Leggings -27.5; Survival p5 four Sunwell agility pieces -48.8 to -62; Arms p5 Coif of Alleria, Thalassian Ranger Gauntlets, Bladed Chaos Tunic and Demontooth Shoulderpads gain less than on Fury.                                                                           |
| 750 (wontfix)            | Arms p4, p5               | Earthstrike, Jom Gabbar, Bulwark of Kings and Cloudkeeper Legplates get no value from their use effects. Earthstrike and Jom Gabbar score exactly like Icon of the Silver Crescent (-62.6 at p4, -91.7 at p5). `arms.apl.json` lists none of their ids and has no `autocastOtherCooldowns`. Dated comment added; ticket not reopened.                                                                                                                          |
| 746 (open)               | Arms (no row isolates it) | Meta-gem repair counts hit at full weight. Since review finding D1 the bundled Arms weights are P3, which price hit at 1.01, below Fury's 1.45. In the re-runs, some rows rose by 2.6 to 3.3 DPS: 13 belt rows at phase 5, such as Girdle of Truth, -109.5 to -106.8, and Swiftstrike Shoulders at phase 4, -33.6 to -31. The SME reads this as the repair of the Jagged gems on the worn item each one replaces (hypothesis, untested). Dated comments added. |
| 309 (open)               | Survival p4               | Only one row for Dagger of Bad Mojo; wowsims' Phase 4 Survival set wears two.                                                                                                                                                                                                                                                                                                                                                                                  |
| 620 (closed), 753 (open) | all four                  | Band of Eternity shows as 12 rows with one name in each Survival run; Medallion of the Alliance and of the Horde are one row each over many items. How the screen groups these was not checked.                                                                                                                                                                                                                                                                |
| 641 (open)               | all four                  | The 2 Ring is offered: Survival p4 -23.7, p5 -43.8; Arms p4 -25.5, p5 -32.7.                                                                                                                                                                                                                                                                                                                                                                                   |
| 418 (open)               | Survival p5               | Hard Khorium Choker (+16.1, above the cutoff) needs Jewelcrafting, and the Survival build has Engineering and Blacksmithing.                                                                                                                                                                                                                                                                                                                                   |

Sources: SME Survival report § Q4, SME Arms report § Q4 and § Round 2
runs, and the run JSON rows they cite. The Arms values are from
`arms-p4-r2.json` and `arms-p5-r2.json`. The 746 row's moves compare
each row with the same item and slot in the first run
(`compare-arms-p4.out`, `compare-arms-p5.out`); the count of 13 belt
rows is from matching rows at -109.5 in `arms-p5.json` and -106.8 in
`arms-p5-r2.json`.

## Not filed (outside scope or not a defect)

- **Items from the other faction (SME Arms draft N2).** An Orc is offered
  Veteran's Musket ("Honor Hold / Exalted", Arms p4 row 58 -13.6, p5 row
  110 -22.3, in `arms-p4-r2.json` and `arms-p5-r2.json`) and a Medallion
  of the Alliance row. The Survival build is
  also Orc (`builds/phase_3/sv/dw_6p.build.json`, `RaceOrc`), and its
  runs show the same rows far below the cutoff (Veteran's Musket p4 row
  719 -116.2, p5 row 852 -119.3). Not filed: ticket 687
  (wontfix) decided that the tab keeps both factions' copies, as the
  site's gear picker does by default
  (`.scratch/carry-forward/issues/687-pool-lists-both-factions-reputation-rewards.md`,
  § Closing note).
- **Arena ranged weapons above the cutoff** on Survival p5 (three Brutal
  Gladiator's weapons at +17): earlier arena-row rulings, as in the p45
  report § Not filed.
- **Heroic Magisters' Terrace items** (Shard of Contempt) although the
  assumptions line excludes heroic dungeons: kept on purpose (ticket 17,
  ADR-0038).
- **Arms - Kebab takes the Arms EP set** under the 803 rule, although
  upstream groups that build with Fury's gear: a choice, not a shown
  defect (803 report § Signal).
- **The Arms stats panel shows 3% more hit than gear gives, with no
  Precision talent:** probably Improved Faerie Fire in the build's
  debuffs (hypothesis, untested); ticket 521 covers the tab's hit readout
  (SME Arms report, § Notes for engineering).
- **Two-handers on Survival are stat sticks:** the Survival build does not
  melee-weave (`meleeWeave` unset in its rotation), so this is right
  (SME Survival report § Q1).

## For epic 452

Bullet 1 of the epic's "What 'done' looks like" reads: "A defined list of
the DPS specs in scope (at least all DPS specs the wowsims fork supports
for the phases this tool ships)."

- The p45 report left two things for it: "the epic's spec list, set by
  the owner; Survival and Arms runs after ticket 754 is fixed"
  (`docs/live-runs/2026-11-03-p45-dps-pass.md:234-235`).
- The spec list: the owner ruled on 2026-11-06 that Survival hunter and
  Arms warrior are included, giving 13 specs
  (`.scratch/carry-forward/issues/452-end-ret-feralcat-tunnel-vision-support-all-dps-specs.md:110-131`).
- The runs: this pass ran Survival and Arms at phases 4 and 5, each with
  its own build and, after ticket 803, its own EP-weight set (for Arms,
  the P3 set after review finding D1), and each has an SME verdict. So with the p45 pass, all 13 specs now have phase 4 and
  phase 5 runs with SME verdicts.
- Left for bullet 1: nothing from these runs. Ticket 810 is a defect the
  runs found; it does not block the spec list.
- Ticket 799 is closed: the review file is
  `docs/reviews/feat-452-survival-arms.md`.
- Open before any push or merge of this branch: a whole `pnpm verify`.
  It did not run whole in this sandbox: typecheck, lint and test fail on
  the read-only `node_modules`, and `pnpm install` cannot run (803 report
  § pnpm verify). Run it in a checkout with a writable, installed
  `node_modules`.

The other three bullets are slices C to F of the epic (452 Notes); this
pass changed no gate, fixture or doc for them.

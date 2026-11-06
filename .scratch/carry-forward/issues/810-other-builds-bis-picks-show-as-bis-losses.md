Status: blocked
Type: bug
Origin: docs/live-runs/2026-11-06-survival-arms-p45.md (SME report .scratch/agent-reports/2026-11-06-general-task-sme-arms.md, draft N1)
Serves: .scratch/carry-forward/issues/452-end-ret-feralcat-tunnel-vision-support-all-dps-specs.md
Blocks: none
Blocked by: owner ruling (step 1 below)
Related: 452, 528, 690, 799, ADR-0038

# The other build's BiS picks show as BiS losses on the Arms and Survival tabs

## What the player sees

On the warrior page with the Arms build loaded (Arms talents, the Phase 3
"BIS" Arms gear, ranking phase 4), the main results table lists five items
under the six upgrades, each below the cutoff with a loss: Dreadboots of
the Legion -6.3, Choker of Endless Nightmares -9.4, Cursed Vision of
Sargeras -16.1, Grips of Silent Justice -17.6 and Midnight Chestguard
-29.6 (`arms-p4-r2.json` rows 6-10). All five are in the phase-4 Fury set
and in no phase-4 Arms set. At phase 5 the main table also lists
Angelista's Revenge +1.3 (`arms-p5-r2.json` row 22), which is only in the
phase-5 Fury set. These rows are from the Arms runs done again with the
P3 Arms EP weights (review finding D1); the first runs, `arms-p4.json`
and `arms-p5.json`, had the same rows, with Grips at -17.

The hunter page with the Survival build loaded shows the same with Beast
Mastery's picks. At phase 4 the main table lists Stormrage Signet Ring
-5.1, Choker of Serrated Blades -6.2, Boneweave Girdle -9.5, Choker of
Endless Nightmares -10.6 and Shadowmoon Destroyer's Drape -13.2
(`survival-p4.json` rows 6-10). At phase 5 it lists the same five items
(`survival-p5.json` rows 22-25 and 29). Each is in a phase-4 Beast Mastery
set and in no phase-4 Survival set; both Survival runs take their BiS sets
from phase 4 (assumptions line: "BiS tags: from P4 sets, ranking P5" at
phase 5). The Survival SME report did not flag these rows.

Each run's assumptions line lists both builds' sets, for example
`sets: preset:4:Fury/BIS, preset:4:Arms/BIS` in `arms-p4-r2.json`.

What the badge on these rows reads was not recorded: the run JSON has no
badge field. From the code, a badge names the group only when two
selected sets that hold the item share a phase and a name
(`rowTags`, fork `ui/features/upgrades/model/settings_pool.ts:240-246`).
A Fury-only item is held by one set, so its badge would read "BIS" with
no "(Fury)" (hypothesis, untested on screen).

Check: `python3 -I .scratch/agent-reports/2026-11-06-452b-runs/bis-group-check.py`
from the worktree root of `feat/452-survival-arms` (the run folder is
gitignored; it exists only in that worktree). It prints each
below-cutoff main-table row and which build's sets hold the item. It
reads the first Arms runs; with `arms-p4-r2` and `arms-p5-r2` in its run
list it prints the same Fury-only rows.

## Why it happens

ADR-0038 § Preset phase and BiS tags
(`docs/adr/0038-fork-pool-comes-from-wowsims-at-run-time.md:129-136`):
"The BiS sets at phase p are **every** preset whose phase is the newest
preset phase `<= p`. wowsims' `PresetGear` has no BiS field, and no
preset is told apart by its name." Ticket 528 (closed, owner ruling
option A, 2026-10-11) puts a BiS item that misses the cutoff in the main
table, marked as not an upgrade.

The hunter and warrior pages each hold two builds' presets at every
phase, told apart by wowsims' `group` field (Beast Mastery and Survival;
Fury and Arms; `group:` in fork `ui/specs/hunter/dps/presets.ts` and
`ui/specs/warrior/dps/presets.ts`). So both builds' sets are BiS sets,
and the other build's items reach the main table. No other DPS page has
two DPS groups (`grep -o "group: '[^']*'" ui/specs/*/*/presets.ts` in the
fork: mage has only Arcane, ret only Retribution). The tab does what
ADR-0038 says; the question is whether ADR-0038 should say it for these
two pages.

## Steps

1. **Owner ruling, Q-810-bis-build: "Should BiS tags follow only the
   loaded build's sets?"** The agent does not decide this.
   - **Yes.** The Arms tab tags only Arms sets, and the Survival tab only
     Survival sets. Costs: a fork change to how the pool picks BiS sets,
     a re-pin, and an amendment to ADR-0038 § Preset phase and BiS tags.
     The tab also needs a signal for which build is loaded. Two
     candidates, neither checked: the talent rule ticket 803 added
     (fork `ui/features/upgrades/model/data/data.ts`,
     `TALENT_VARIANT_BY_SPEC`), which picks a talent tree, not a group,
     and puts Arms - Kebab under Arms although upstream groups that build
     with Fury's gear (`.scratch/agent-reports/2026-11-06-general-task-803-sv-arms-ep-weights.md`,
     § Signal); or the `group` of the gear set the player loaded, which
     the page may not keep once the player changes a piece (hypothesis,
     untested).
   - **No.** ADR-0038 stands and no code changes. Cost: on these two
     pages the main table keeps showing the other build's picks as BiS
     losses (five rows on Arms at phase 4, one at phase 5, five on
     Survival at each phase in these runs). A smaller change fits under
     this answer: name the group on such a badge ("BIS (Fury)") so the
     player can tell whose pick it is; the rows stay in the main table.
2. Build what step 1 rules, with a fork test, and re-pin
   (`docs/agents/paired-worktrees.md` § Re-pin after a fork change).
3. Run `arms-p4` again, or a fixture with both groups' sets, and read the
   main table.

## Done when

The owner has ruled on step 1, and one of these holds:

- Yes: on the Arms tab at phase 4, no row for an item that appears only
  in Fury's sets shows a BiS tag or sits in the main table below the
  cutoff, and the same on the Survival tab for Beast Mastery's items; a
  fork test covers both pages; ADR-0038 says so.
- No, with group names on badges: such a row's badge names its group,
  with a fork test.
- No, unchanged: ADR-0038 records that both builds' sets count on these
  pages, and this ticket is closed `wontfix`.

## Evidence

- Run JSON (gitignored, only in the `feat/452-survival-arms` worktree):
  `.scratch/agent-reports/2026-11-06-452b-runs/arms-p4-r2.json`,
  `arms-p5-r2.json`, `survival-p4.json`, `survival-p5.json`; the
  superseded Arms runs `arms-p4.json`, `arms-p5.json`.
- Gear sets: fork `ui/specs/warrior/dps/gear_sets/p4_fury.gear.json`,
  `p5_fury.gear.json`, `p4_arms.gear.json`, `p5_arms.gear.json`;
  `ui/specs/hunter/dps/gear_sets/phase_4/bm/` and `phase_4/sv/`.
- SME reports: `.scratch/agent-reports/2026-11-06-general-task-sme-arms.md`
  (N1), `.scratch/agent-reports/2026-11-06-general-task-sme-survival.md`.

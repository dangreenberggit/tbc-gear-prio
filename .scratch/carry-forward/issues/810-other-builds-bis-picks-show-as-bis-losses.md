Status: open
Type: bug
Origin: docs/live-runs/2026-11-06-survival-arms-p45.md (SME report .scratch/agent-reports/2026-11-06-general-task-sme-arms.md, draft N1)
Serves: .scratch/carry-forward/issues/452-end-ret-feralcat-tunnel-vision-support-all-dps-specs.md
Blocks: none
Blocked by: none
Related: 452, 528, 690, 799, ADR-0038

# The other build's BiS picks show as BiS losses on the warrior and hunter DPS pages

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

1. **Owner ruling, 2026-11-06, verbatim:** "this choice isnt clear. it
   should use the tags wowsims has for that site (for example i think all
   dps warriors are probably one site with two talent preset options, not
   different tabs)". Asked in chat on Q-810-bis-build, which offered: tag
   only the loaded build's sets; no change; or name the build on the badge.
   - What wowsims has (`.scratch/agent-reports/2026-11-06-general-task-810-wowsims-tags.md`,
     fork at `3d8c215f8`, read, not seen on screen): warrior DPS and hunter
     DPS are one page each. Their gear presets and builds carry a `group`
     tag (Fury or Arms; Beast Mastery or Survival), and the gear tab shows
     the sets under those group headings (`PresetGroupPicker.tsx:39-77`).
     wowsims has no BiS field; its only "BiS" text is the warrior sets'
     name "BIS" and a hover note (`preset_utils.ts:62`). It does not record
     which build or talent preset the player loaded (`proto/ui.proto:319-337`).
   - So the tag the tab can take from wowsims is the gear set's `group`.
     Counting only "the loaded build's" sets would need a guess that is
     not a wowsims tag, which the ruling rules out.
   - Agent's reading of the ruling, to confirm with the owner: on a page
     whose gear presets have more than one group, every BiS badge names
     its group, for example "BIS (Fury)" or "DW - 6% hit (Survival)". The
     rows stay where they are today. Today the badge adds the group only
     when two sets share a name and phase (`settings_pool.ts:240-246`),
     and the pool's fallback "BiS" badge does not carry the group
     (`pool_source.ts:148`).
2. Build that in the fork, with a fork test for a two-group page, and
   re-pin (`docs/agents/paired-worktrees.md` § Re-pin after a fork change).
   Amend ADR-0038 § Preset phase and BiS tags to say the badge names
   wowsims's group.
3. Check a warrior DPS run with the Arms build at phase 4 (the
   `arms-p4-r2` setup) and read the main table's badges.

## Done when

On the warrior and hunter DPS pages, every BiS badge names the wowsims
`group` of the set it comes from; a fork test covers a two-group page;
ADR-0038 says so.

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

## Comments

- 2026-11-06: the owner's answer to Q-810-bis-build (quoted in step 1)
  replaced the three options this ticket held. Status moved from
  `blocked` to `open`.

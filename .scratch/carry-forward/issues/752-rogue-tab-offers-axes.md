Status: open
Serves: .scratch/plans/upgrades-tab-finish-line.md, Chunk 3b (DPS spec list)
Type: task
Origin: docs/live-runs/2026-11-03-p45-dps-pass.md (SME handoff .scratch/handoffs/sme-rank-judgment-452-p4-physical.md)
Blocks: none
Blocked by: none
Related: 452

# The rogue tab offers axes

On the rogue tab at phase 4, starting from the "P3 Swords" preset, the table
offers 18 one-hand axes in the main hand and off hand; at phase 5, from the
same preset, it offers 22. If TBC rogues cannot equip axes, as the SME
recalls, these are items the player cannot wear. All of them sit far below
the cutoff (rank 666 or lower at phase 4, 807 or lower at phase 5), so no
upgrade above the cutoff changes.

## Rows (exact text from the run JSON)

- rogue p4: `690 | Main Hand | Rising Tide | -279.5`,
  `694 | Main Hand | Wicked Edge of the Planes | -283`,
  `741 | Off Hand | Vengeful Gladiator's Chopper | -373.8`,
  `743 | Off Hand | Fel Edged Battleaxe | -385.9`, and 14 more.
- rogue p5: `807 | Main Hand | Brutal Gladiator's Cleaver | -234.2`,
  `809 | Off Hand | Brutal Gladiator's Hacker | -234.3`,
  `913 | Off Hand | Fel Edged Battleaxe | -385.9`, and 19 more.

## Game fact and source

- Game: rogues could not equip axes in TBC; they got one-hand axes in Wrath
  of the Lich King. **Recalled, unverified.**
- Repo data: the wowsims class table allows rogue axes
  (`vendor/tbc-new-fork/sim/core/character_constants.go:52`,
  `ClassRogue: WeaponTypeAxe`; read by the SME). The tab's pool takes class
  rules from wowsims at run time (ADR-0038).

## Evidence

- Run JSON (gitignored): `.scratch/agent-reports/2026-11-03-p45-runs/rogue-p4.json`, `rogue-p5.json`.
- SME handoffs: `.scratch/handoffs/sme-rank-judgment-452-p4-physical.md` F2,
  `.scratch/handoffs/sme-rank-judgment-452-p5-physical.md` F2.

## Done when

A primary source for TBC rogue weapon skills is cited here. If rogues could
use axes, close this as `wontfix` with that source. If not, the rogue tab
shows no axe row. ADR-0038 dropped this repo's own equip rules (no feral
no-polearm rule, no class-restricted-sets file: "No owner words set any of
them"; `docs/adr/0038-fork-pool-comes-from-wowsims-at-run-time.md:88-90`), and a
change to the existing wowsims file needs the owner's OK of that exact
edit, so where the fix goes is the owner's call.

## Comments

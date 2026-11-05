Status: wontfix
Type: task
Origin: docs/live-runs/2026-11-03-p45-dps-pass.md (SME handoff .scratch/handoffs/sme-rank-judgment-452-p4-casters.md)
Serves: .scratch/plans/upgrades-tab-finish-line.md, Chunk 3b (DPS spec list)
Blocks: none
Blocked by: none
Related: 452

# Eye of the Dead is priced as a flat 30-second buff on the caster tabs

On the balance tab at phase 4, starting from the "Phase 3" preset, the table
shows Eye of the Dead above the cutoff at +6.8, ahead of Icon of the Silver
Crescent at +1.8. On every caster tab (balance, mage, shadow, elemental,
warlock) at phases 4 and 5, Eye of the Dead is priced about the same as Icon
of the Silver Crescent or higher. If the game reduces Eye of the Dead's bonus
with each spell cast, as the SME recalls, the tab prices it too high.

## Rows (exact text from the run JSON)

| Run | Eye of the Dead | Icon of the Silver Crescent |
| --- | --- | --- |
| balance p4 | `Trinket 1 \| Eye of the Dead \| 6.8` (above the cutoff) | `1.8` |
| balance p5 | `-18.1` | `-21.1` |
| mage p4, p5 | `-19.4` | `-13.6` |
| shadow p4, p5 | `Trinket 1 \| Eye of the Dead \| 0.8` | worn |
| elemental p4 | `-13.4` | `-19` |
| elemental p5 | `-11` | `-19.9` |
| warlock p4 | `Trinket 2 \| Eye of the Dead \| 1.4` | worn |
| warlock p5 | `-26.9` | `-28.8` |

## Game fact and source

- Repo data: db.json item 23047 has one `itemEffects` entry with
  `buffName` "The Eye of the Dead (28780)", `effectDurationMs` 30000,
  `scalingOptions."0".stats` `{"4": 450, "5": 150}` and `onUse.cooldownMs`
  120000, and no charge or decay field. The engine registers it as
  `shared.NewSimpleStatActive(23047)`
  (`vendor/tbc-new-fork/sim/common/tbc/stat_bonus_cds_auto_gen.go:179`).
  Read by the SME (p4-casters F2) and again with `python3 -I` on
  `vendor/tbc-new-fork/assets/database/db.json` for the round-1 review fix.
- Game: the bonus shrinks with each spell cast, and the item is a healer
  trinket. **Recalled, unverified**; the repo holds no tooltip text for its
  spell.

## Evidence

- Run JSON (gitignored): `.scratch/agent-reports/2026-11-03-p45-runs/{balance,mage,shadow,elemental,warlock}-p{4,5}.json`.
- SME handoffs: `.scratch/handoffs/sme-rank-judgment-452-p4-casters.md` F2,
  `.scratch/handoffs/sme-rank-judgment-452-p5-casters.md` F2.

## Done when

A primary source for Eye of the Dead's in-game effect is cited here. If the
bonus does not decay, close this as `wontfix` with that source. If it does,
either the engine models the decay or the tab says on the row that its value
is an upper bound. A change to an existing wowsims file needs the owner's OK
of that exact edit. For a related case (Thunderfury has no `itemEffects` in
db.json), ADR-0038 says: "Under the owner's 2026-10-17 ruling that is a
wowsims data gap, not ours to fill."
(`docs/adr/0038-fork-pool-comes-from-wowsims-at-run-time.md:85-87`).

## Comments

- 2026-11-05: closed as wontfix on the owner's words: "close the tickets.
  this has nothing to do with the fork as a feature branch". The fault is
  in the wowsims engine, so the site prices the item the same way.
  Source for the game fact: Wowhead's TBC tooltip for spell 28780 reads
  "Increases healing done by the next 5 spells by up to 450 and damage
  done by up to 150 for 30 sec."
  (`curl -s 'https://nether.wowhead.com/tbc/tooltip/spell/28780'`), and
  the client data gives the buff `ProcCharges 5`
  (`curl -s 'https://wago.tools/db2/SpellAuraOptions/csv?build=2.5.6.70577&filter%5BSpellID%5D=28780'`).
  So the engine's flat 30-second buff prices it too high. A patch that
  models the charges is in the gitignored notes
  `.scratch/agent-reports/2026-11-05-general-task-751-eye-of-the-dead.md`.

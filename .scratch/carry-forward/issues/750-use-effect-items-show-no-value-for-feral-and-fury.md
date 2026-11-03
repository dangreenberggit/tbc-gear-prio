Status: open
Serves: .scratch/plans/upgrades-tab-finish-line.md, Chunk 3b (DPS spec list)
Type: task
Origin: docs/live-runs/2026-11-03-p45-dps-pass.md (SME handoff .scratch/handoffs/sme-rank-judgment-452-p4-physical.md)
Blocks: none
Blocked by: none
Related: 452

# Earthstrike, Jom Gabbar and Bulwark of Kings show no value on the feral cat and Fury warrior tabs

On the feral cat tab at phase 4, starting from the Phase 3 "BiS 6%" preset,
the table shows Earthstrike and Jom Gabbar at -50.4. That is exactly the
value of Talisman of Ascendance, a caster trinket that gives a cat nothing.
On the warrior tab (Fury set) at phase 4, starting from the Phase 3 "BIS"
preset, all three show -94.8, and Bulwark of Kings sits 33 DPS below Bulwark
of the Ancient Kings although both have the same use effect. Phase 5 shows
the same. On the ret, rogue, hunter and enhancement tabs both trinkets score
above the caster-trinket line, so their use effects count there.

## Rows (exact text from the run JSON)

| Run | Row |
| --- | --- |
| feralcat p4 | `Trinket 2 \| Earthstrike \| -50.4`, `Trinket 2 \| Jom Gabbar \| -50.4`, `Trinket 2 \| Talisman of Ascendance \| -50.4` |
| feralcat p5 | `Trinket 2 \| Earthstrike \| -64.6`, `Trinket 2 \| Jom Gabbar \| -64.6`, `Trinket 2 \| Talisman of Ascendance \| -64.6` |
| warrior p4 | `Trinket 1 \| Earthstrike \| -94.8`, `Trinket 1 \| Jom Gabbar \| -94.8`, `Trinket 1 \| Talisman of Ascendance \| -94.8`; `Chest \| Bulwark of Kings \| -34.3` against `Chest \| Bulwark of the Ancient Kings \| -1.2` |
| warrior p5 | the three trinkets at `-98.5`; `Chest \| Bulwark of Kings \| -36.8` against `Chest \| Bulwark of the Ancient Kings \| -1.3` |
| ret p4 (for contrast) | `Earthstrike \| -27.9`, `Jom Gabbar \| -19.7`, `Talisman of Ascendance \| -54.9`; Bulwark of Kings `3.9`, Bulwark of the Ancient Kings `11.5` |

The warrior run also lists Cloudkeeper Legplates (14554, use +100 attack
power) at -138.1.

## Game fact and source

- Earthstrike (21180): db.json `itemEffects` gives a use effect of +280
  attack power for 20 s (SME handoff, p4-physical F1).
- Jom Gabbar (23570): db.json gives a use effect (spell 29602). Its stacking
  amount is recalled, unverified.
- Bulwark of Kings (ilvl 127) and Bulwark of the Ancient Kings (ilvl 146)
  share the same +150 Strength use effect (SME handoff).
- Engineering pointer from the SME (not checked by the executor):
  `vendor/tbc-new-fork/ui/specs/warrior/dps/apls/fury.apl.json` and
  `vendor/tbc-new-fork/ui/specs/druid/feralcat/apls/default.apl.json` have
  no `autocastOtherCooldowns` and list trinket item ids; 21180, 23570 and
  28484 are on neither list (`grep -o '"itemId": *[0-9]*'` on each file).
  Why the gap follows from that is a hypothesis, untested.

## Evidence

- Run JSON (gitignored): `.scratch/agent-reports/2026-11-03-p45-runs/feralcat-p4.json`,
  `feralcat-p5.json`, `warrior-p4.json`, `warrior-p5.json`, `ret-p4.json`.
- SME handoffs: `.scratch/handoffs/sme-rank-judgment-452-p4-physical.md` F1,
  `.scratch/handoffs/sme-rank-judgment-452-p5-physical.md` F1.

## Done when

On the feral cat and Fury warrior tabs either Earthstrike, Jom Gabbar and
Bulwark of Kings are priced with their use effects, as on the ret, rogue,
hunter and enhancement tabs, or the tab tells the player that the page's
rotation does not use those items' use effects. The tab sims the page's own
rotation, as the wowsims site does, so which of the two is right is for
whoever picks this up to settle with the owner. A change to an existing
wowsims file needs the owner's OK of that exact edit.

## Comments

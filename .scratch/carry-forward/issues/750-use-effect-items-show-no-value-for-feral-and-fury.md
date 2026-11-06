Status: wontfix
Type: task
Origin: docs/live-runs/2026-11-03-p45-dps-pass.md (SME handoff .scratch/handoffs/sme-rank-judgment-452-p4-physical.md)
Serves: .scratch/plans/upgrades-tab-finish-line.md, Chunk 3b (DPS spec list)
Blocks: none
Blocked by: none
Related: 452

# Earthstrike and Jom Gabbar (feral cat, Fury) and Bulwark of Kings (Fury) get no value from their use effects

On the feral cat tab at phase 4, starting from the Phase 3 "BiS 6%" preset,
the table shows Earthstrike and Jom Gabbar at -50.4. That is exactly the
value of Talisman of Ascendance, a caster trinket that gives a cat nothing.
On the warrior tab (Fury set) at phase 4, starting from the Phase 3 "BIS"
preset, all three show -94.8, and Bulwark of Kings sits 33 DPS below Bulwark
of the Ancient Kings although both have the same use effect. Bulwark of
Kings is plate, so it has rows only on the ret and warrior tabs. Phase 5
shows the same. On the ret, rogue, hunter and enhancement tabs both trinkets score
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
power for 30 s) at -138.1 (phase 5: -147; ret, both phases: -80.1).

## Game fact and source

- Earthstrike (21180): db.json `itemEffects` gives a use effect of +280
  attack power for 20 s (SME handoff, p4-physical F1).
- Jom Gabbar (23570): db.json gives a use effect (spell 29602). Its stacking
  amount is recalled, unverified.
- Bulwark of Kings (ilvl 127) and Bulwark of the Ancient Kings (ilvl 146)
  share the same +150 Strength use effect (SME handoff).
- Engineering pointer from the SME, checked again at fork `13a980cf3` for
  the round-1 review fix:
  `vendor/tbc-new-fork/ui/specs/warrior/dps/apls/fury.apl.json` and
  `vendor/tbc-new-fork/ui/specs/druid/feralcat/apls/default.apl.json` have
  no `autocastOtherCooldowns` and list item ids; 21180, 23570, 28484 and
  14554 are on neither list, and 28485 (Bulwark of the Ancient Kings) is
  on both (`grep -o '"itemId": *[0-9]*'` on each file). Why the gap
  follows from that is a hypothesis, untested.

## Evidence

- Run JSON (gitignored): `.scratch/agent-reports/2026-11-03-p45-runs/feralcat-p4.json`,
  `feralcat-p5.json`, `warrior-p4.json`, `warrior-p5.json`, `ret-p4.json`.
- SME handoffs: `.scratch/handoffs/sme-rank-judgment-452-p4-physical.md` F1,
  `.scratch/handoffs/sme-rank-judgment-452-p5-physical.md` F1.

## Done when

Either the items below are priced with their use effects, as Earthstrike
and Jom Gabbar are on the ret, rogue, hunter and enhancement tabs, or the
tab tells the player that the page's rotation does not use those items'
use effects. The items: Earthstrike and Jom Gabbar on the feral cat tab;
Earthstrike, Jom Gabbar, Bulwark of Kings and Cloudkeeper Legplates on the
Fury warrior tab. Cloudkeeper Legplates is in scope because its use effect
is also missing from the Fury rotation's item list; how much of its
-138.1 that costs was not measured. The tab sims the page's own
rotation, as the wowsims site does, so which of the two is right is for
whoever picks this up to settle with the owner. A change to an existing
wowsims file needs the owner's OK of that exact edit.

## Comments

- 2026-11-05: closed as wontfix on the owner's words: "close the tickets.
  this has nothing to do with the fork as a feature branch". The fault is
  in the wowsims rotation files; the tab sims the page's rotation as the
  site does (ADR-0038). Cause, for anyone who reopens it: the Fury and
  feral APLs have no `autocastOtherCooldowns` action, and the engine fires
  an item cooldown only when the APL names it or autocasts it
  (`vendor/tbc-new-fork/sim/core/apl.go:280-288`). In scratch sims, adding
  `{"action":{"autocastOtherCooldowns":{}}},` to both APLs gave these items
  value with no change in default DPS. Notes (gitignored):
  `.scratch/agent-reports/2026-11-05-general-task-750-apl-use-effects.md`.
- 2026-11-06: the same loss shows on the Arms warrior tab
  (`docs/live-runs/2026-11-06-survival-arms-p45.md`). Rows, from the
  Arms runs done again with the P3 Arms EP weights (review finding D1),
  `.scratch/agent-reports/2026-11-06-452b-runs/arms-p4-r2.json` and
  `arms-p5-r2.json` (gitignored, only in the `feat/452-survival-arms`
  worktree): Earthstrike, Jom Gabbar, Talisman of Ascendance and Icon of
  the Silver Crescent all score -62.6 at phase 4 (rows 476-490) and -91.7
  at phase 5 (rows 773-787); Bulwark of Kings -47.9 against Bulwark of the
  Ancient Kings -24.7 at phase 4 (rows 238, 128); Cloudkeeper Legplates
  -112.1 at phase 4 (row 764) and -116.2 at phase 5 (row 946). The first
  runs, with the P1 weights, had the same values. The Arms
  rotation file has the same gap as Fury's:
  `vendor/tbc-new-fork/ui/specs/warrior/dps/apls/arms.apl.json` lists
  28485 and 33831 but not 21180, 23570, 28484 or 14554, and has no
  `autocastOtherCooldowns` (`grep -o '"itemId": *[0-9]*'`, `grep -c`).
  SME report: `.scratch/agent-reports/2026-11-06-general-task-sme-arms.md`
  K1. Recorded for completeness; the wontfix stands.

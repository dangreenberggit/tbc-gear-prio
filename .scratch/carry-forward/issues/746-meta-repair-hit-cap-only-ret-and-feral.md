Status: open
Type: bug
Origin: docs/reviews/fix-wrong-advice-text.md (round 1, D1)
Serves: .scratch/carry-forward/issues/452-end-ret-feralcat-tunnel-vision-support-all-dps-specs.md
Blocks: none
Blocked by: none
Related: 705, 452

# Meta-gem repair counts hit at full value, with no note, for every spec but ret and feral

## What is wrong

When the tab swaps gems to turn on an inactive meta gem (on the worn gear
or on a candidate), it charges hit gems against the hit cap only for
Retribution Paladin and Feral Druid. For every other DPS spec it values
hit at full weight even past the cap, and the tab shows no note saying so.
That is the symptom ticket 705 named, on the specs 705's fix does not
reach.

## Where (fork, at tbc-new-fork@8a58f4af0)

- `ui/features/upgrades/model/engine/cap-profile.ts:90`: `repairCap` is
  optional; only the `ret` (`:177`) and `feral` (`:188`) profiles set it.
- `cap-profile.ts:436`: `hitCapBudgetFrom` returns undefined without a
  `repairCap`.
- `ui/features/upgrades/model/engine/rank.ts:819-821`: `hitCapReadable`
  needs `repairCap`; the worn-gear read (`:848`) and the baseline read
  with its `hitCapUnknownNote` (`:1099-1111`) run only when it is true.

## Done when

Either every DPS spec whose hit has a cap gets a `repairCap` (with a test
per spec family: physical melee, ranged, caster), or the tab says in one
plain sentence, for the specs without one, that its gem swaps count hit
at full value. The cap values to use come from the engine; the domain
reviewer cited `sim/core/target.go:393,394,401` for 16% spell and 9%
physical at level 73 (hypothesis, untested by the filer).

## Comments

2026-11-06: this ticket is slice D of epic 452 (452 Notes, 2026-11-06),
worked with ticket 804 in one pair so one re-pin carries both. Its branch
is made from slice C's branch (ticket 800, desktop-gate goldens for more
specs), or from `dev` if C has merged. The line numbers above are at fork
`8a58f4af0`; check them against the current pin in
`data/wowsims-fork.lock.json`.

Of the two ways out in "Done when", the first fixes the defect and the
second only tells the player about it. The plan picks one per spec and
says why. When the change moves a golden, report each spec's diff in the
merge account, then rewrite it with `pnpm desktop-gate:check --spec <spec>
--update-golden` and give the reason in the commit body
(`data/desktop-gate/README.md:67-79`). The branch's `pre-merge-review`
file is part of done.

2026-11-06: Arms warrior now gems with its own bundled weights (ticket
803), and those price hit at 1.81 per point
(`vendor/tbc-new-fork/ui/features/upgrades/model/data/warrior-arms-p1.ep-weights.json`,
stat 20), against 1.45 in Fury's bundled set
(`warrior-fallback.ep-weights.json`) and 1.01 in upstream's P3 Arms set
(`ui/specs/warrior/dps/presets.ts`, `P3_ARMS_EP_PRESET`). The Arms start
gear sits at or over the 9% cap. So a meta repair that counts hit at full
weight would value a wasted hit gem higher on Arms than on Fury
(hypothesis, untested). No row in the Arms runs isolates it; the run JSON
does not record which gems the tab chose. Sources:
`docs/live-runs/2026-11-06-survival-arms-p45.md`,
`.scratch/agent-reports/2026-11-06-general-task-sme-arms.md` § Q3 and K3.

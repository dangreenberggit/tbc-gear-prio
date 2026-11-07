Status: closed
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
(`data/desktop-gate/README.md` § Regenerating a golden). The branch's
`pre-merge-review` file is part of done.

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

2026-11-06: the tab's Arms set is now `P3_ARMS_EP_PRESET`, with hit
weight 1.01 (stat 20 in `data/presets/warrior/arms-p3.ep-weights.json`;
review finding D1 of `feat/452-survival-arms`). That replaces the premise
of the comment above, which priced Arms hit at 1.81 from the P1 set: the
Arms set now prices hit below Fury's 1.45, not above it.

2026-11-06 (closed, slice D executor; updated after review round 1):
fixed in fork commit `b8f9f7f45` "Give every spec a meta-repair hit
policy" on fork branch `feat/452-meta-repair-hit-cap`, carried into this
repo by the main-repo commit "Re-pin fork for the hit policy and
phase-1 cells" (`00269b01`). The branch's pre-merge review is
`docs/reviews/feat-452-meta-repair-hit-cap.md`. Its round-1 findings
are fixed in fork commit `6bab26253` "Read each candidate's own hit for
meta repair", carried in by the main-repo commit "Re-pin fork for the
review round-1 fixes" (the commit that updates this comment).
`cap-profile.ts` gives every spec a required `repair` policy (it
replaced the optional `repairCap`), so a spec with neither a budget nor
a note is a compile error. Per spec:

- Ret and feral: a budget on pseudo-stat 12 (melee hit percent), cap
  9, Improved Faerie Fire subtracted, as before.
- Mage, shadow and warlock: a budget on pseudo-stat 13 (spell hit
  percent), cap 16, no Faerie Fire term. Slot 13 is the hit every spell
  shares, so the budget never undervalues hit for any spell. It does
  price at full weight the hit between a talented spell's cap and 16:
  mage Arcane spells 6-16, Frostbolt 10-16, Fire Blast 13-16; shadow's
  Shadow spells 6-16; with Affliction talents, the warlock's Affliction
  spells, which Suppression caps earlier. The page's default warlock
  talents are Destruction, which take no Suppression. Ticket 831 holds
  this gap. The caps 9 and 16 and their sim sources are in the
  `cap-profile.ts` doc comment.
- Rogue, enh and warrior (Arms too, since Arms and Fury share the
  warrior spec id): the note. Dual-wield white swings add 19% miss, so
  hit past 9% still cuts misses for every vendored dual-wield set.
- Hunter: the note. The default rotation weaves melee, and with a
  dual-wield set those white swings get the same 19%.
- Balance: the note. While the sim measures stats, Balance of Power
  adds a flat 4% spell hit inside every spell-hit slot, so no slot
  gives the plain "cap minus hit percent"; Faerie Fire and Insect
  Swarm are outside its mask.
- Elemental (review D1): the note. Totem of Wrath, when talented, adds
  3% spell hit inside the stats read, but in combat only while the
  totem is down, and a Fire Elemental cancels it for 120 s.

For every budget spec, a candidate whose swap turns the meta off now
gets its own stats read, and its repair budget moves by the hit that
read shows beyond the gear change (review A1). So a swap that breaks or
completes a set with a hit bonus no longer repairs on a budget that
misses that bonus. This also removes the ret and feral limit in ticket
535's close ("An item row whose single swap changes a set's count keeps
the local budget"). On the mage desktop-gate run (phase 4, 40
candidates) the harness counted 5 more non-sim requests (55 before, 60
after; read as the candidates' stats reads, hypothesis, untested), the
same 65 sims, a run time within run-to-run noise (8.6 s before; 10.2,
8.5 and 8.8 s after) and no row moved.

The note sentence is "If gems were swapped to turn your meta gem on,
hit rating was counted at full value, with no hit cap applied for this
spec." Nobody saw it on screen: the fixture screenshot ends above the
"Items left out and other notes" list. Tests check it: the fork's
`SubstitutionsList.test.tsx` ("shows every engine line as one plain
sentence") and main-repo case 535-S6 in
`packages/core/test/fork-meta-repair.test.ts`. The desktop gate passed
on ret, mage, rogue and enh (all four goldens) after each re-pin; no
golden moved.

A spec on a runner without `computeStats` (the CLI) repairs at full
weight with no note; ticket 830 holds that.

2026-11-06: review round 2's R1 and R2 are fixed in fork commit
707e67f07 "Fail a candidate's sim when its hit read fails" (re-pin
db6ed1bc). A failed per-candidate hit read now gives that item the
tab's usual failed-sim row, with no full-weight fallback and no
hit-rating note (main-repo case 746-R1). A Stop during that read still
ends the run as a partial, uncached ranking, with the item left unsimmed
and no failed-sim row (case 746-R1b).

2026-11-06: review round 3's R3-1 and R3-2 are fixed in fork commit
09d86beee "Catch only the candidate read's error (R3-1, R3-2)". Only the
read's own failure becomes that failed-sim row; a code error beside the
read fails the run, as it did before the R1 fix (case 746-R3).

Verified by: tbc-new-fork@09d86beeeeae0d9fad38d463cf325ed4c2ec93b2;
`node_modules/.bin/vitest run --root . --configLoader runner packages/core/test/fork-meta-repair.test.ts`
(45 passed; in the agent sandbox the worktree has no `node_modules`, so
it needs `ln -s /home/daniel/Code/lulz/tbc-gear-prio/node_modules node_modules`
first, and `--configLoader runner` because that `node_modules` is
read-only); `pnpm fork-tests:check`

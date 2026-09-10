# Pre-merge review — feat/reforge-catchup-leftovers

Reviewed range: `66ab791f3f6dbad133d264d400a0a24328e71e56..0d339c2f88baf61f9fe7c25ae1a47d810c109e9f`

Three axes, fresh context, Opus at effort `medium`, one parallel batch.
`codex` is not on `PATH`, so the cross-vendor route was unavailable; this is the
harness's review lane, not a downgrade.

**What this branch is.** A stage-gate pipeline (plan → adversarial plan review →
fresh-context execution) working the leftovers of the wowsims reforge catch-up:
does the merged Upgrades tab build and run, and what should be done about
tickets 350 and 351. It lands **almost no code** — one `disclosure.ts` sentence
and its test — because both headline bugs turned out to rest on claims nobody
had measured. The deliverable is largely a written record, so all three axes
were pointed at the record's claims rather than at a code diff.

## Adversarial

Four findings, one high.

**A1 (high) — the `provenance: upstream (measured)` claim was circular.**
Tickets 351 and 364 and `docs/verification-log.md` all cited
`merge-base --is-ancestor db05fed93 upstream/feature/backend-reforge` → 0 as
having closed a hole that ancestry inside the pin's own history left open. But
`upstream/feature/backend-reforge` resolves to `ec5c5f2` — _the lock's own
`branchedFrom`_ — so the test compared the pin against itself and would have
exited 0 before the fetch. The conclusion is nonetheless true, on evidence
nobody had written down.

**A2 (medium) — the new test's stated purpose exceeds what it enforces.**
`disclosure.test.ts` asserts against `packages/core`'s own
`buildStandingAssumptions` and never loads the fork copy, yet its comment
claimed it stopped "the two engine copies" drifting. E-W3 compares standing
assumptions by id, not detail text, so fork-side drift in that sentence would
pass both; only the PROVENANCE sha gate catches it. Independently found by the
Standards axis.

**A3 (medium) — the lock pins a commit that exists on no remote.**
`git -C vendor/tbc-new-fork branch -r --contains 3829c66f` is empty and
`pushed: false`. `data/sim-implemented-effects.json` embeds that unreachable
commit as its `forkCommit`.

**A4 (low) — `OUTCOME: unmeasurable-from-committed-inputs` overstates scope.**
The file's own reasoning supports "unmeasurable _without hand-authoring a
request_"; the conclusion reverses once ticket 362 is fixed or a fixture is
built, and the file does not say so.

Attacked and survived: ticket 362's mechanism (`item_swaps.go:57` calling
`toItem` unconditionally, `database.go:489` a literal `panic`), its "not a data
gap" claim, ticket 364's reading of `forms.go:52` and `consumes.go`, and ticket
350 left `open` with zero boxes ticked.

## Domain

Verdict: the core domain claims hold, with one real over-generalisation.

**D1 (major) — the weapon-stone claim is right about the engine, unproven about
TBC.** The branch asserted the two stones "give identical melee bonuses… in
TBC", citing a fork engine function. In TBC 2.4.3 sharpening stones apply to
bladed weapons and weightstones to blunt; the engine deliberately elides that
restriction, which is precisely what upstream's `adjustWeaponImbueID` exists to
handle. Reasoning from the engine to TBC and back to "the engine is defective"
is circular. **The conclusion survives for a better reason the branch never
gave:** a feral druid in cat form does not attack with the equipped weapon —
`GetCatWeapon` builds a synthetic paw weapon — so the sharp/blunt distinction is
irrelevant to a cat, and gating the paw bonus on one stone id is arbitrary
regardless.

**D2 (minor) — "ret and feral cannot equip an off-hand at all" is too strong.**
`feral-p3.json` carries 11 `HandTypeOffHand` items (_Talisman of Nightbane_,
_Fathomstone_, _Blind-Seers Icon_), which druids can equip in TBC. What is true
is that `DUAL_WIELD_SPECS` excluding feral means `simSlotsForPoolSlot` never
offers the off-hand placement, so the conclusion (no committed feral or ret
input can express the 1H+OH set Q1 needs) stands. The wording is now committed
in three places.

Confirmed sound: the paw arithmetic (`GetCatWeapon` folds the bonus in before
dividing by swing speed, landing as ~`12/swingSpeed`); rogue carrying zero
two-handers across all four phases; ticket 365's swing-not-stats measurement
design and its 7.01 DPS floor arithmetic; and ticket 363's exposure —
`feral-p3.json` and `feral-p5.json` really do record
`epWeights.path = data/presets/feral/p1.ep-weights.json`, because upstream ships
no feral P2/P3 preset, and P1 under-weights FeralAttackPower (0.35), the stat
that swings hardest across phases.

Warning for later readers: `data/items/index.json` **cannot** corroborate the
stone ids — 29453 is absent and 34340 resolves to _Dark Conjuror's Collar_, a
head item. The index is an equippable-gear universe; the id space collides.

## Standards + Spec

**Standards — one hard violation, one judgement call.** The ticked
`pnpm verify` acceptance box in ticket 351 named no command or rc, against
`AGENTS.md` § Durable claims; its three sibling boxes were properly sourced.
Verified clean and worth recording: the ported-engine cycle was fully executed
(fork commit `3829c66f6` moves `disclosure.ts` and its PROVENANCE row together,
`sha256sum` matches row `:157`, lock re-pinned, artifact regenerated); ticket
numbering satisfies the conjunction of the two conflicting authorities, with
`NEXT` bumped in each ticket's own commit and no collisions; front-matter valid
on all four new tickets. Judgement call: the corrected sentence is maintained as
two copies kept in sync by ritual rather than by sharing — the repo has
deliberately chosen porting, so the standard overrides the smell.

**Spec — one real finding.** Ticket 362 conflated two things under one number:
its title is the item-swap panic, but its opening asserted "the merged tab
builds and runs" directly above a section recording the enhancement run failing.
A reader greps for build evidence and lands on an unrelated open defect. No
scope creep: nothing from the plan's Out-of-scope list appears in the diff,
`rank.ts` and `sim/` are untouched, and the expansion from two tickets to four
is traceable — 364 is the artifact of Q2's mandated answer, 365 of Q1's "or the
reason the committed fixtures cannot measure it". Partial delivery correctly
disclosed: Q1's one live observation was lost to the 362 defect, recorded in
three places rather than papered over.

## Summary

Adversarial 4 (worst: A1, high). Domain 2 (worst: D1, major). Standards 2, being
one hard violation and one judgement call (worst: the unsourced acceptance box).
Spec 1 (worst: 362's conflated scope).

No finding blocks the merge. The high and major findings are both of one kind —
a true conclusion resting on a citation that does not establish it — which is
the failure mode this branch's whole method was built to avoid, so both were
fixed here rather than deferred.

## Disposition

| ID  | Axis        | Disposition | Ticket / note                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         |
| --- | ----------- | ----------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| A1  | Adversarial | fixed       | Circular citation replaced in all three places (351, 364, `docs/verification-log.md`) with the discriminating measurement: `merge-base --is-ancestor db05fed93 origin/master` → 0, where `origin/HEAD -> origin/master` is the fork's mirror of wowsims master (`d7d89da2`) and `origin/feature/backend-reforge` is a distinct commit (`cbf6b75a8`). Each now states plainly that the fetched ref equalled `branchedFrom` and was not discriminating. 364 also gained a "What is NOT claimed" line: the author's name is not evidence of affiliation. |
| A2  | Adversarial | fixed       | `packages/core/test/disclosure.test.ts` comment rewritten to state its real scope — this copy only; the fork copy is held by `scripts/check_engine_port_drift.py`, and E-W3 compares by id, not detail text.                                                                                                                                                                                                                                                                                                                                          |
| A3  | Adversarial | defer       | `.scratch/carry-forward/issues/355-push-or-archive-the-fork-branch-feat-upgrades-tab.md` — 355 updated with the measurement and the point that every ported-engine fix widens the gap; its acceptance now names the lock's current `commit` rather than the stale `ab59127d9faa`. Owner decision, unchanged in kind.                                                                                                                                                                                                                                  |
| A4  | Adversarial | fixed       | Scope sentence added to `probe/results.md` — the outcome means "not without hand-authoring a request", and reverses once 362 is fixed or a fixture exists.                                                                                                                                                                                                                                                                                                                                                                                            |
| D1  | Domain      | fixed       | 364 and 351 no longer argue from the engine to TBC. The justification is now the paw-weapon one: a cat does not attack with the equipped weapon, so the sharp/blunt distinction cannot reach the paw bonus and gating it on one id is arbitrary either way.                                                                                                                                                                                                                                                                                           |
| D2  | Domain      | fixed       | The over-strong "cannot put anything in the off hand" wording corrected in 350's Decision and `probe/results.md` to the accurate claim — feral can equip off-hand items, but `DUAL_WIELD_SPECS` never offers the placement, which is what makes the committed inputs unable to express the set. `pool.ts`'s own comment is upstream-of-us prose and is left alone; noted in 350.                                                                                                                                                                      |
| S1  | Standards   | fixed       | Ticket 351's ticked `pnpm verify` box now carries the command and rc, plus the E-W3 invocation and the known warning-only `upstream-drift:warn`.                                                                                                                                                                                                                                                                                                                                                                                                      |
| S2  | Standards   | wontfix     | Two byte-identical copies of the disclosure sentence kept in sync by the PROVENANCE ritual. The repo has deliberately chosen porting over sharing for the fork engine files; the documented standard overrides the Duplicated Code smell.                                                                                                                                                                                                                                                                                                             |
| P1  | Spec        | fixed       | Ticket 362 opens by saying plainly that it carries two things under one number and why they were not split, so a reader greps into the right half.                                                                                                                                                                                                                                                                                                                                                                                                    |

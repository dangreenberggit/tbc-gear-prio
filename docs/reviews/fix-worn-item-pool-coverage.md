# Pre-merge review — `fix/worn-item-pool-coverage`

Reviewed range: `9a4b932543e74da9a9a8bb8ce31b55813331f34d..b68b90046829b0f353ab23da7f2fa8b18bd75b6a`

Four axes on the review lane (Opus, effort medium), fresh context each, no access
to the authoring conversation. `codex exec` is not on `PATH` here, so dispatch
used option 2 of the skill's ladder — fresh subagents, one parallel batch. No
wall hit, no axis downgraded.

**No finding overturns the fix or the gate closure.** The branch's central claim
survived independent tracing. What the review corrected is a pattern in the
_documents_: claims stated as fact that their own cited commands refute — the
durable-claims rule, breached by the orchestrator while closing a gate box on it.

## Adversarial

**The central claim survives, traced independently.** `rank.ts:653` builds
`equipmentFromLoggedGear(logged)` (`logged-gear.ts:10-22` — all 19 slots, no pool
filter), and `equippedIds` derives from that same array. `wornUnrankable`
(`rank.ts:1194-1204`) is a post-hoc scan that never touches the baseline. The old
message was false; the branch premise is confirmed, not inverted.

**The tests are not goalpost-moving.** Mutation-tested in a throwaway worktree:
reverting `isUnmeasuredSlot` to `warning !== undefined` fails the new test at
`plausibility-report.test.ts:252`. Ticket 164's intent survives — its two tests
moved to `unique-effect`, a cause where "unmeasured" is honest.

**A1 (material) — four comments still asserted the retracted claim.**
`dead-slots.ts:66` and `:229`, `plausibility.ts:77`, `rank-report-css.ts:295`. The
one at `dead-slots.ts:229` was load-bearing: it justified an _unconditional_
classifier bypass on the refuted premise ("the whole slot's numbers are
compromised"). The bypass is still correct; its stated reason was not.

**A2 (material) — two figures did not reproduce.** "8 of 16 ret BiS-tagged rows
worn at 0.00" is actually **7 of 16**. "Shard-bound Bracers at +10.3" sits in
shredzepelin-framed prose but is **nexess's** row (rank 9); shredzepelin's is
−7.34 and unranked.

**A3 (material) — the load-bearing counterfactual was unhedged and unmeasured.**
"An empty neck would price a phase-2 epic at roughly +80–150" is the sole
quantitative bridge from "+12.9" to "the warning was lying". Restated in four
artifacts, measured in none.

**A4 (minor)** — `isUnmeasuredSlot`'s parameter type `{cause?: string}` is wider
than every caller needs. A typo'd `"worn-unrankible"` typechecks clean and
silently restores the old behaviour; the new test catches it at runtime, so this
is defence-in-depth, not a live bug.

**A5 (minor)** — two PLAN.md handoff links use `../.scratch/...`; PLAN.md is at
repo root so they resolve outside it.

**A6 (minor)** — ticket 259's index.json command raised `KeyError: 'items'`; the
file is id-keyed at top level.

**Verified exact:** "0 of 44 owned rows above cutoff"; "every worn item scores
0.00" (44/44); "+12.9 neck / +7.8 back"; `486f977`'s four-file scope with no
`rank.ts`. **Caveat it raised:** waist, the third `worn-unrankable` slot, tops at
**+48.0** — printed by the entry's own quoted command but omitted from the prose,
which cited the two most favourable slots.

## Domain

**D1 (blocking, and the sharpest finding of the review) — ticket 259 named the
wrong item, on a wrong game fact.** Item 32387 Idol of the Raven Goddess carries
**no personal DPS for a feral cat**: its only sim effect upgrades the _party_
Leader of the Pack aura from Regular to Improved (`sim/druid/druid.go:166`,
`feralcat/feralcat.go:78-84`), and Improved LotP grants `MeleeCritRating, 20` to
**party members**, not the wearer (`sim/core/buffs.go:817-830`). `db.json` lists
the effect literally as `"Improved Party Auras (39926)"`;
`sim/druid/items.go:209-212` registers it as a no-op.

These are single-actor sims, so pooling it would produce a row scoring
**approximately zero** against the worn Everbloom Idol's `IdolShredBonus += 88`.
The ticket called this "the highest-value fix in this pass"; it is the lowest.

**The durable lesson, larger than the ticket:** `bisTags` corroboration — the
technique both SME handoffs leaned on hardest, and the thing that made these
verdicts credible — **silently fails for party-buff items**. An item can be
genuinely best-in-slot for a raiding feral and worth nothing in a solo-actor
ranking.

**The pool gap itself is real** (`inPool=false` for 32387 in both reports, both
pools 228 rows, `ranged: Everbloom Idol(0.0)`). Only the severity and framing were
wrong.

**D2 (material)** — Idol of Terror (33509) is **`phase: 4`** in upstream's own db,
so it is correctly absent from a `maxPhase: 2` run rather than missing. The SME
asserted P2 relevance while its own handoff admitted it had not confirmed that,
and the claim propagated into the review prompt as established. Idol of Feral
Shadows (28372, phase 1, Rip damage per combo point per tick) **is** a legitimate
P2 competitor — and is the one the ticket did not name.

**D3 (material)** — the idol slot is closer to "one idol dominates" than to "a
live P2 decision". Both handoffs and the ticket assert otherwise without measuring
either idol.

**Verified correct — no finding:**

- **Wolfshead Helm / ~208 DPS tier-5 head loss.** `HasItemEquipped(8345, Head)`
  sets `Rotation.Wolfshead` (`feralcat/rotation.go:52`) and genuinely branches
  logic at `:174` and `:260`, on top of +20 energy per cat shift. Losing the
  rotation, not the stats, is the right explanation and ~9% a plausible magnitude.
- **Shard-bound Bracers +10.3.** 32647 has `sockets: [3]` and a +4 AP socket
  bonus; the worn 27712 has neither. Item level is the wrong yardstick.
- **Leather-over-plate for ret at P3.** Upstream's own
  `ui/paladin/retribution/gear_sets/p3.gear.json` carries leather on six slots and
  mail on two. TBC ret gains no AP from agility; these are carried by flat AP/crit
  budget. Not a wrong-role tell.
- **The `do-not-trust` overturn is justified on the gear.** Re-derived
  independently: every worn item present in its own pool scores exactly `0.00` in
  both feral reports.

## Standards + Spec

### Standards

**S1 (hard) — durable-claims breach in two committed documents.**
`docs/verification-log.md` said the tip `ls` "returns 14, because this branch
added two"; both numbers wrong (16 and 4). `PLAN.md` said "twelve SME handoffs
exist" citing a bare `ls` that returns **16** at tip — pinned to no ref, so
already false and unfalsifiable by design.

**S2 (hard)** — ticket 259's `index.json` command does not run (same as A6).

**S3 (judgement)** — `isUnmeasuredSlot`'s widened parameter type is **Primitive
Obsession**; callers pass `DeadSlotWarning`, which has a typed `cause`.

**S4 (judgement)** — the ticket-253 explanation is repeated at the function, the
nav chip and the row — **Duplicated Code** in prose, now that the predicate is
named and documented.

**Clean:** 20 commit messages, no seven-rule violations (longest subject 60 chars;
16 of 20 at 49 or below). Tickets 256/257/258/259 **all allocated correctly** from
`NEXT` and bumped in the same commit — 252's breach was not repeated. Tests assert
through `renderRankHtml`, the module interface, not stage internals.

### Spec

**Sp1 (material) — the gate closed on a false caveat count.** The rule was
pre-registered as "every caveat fixed or SME-agreed-ticketed". Both closure
documents said "exactly two `medium` caveats"; there are **three**. The third
(slamaltman's absent `plausibilityWarnings` key) is benign — the SME input note
was wrong, not the emitter — but it was neither fixed nor ticketed nor dismissed,
and `RESUME.md` had flagged it as "worth a look".

**Sp2 (material) — "every other caveat is low and disclosed in the output" is
false for two of them.** Caster cloth padding the feral pool appears in no warning
or transcript (`grep -ci cloth` → 0/0), and per-row gem/enchant detail is absent
from the report — that caveat _is_ the absence of disclosure.

**Sp3 (minor)** — ticket 253 was marked `closed` with two acceptance boxes still
unticked; one is obsolete (its premise was refuted) and one is now satisfied.

**Sp4 (minor)** — the branch closed the gate box, which its own brief listed under
Out of scope ("Do not edit PLAN.md's gate line"). Authorised by `RESUME.md` and
the owner's resume instruction, but it is the brief's named exclusion.

**Clean:** no scope creep in code — zero files under `packages/` beyond the fix.
Nothing needed was lost with the abandoned plan; the decision log's Gate B
reasoning is measured and covers every dropped deliverable. Ticket 257's handoff
to the owner is properly recorded as deliberate. Ticket 258's `wontfix` reasoning
holds (`grep -rli powershift packages/core/src/` → 0).

## Summary

The fix is correct and the gate closure stands. Every material finding was about
**how confidently something true was stated**, plus one genuine game-fact error in
a ticket's framing that would have sent a fixer at a no-op.

Worst per axis — Adversarial: A1 (four comments asserting a retracted claim, one
of them load-bearing). Domain: D1 (32387 scores ~zero in a single-actor sim; the
ticket called it the top prize). Standards: S1 (durable-claims breach in the two
documents that close the gate). Spec: Sp1 (gate closed on a false caveat count).

A process note worth recording: the adversarial axis reverted four tracked files
mid-review, reading concurrent orchestrator edits as a rogue subagent. Those edits
were deliberate corrections and were reapplied. Reviewers write nothing — but the
orchestrator should not edit tracked files while a read-only axis is running
either.

## Disposition

| ID  | Axis        | Disposition | Ticket / note                                                                                                                                                                                                                                                                                 |
| --- | ----------- | ----------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| A1  | Adversarial | fixed       | All four comments reworded. `dead-slots.ts:229` now states the bypass is right for a different reason — the slot lacks the worn item's own row — rather than on the refuted premise.                                                                                                          |
| A2  | Adversarial | fixed       | Corrected to 7 of 16, with the measuring command; the bracer row attributed to nexess with shredzepelin's −7.34 named.                                                                                                                                                                        |
| A3  | Adversarial | fixed       | The +80–150 band is now marked **hypothesis, untested**, with a note that the conclusion rests on the code path and the 44/44 zero rows instead. Waist at +48.0 named alongside neck and back.                                                                                                |
| A4  | Adversarial | defer       | `isUnmeasuredSlot`'s type could narrow to `DeadSlotWarning \| undefined`. Runtime-caught by the new test; a compile-time guard is a small follow-up. `.scratch/carry-forward/issues/260-narrow-isunmeasuredslot-parameter-type.md`                                                            |
| A5  | Adversarial | fixed       | Both PLAN.md links made root-relative.                                                                                                                                                                                                                                                        |
| A6  | Adversarial | fixed       | Ticket 259's command corrected to the id-keyed form and re-run.                                                                                                                                                                                                                               |
| D1  | Domain      | fixed       | Ticket 259 rewritten: 32387's party-aura effect explained with source citations, acceptance re-aimed at 28372 Idol of Feral Shadows, severity downgraded from "highest-value fix". The `bisTags`-fails-for-party-buffs lesson recorded in the verification log, where it outlives the ticket. |
| D2  | Domain      | fixed       | Idol of Terror's `phase: 4` recorded in 259; the P2-relevance claim withdrawn.                                                                                                                                                                                                                |
| D3  | Domain      | fixed       | 259 now says the slot is closer to "one idol dominates" and that neither idol was measured.                                                                                                                                                                                                   |
| S1  | Standards   | fixed       | Log entry corrected to 16/4; PLAN.md pinned to `git ls-tree 9a4b932`, which is falsifiable and stays true.                                                                                                                                                                                    |
| S2  | Standards   | fixed       | Same as A6.                                                                                                                                                                                                                                                                                   |
| S3  | Standards   | defer       | Same finding as A4, from the standards side. `.scratch/carry-forward/issues/260-narrow-isunmeasuredslot-parameter-type.md`                                                                                                                                                                    |
| S4  | Standards   | wontfix     | The two call-site comments each explain a different site's behaviour (nav chip vs row styling) and the duplication is three short lines. Removing them would push a reader to the predicate for context the call site needs inline.                                                           |
| Sp1 | Spec        | fixed       | Both documents corrected to three `medium` caveats, with the third dismissed **in writing** — the note was wrong, not the emitter — rather than dropped.                                                                                                                                      |
| Sp2 | Spec        | fixed       | The log now says plainly that two `low` caveats are **not** disclosed anywhere, with the grep that shows it.                                                                                                                                                                                  |
| Sp3 | Spec        | fixed       | 253's obsolete box marked `[~]` with why; the satisfied box ticked with its evidence.                                                                                                                                                                                                         |
| Sp4 | Spec        | wontfix     | The brief's exclusion was superseded by `RESUME.md`'s pre-registered close rule and the owner's instruction to run the review. Recorded here so the sequence is legible.                                                                                                                      |

## The merge-ready ticket advisory

`pnpm merge-to-dev --check-only` warns that six open tickets name a file this
branch changed. Judged individually, none is this branch's to address:

| ticket                                                   | file                      | judgement                                                                                                                         |
| -------------------------------------------------------- | ------------------------- | --------------------------------------------------------------------------------------------------------------------------------- |
| 133 — negative plausibility band inherited, not measured | `plausibility.ts`         | Pre-existing. This branch changed the `worn-unrankable` message text; the band's calibration is untouched.                        |
| 153 — P3 curated list pinned to the P2 set               | `rank-report.ts`          | Pre-existing display-side item; unrelated to `isUnmeasuredSlot`.                                                                  |
| 255 — consumables comment omits selected-vs-available    | `build_feral_skeleton.py` | This branch corrected the item _name_ in that comment (ticket 256); 255's selected-vs-available point is separate and still open. |
| 72 — let a user supply their own wowsims setup           | `build_feral_skeleton.py` | A feature request against the whole script.                                                                                       |
| 73 — TALENTS/CONSUMABLES still hand-ported               | `build_feral_skeleton.py` | Pre-existing; the branch touched a comment, not the constants.                                                                    |
| 260 — narrow `isUnmeasuredSlot`'s parameter type         | `rank-report.ts`          | Filed **by** this review; deferred deliberately (A4/S3).                                                                          |

Advisory only, and it does not block. Recorded so the next reader sees the calls
were made rather than skipped.

No finding blocks the merge.

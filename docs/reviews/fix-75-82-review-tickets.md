# Pre-merge review — fix/75-82-review-tickets

Diffed against: `1b6dfb1...HEAD` (393ab4f at dispatch; efa13a8 after fixes)

**Scoping note.** The skill's convention is `dev...HEAD`, but this branch is
stacked on `phase-2/trust`, which has not landed on `dev`. `dev...HEAD` is 154
commits across 206 files, almost all of it the trust line's own already-reviewed
work. The reviewers were given `1b6dfb1...HEAD` — the 8 commits this branch
added (18 files, ~589 insertions). Reviewing the trust stack again was out of
scope; it had its own four-axis review on 2026-08-09.

**Dispatch.** Four axes, fresh context, sharp lane (Opus, effort medium).
`codex` was not on `PATH`, so option 2 of the skill's ladder was used. No wall,
no ceiling, no downgrade. The spec axis was pointed at `git show 1b6dfb1:<ticket>`
rather than the working copies, because this branch edits the same ticket files
it closes — otherwise the work would have been checked against a spec it rewrote.

## Adversarial

Four findings, one blocker.

**A1 — `--boss all` exits 2, breaking a documented sentinel. Blocker. Fixed.**
`applyView` reads `"all"` as "no filter" for both `raid` and `boss`
(`view.ts:230-231`), pinned by `view.test.ts:307`. The new `--boss` validation
compared the raw string against `bossesInPool`, and `"all"` is not a boss name
in any universe, so a previously-working invocation died with `unknown boss:
all`. Verified against `data/universes/ret-p5.json`. `--raid all` had the
identical defect at `cli.ts:280` and predates this branch — this diff added a
second instance. Both now route through one sentinel-aware check.

**A2 — the "agrees with applyView" test policed nothing. Should-fix. Fixed.**
`matchesBoss` is module-private in `view.ts`, so the test re-implemented its
predicate inline and compared `bossesInPool` against a copy. If the real
`matchesBoss` changed, the test would still pass. Ticket 75's claim that "a test
asserts every name the enumerator returns actually matches at least one row" was
true only against a stunt double.

**A3 — `items.ts` states a false mechanism as fact. Should-fix. Fixed.**
Same finding as D1 below; both axes found it independently.

**A4 — the new `--boss` validation had zero test coverage. Should-fix. Fixed.**
There is no `cli.test.ts` in the repo; `main()` shells out to `wowsimcli`.
Ticket 75 disclosed this honestly, but it is _why_ A1 shipped undetected.

Verified clean, with the reviewer's own measurements: `bossesInPool` lists no
boss that filters to zero rows across all six universes; the `<br />` join is
escape-then-join and safe; the digest repin is honest (independently computed
162 + 81 + 2 + 420 = 665 bytes, matching `11450 - 10785` exactly); the relic
sweep is non-vacuous; the CRLF fix changes no behaviour on Linux/CI; tickets 74
and 82's numbers reproduce.

## Domain

Six findings. Two corrections, one of them a real bug outside the diff.

**D1 — the `enchantable` docstring's stated cause is false. Medium. Fixed.**
It claimed `enchantAppliesToItem` "fails closed for relics today because db.json
ships no enchant whose type is 14". `data/enchants/index.json` ships **four**
type-14 scopes (2523 Biznicks, 2722 Adamantite, 2723 Khorium, 2724 Stabilitzed
Eternium). The real gate is an explicit _shootable_ allowlist in `enchants.ts`.
A durable-claims violation: checkable against committed data, and wrong. The
outcome the test pins was always right; only the reason was wrong.

**D2 — `RangedWeaponType` constants are off by one. Real bug. Deferred to
ticket 83.** `enchants.ts:35-38` declares Bow 2 / Crossbow 3 / Gun 4 against
`common.proto`'s Bow 1 / Crossbow 2 / Gun 3 / Thrown 4. Measured at runtime:
all 66 bows are denied scopes they take in TBC, and all 42 thrown weapons are
granted scopes they never take. `WAND = 5` is right only by coincidence.
**Latent, not live** — every shipped universe contains only relics (6 idols,
7 librams), so nothing is mis-scored today. Outside this diff, so filed rather
than fixed here.

**D3 — hit-cap arithmetic correct, one constant unverifiable in-repo.** 9%
yellow-hit cap and 15.769233 rating per 1% both match TBC/wowsims knowledge, and
`caps.ts:54` correctly warns off the spell constant. The reviewer could not
verify 15.769233 against repo data — `ui/core/constants/mechanics.ts` is not
among the 12 files `data/wowsims.lock.json` pins — and said so rather than
asserting. Ticket 77's `9 × 15.769233 = 141.923097` is arithmetically right.

**D4 — Heroic Presence and Salvation framing correct.** Party-wide +1% hit,
Draenei-sourced, strictly one-sided, matching `docs/phase0-findings.md` §10. The
refusal to render a symmetric ± band is the right call. The off-tank inference
is correctly hedged as a question, not a verdict.

**D5 — `bossesInPool` correct; one cosmetic gap.** "Prince Malchezaar" is the
right spelling. All 59 boss strings across `ret-p*.json` are canonical, so no
player typing the obvious name gets rejected. Zero sources carry a boss without
a zone, so `--raid` scoping loses nothing. `"Trash"` appears as a boss name on
108 entries across 6 zones and shows up in the suggestion list as though it were
an encounter — harmless, not fixed.

**D6 — the verification-log BiS correction reproduces exactly.** Re-measured
independently: 11 rows at p2, 12 at p3/p4/p5, every one with `curatedSets` of
`p1`/`preraid` only. As an SME, none of the ten named items is misclassified —
all are pre-raid/T4/Kara-era ret gear that should not carry a current-stage BiS
badge at p3-p5. Genuine fix, not a regression.

## Standards + Spec

**Standards: no hard violations.** The JSON import in `enchants.test.ts` is a
value source with a hand-written type applied to it, not a type derived from
JSON — the same convention `items.ts` and `enchants.ts` already use, so the
`AGENTS.md` ban does not bite. No test asserts on stage internals. Comment
policy compliant. Durable claims called "notably strong": every commit body
names a re-runnable command or observed artifact, and `575c71d` retracts a prior
false claim rather than papering over it. Commit-per-slice compliant.

Baseline smells, all judgement calls: the boss-match predicate written three
times (**fixed** — extracted `sourceMatchesBoss`); three spellings of "all
sources of an entry" (**partly fixed** — `sourcesOfEntry` added, `zonesInPool`
left alone); four repeated `newline=""` sites in `parse_atlasloot.py` where a
`write_json` helper would make a fifth writer correct by construction (**not
fixed** — mechanical, and the double-write it sits next to is ticket 71).

**Spec: no spec failures.** All five flagged deviations judged justified. On
ticket 76: "the requirement is the rendering; the meta fields were the proposed
means" — adding them would duplicate in-scope state, and the ticket's own
diagnosis ("a rendering gap, not a data gap") endorses the choice. On ticket 81:
"document" is verbatim option two, and the reasoning is sound. On ticket 79: the
removed export was verified dead. On ticket 82: the author's correction is right
and the ticket was wrong — the reviewer re-ran the commands and confirmed the
three-dot diff is empty by construction, not by staleness. On ticket 74: the
"intended" conclusion is correct, re-derived cell-for-cell, so nothing went
unfiled. The unticketed CRLF commit is a justified incidental fix, not creep.

One near-vacuous assertion caught: `expect(html).toContain("test")` also matches
the footer's contentHash. **Fixed** — tightened to the whole provenance sentence.

## Summary

Nine findings across four axes. One blocker (A1), self-inflicted and now fixed
with a regression test. Four should-fixes fixed. One real pre-existing bug found
outside the diff (D2) and filed as ticket 83. Two cosmetic items (D5's "Trash",
the `write_json` helper) left alone deliberately.

The blocker is the finding that justifies the exercise: `--boss all` was a
working invocation this branch broke, and no axis except a fresh adversarial
reader would have caught it, because the code that broke it has no test and the
author believed the validation was obviously correct.

`pnpm verify`: 475 tests pass (up from 471), typecheck / lint / format clean,
all data gates green.

## Disposition

| ID  | Axis        | Disposition | Ticket / note                                                                                         |
| --- | ----------- | ----------- | ----------------------------------------------------------------------------------------------------- |
| A1  | Adversarial | fixed       | `"all"` sentinel honoured for both `--raid` and `--boss`; pure `validateViewFilter` + tests (efa13a8) |
| A2  | Adversarial | fixed       | `sourceMatchesBoss` extracted; `view.ts` and the test share one predicate (efa13a8)                   |
| A3  | Adversarial | fixed       | Same as D1 — docstring corrected (efa13a8)                                                            |
| A4  | Adversarial | fixed       | Validation moved to a pure function and tested; CLI wiring still untested by design                   |
| D1  | Domain      | fixed       | `items.ts` now cites the shootable allowlist and the four real type-14 scopes (efa13a8)               |
| D2  | Domain      | defer       | `.scratch/carry-forward/issues/83-ranged-weapon-type-constants-off-by-one.md`                         |
| D3  | Domain      | wontfix     | Correct as written; the unpinned upstream constant is a vendoring question, not this branch's         |
| D4  | Domain      | wontfix     | No finding — framing verified correct                                                                 |
| D5  | Domain      | wontfix     | `"Trash"` in the suggestion list is cosmetic and honest; it is a filterable name                      |
| D6  | Domain      | wontfix     | No finding — correction reproduces exactly                                                            |
| S1  | Standards   | fixed       | Boss-predicate triplication — same fix as A2                                                          |
| S2  | Standards   | wontfix     | `write_json` helper in `parse_atlasloot.py`; mechanical, and adjacent to open ticket 71               |
| S3  | Standards   | wontfix     | `zonesInPool` left on its own loop; changing it is unrelated churn                                    |
| P1  | Spec        | fixed       | `toContain("test")` tightened to the full provenance sentence (efa13a8)                               |

# Pre-merge review — feat/sweep-ret-tickets

Reviewed range: `5be6a814d97488201a09f7b3f709ea144e83b1e9..952fdc6f4f548c5e5744658737e11df883354dd6`

Three axes, all Opus at effort `medium`, fresh context, dispatched in one
parallel batch. `codex` is not on `PATH` on this machine, so the cross-vendor
first choice was unavailable — a harness ceiling, not a downgrade.

The range carries the whole `feat/ret-p3-data` line plus this sweep.
**`feat/ret-p3-data` was already reviewed** (`docs/reviews/feat-ret-p3-data.md`);
all three axes were told to read it and not re-report its findings, so
everything below is about the sweep commits.

**This branch supersedes `feat/ret-p3-data`.** It is a strict superset — that
branch's tip `cffaee0` is an ancestor here. Merging this one carries it, so
`feat/ret-p3-data` does not need a separate merge.

Scope: tickets 154, 157, 160, 161, 163, 164 (and 158/159, which turned out to
be already resolved on the base — see below).

## A correction to the sweep plan

The plan assigned tickets 158 and 159 to worker B1 as work to do. They were
**already resolved on the base** `cffaee0` before the sweep began. Verified:
`git show cffaee0:.scratch/carry-forward/issues/158-*.md` and `159-*.md` both
read `Status: resolved`, and `git show cffaee0:packages/core/src/ep-weights.ts`
exists. The plan was written against a stale reading of `feat/ret-p3-data`.
Ticket 154's file, meanwhile, did not exist on that base at all — it was filed
on the branch-A side — so B1 filed it fresh here. B1 correctly did the one
outstanding piece of work instead of redoing solved work.

## Adversarial

**A1 — the `do_restore` override check crashes instead of naming the
regression.** Breaking `do_restore`'s `meta.get("commit", sha)` read makes
`check_sync_wowsims.py` die with an unhandled `FileNotFoundError` in its own
harness, printing **zero** `FAIL` lines.

The reviewer reported this as a false pass — "guard rails ok", exit 0. **That
does not reproduce.** I re-ran the mutation myself: exit is **1**, so
`pnpm verify` fails and the regression cannot land silently. The gate holds;
what is broken is the diagnosis. A traceback naming a temp path reads as a
broken test harness, not as the exact regression the ticket-160 case exists to
catch. Filed as ticket 170 with the corrected severity.

**A2 — the force-include has no detector for the next silently-dropped item.**
The allowlist's shape is defensible (widening `PHASE_HEROIC_DUNGEONS` would
admit ~280 unrelated items and reopen ticket 17). What is missing is detection:
`map_db_source` still cannot resolve five-man zones outside
`PHASE_HEROIC_DUNGEONS`, and `WOWHEAD_HEROIC_ZONE_RE` still misses a
`" - Heroic"` suffix. The only thing that caught these six was an SME reading a
ranking. `ticket157ForceIncluded` records what was rescued, never what is still
being lost.

**A3 — two comments overstated the bypass**, claiming force-admission happens
"regardless of whatever the gate below decides" when `eligible_d7` and the
phase cut both still apply. Wrong in the dangerous direction for a comment.

**A4 — the `rank-report.test.ts` digest pin absorbs a 1384-byte delta** with
hand-narrated arithmetic that the assertion itself cannot verify. Nit; the four
behavioural tests in `plausibility-report.test.ts` carry the real load.

Verified clean by the reviewer, with commands: the recall claim is honest
(denominator unchanged at 123, `recalled` 105 → 111, and the six items that
left `missedItems` are exactly the force-include set); the force-include does
**not** bypass `eligible_d7` or phase gating; the `PER_FILE_PIN` cover is real
for `do_update` (mutating it produced 8 distinct `FAIL` lines); the
`worn-unrankable` guard is not dead code (four direct tests over
`classifyDeadSlots` that no universe file can rot); and ticket 164's
`unmeasured` marking keys off the engine's own `dead-slot` warning rather than
a heuristic, with a negative test proving `chest` does not pick it up for free.

## Domain

**D1 — the six force-admitted items are the right six.** Verified against
`vendor/wowsims/db.json`: all three librams are `type 14, rangedWeaponType 7`
→ `slot: "ranged"`; all three trinkets are `type 12`; every one has
`classAllowlist: None` and `quality >= 3`, `phase 1`. The commit's zone
rationale resolves correctly (3713 Blood Furnace, 2557 Dire Maul, 2366 Black
Morass, 3849 Mechanar).

**D2 — the exclusion line is drawn by era judgment, not by the parser.**
Four of the five excluded trinkets are pre-TBC raid loot, so that rationale
holds — but **23206 Mark of the Champion has `sources: null`**, the identical
shape to 31033 and 31856, which _were_ force-admitted for exactly that reason.
And **19343 Scrolls of Blinding Light is `classAllowlist: [2]`, paladin-only** —
the one excluded trinket that is specifically a paladin item, excluded on a
zone rationale that never mentions it. The call is defensible on the merits;
the recorded reason under-describes it.

**D3 — the relic slot now looks measured while three of its seven rows are
not.** 28592, 30063 and 32368 carry `deltaDps: -13.806909042320513` — identical
to 16 significant figures, with identical `se`. Those three exist only as
commented-out stubs in the pinned fork, so they score on stats alone. The
section renders `7 candidates / 1 BiS candidate` with ordinary `delta down`
styling and **no disclosure**.

This is the gate-relevant finding: before ticket 157 the slot at least carried
a dead-slot retraction; now that 27484 is a pool member the guard correctly has
nothing to fire on, and **the slot's presentation regressed as its data
improved**. A ret is not misled about which relic is best — 27484 correctly
tops it — but is misled into believing the sim ranked three librams it never
simulated.

**D4 — recall improves the metric more than the thing measured.** 85.4% → 90.2%
is a real gain on real items, but two remaining misses (**27878** Auchenai
Death Shroud, **29247** Girdle of the Deathdealer) are TBC-era, `d7Eligible`,
and rejected by the same zone gate — the line was drawn at "what the SME
named", not at "what the criterion implies".

**D5 — the feral regen is domain-correct.** A p2 entry legitimately carrying a
`p3_6p` tag is intended: the generator's comment says `curatedSets` is full
provenance and stays unscoped, and `isCuratedBis()` reads `bisTags` with a
docstring saying "Deliberately not `curatedSets`". Phase-scoped BiS claims and
unscoped provenance claims ride different fields.

**D6 — no contradictions with `docs/stage0-findings.md`.** Nothing in the sweep
touches WCL field usage, the 19→17 mapping, race or spec inference, or
`currentPhase` derivation.

## Standards + Spec

**S1 (blocker, fixed) — ticket 157's force-include silently invalidated both
feral universes.** `TICKET_157_FORCE_INCLUDE` was applied with **no spec
gate**, and three of the six pass `eligible_d7` for feral too. Commit ordering
was the trap: `c37b8e7` (ticket 154, regen feral) is an ancestor of `c718d38`
(ticket 157), so B1 regenerated feral against the pre-157 generator and 157
then changed the generator and re-checked only the four ret universes.

I reproduced it: a feral-p2 regen at `952fdc6` produced **256** against the
committed 253. This re-broke, two commits later, the exact defect ticket 154
had just fixed — and `pnpm verify` was green throughout, because nothing gates
committed universes against a regen.

**S2 (should-fix, fixed) — ticket 154's "253 or 256" verdict was not
discharged.** It read "253 is correct … the earlier report of 256 traces to
different code, not this repo state" — an unevidenced causal claim with no
command and no _hypothesis_/_untested_ marker, and materially wrong: 256 was
reproducible on this branch in one command. The measurement was honest when
taken; the _disposal of the conflicting figure_ was the failure.

**S3 — tickets 157, 163, 164 meet their "Done when"; 160 and 161 verify
green.** Confirmed independently for 163 (27484 ranks `slot: ranged,
deltaDps: 0, owned: true`) and 164 (report-layer only — `79aecf2` touches
`rank-report.ts`/`rank-report-css.ts` and tests, with no change to `rank.ts`,
`dead-slots.ts` or `plausibility.ts`; **no scope breach**).

**S4 — the ticket 169 deferral is honest.** Ticket 164's comment states the
trinket half is not done in bold, gives the engine-signal reason, and 169 is a
real file with a substantive "Done when". Its comment also volunteers,
unprompted, that the new markup renders empty in the live re-run because 157
removed the only firing case — disclosed, not hidden.

**S5 — no forbidden action taken.** No merge into `dev` (the two merges are
worker fan-ins onto the feature branch, which `AGENTS.md` § Parallel agents
permits); `git log -S'TBC_ALLOW_DEV_MERGE'` over the range is empty; no diff to
`AGENTS.md`, `CLAUDE.md`, `.claude/`, or `vendor/`.

**T1 — `TICKET_157_FORCE_INCLUDE`'s provenance is well above the bar.** A
15-line comment naming the ticket, why the gate rejects each class, the
specific zones, why widening was rejected with its ~280-item blast radius, and
ticket 17 as the deferring decision — plus a `dict[int, str]` mapping each id
to human source text, so no entry is a bare number. Its defect was **scope, not
documentation**; the comment is in fact what proved the leak unintended.

**T2–T4 — comment policy, test placement, and Types from JSON all clean.**
Comments explain reader-facing consequence rather than restating markup; 164's
tests assert on `renderRankHtml`'s output (the module interface), not stage
internals; the new `deadSlotWarningsBySlot` narrows via `Extract<>` on a
hand-written union, which is the correct pattern.

**T5 — one durable-claims overreach.** `c718d38` closes with "All four ret
universes regenerate byte-stable on a second run" — a weaker property than
reproducing the committed artifact, placed where a reader takes it as the
latter. True for ret, and the careful scoping to "ret" is exactly where the
feral gap hid.

**T6 — two commit subjects over 50 chars** (56 and 51). Bodies correct
throughout.

## Summary

The sweep's ret-side work is sound and independently verified: the six items
are correctly chosen and correctly admitted, recall moved for the reason
claimed, ticket 163's worn relic now ranks as an owned row at 0.00, and ticket
164's report changes are report-layer only and properly tested.

The blocker was a scope bug with an unusually instructive shape. Ticket 157's
force-include was not gated by spec, so a ret-only fix leaked into the feral
universes **two commits after ticket 154 had fixed exactly that class of
drift** — and every gate stayed green, because nothing in `pnpm verify`
compares a committed universe against a regen. Fixed at `b2da640`; the missing
gate is ticket 172, and it is the finding I would act on first, since this
class of drift has now recurred twice in three weeks and both times a human
found it.

Fixing it surfaced a second, quieter problem. Once 28034 legitimately entered
the feral universe, `pool-hardening.test.ts` failed: the item is Wowhead-listed
yet ships as `kind:unknown`. The test is right and the data is wrong — all six
force-included items have their origin recorded in the dict's own values, but
the closed `ItemSource` vocabulary has no variant that carries prose. I
confirmed this is **not** caused by my ret gate (ungated, 28034 still ships
`unknown`), excepted the six by id so a new item acquiring that shape still
fails, and filed ticket 174.

The domain axis's D3 is the finding most worth the user's attention before any
SME decision: the relic slot's presentation got worse as its data got better.
Three librams the sim never simulated are rendered as ordinary losses, in the
exact slot that blocked the SME gate. **Whether the SME §9.6 gate reopens is
the user's call**; no verdict file was edited. My read for the engineering team
is that membership is now met and presentation is not.

Nothing here argues against merging. The blocker is fixed, `pnpm verify` is
green on the tip, and the remaining findings are follow-ups rather than
regressions this branch introduced.

## Disposition

| ID  | Axis         | Disposition | Ticket / note                                                                                                                                                                                                                                                                         |
| --- | ------------ | ----------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| A1  | Adversarial  | defer       | `.scratch/carry-forward/issues/170-do-restore-override-check-crashes-instead-of-failing.md` — re-verified: exit is 1, not 0, so the gate holds; the reported false-pass did not reproduce and the ticket records the corrected severity                                               |
| A2  | Adversarial  | defer       | `.scratch/carry-forward/issues/173-nothing-detects-the-next-silently-dropped-item.md`                                                                                                                                                                                                 |
| A3  | Adversarial  | fixed       | `b2da640` rewrites the admission-site comment to name what still applies (`eligible_d7`, the phase cut) instead of claiming a blanket bypass                                                                                                                                          |
| A4  | Adversarial  | wontfix     | The digest is a genuine tripwire and the behavioural claims are covered by four tests in `plausibility-report.test.ts`; byte-count narration in a comment is not worth a commit                                                                                                       |
| D1  | Domain       | wontfix     | No defect — the six verified correct against `vendor/wowsims/db.json`                                                                                                                                                                                                                 |
| D2  | Domain       | defer       | `.scratch/carry-forward/issues/173-nothing-detects-the-next-silently-dropped-item.md` — the same manual-line-drawing problem; 23206 and 19343 are recorded there                                                                                                                      |
| D3  | Domain       | fixed       | `41f3941`..`a6c617b` resolve ticket 171 by exclusion (user decision 2026-08-15): stub-only items are dropped from every universe via `data/sim-implemented-effects.json`, so unmeasurable rows are never simmed or shown                                                              |
| D4  | Domain       | defer       | `.scratch/carry-forward/issues/173-nothing-detects-the-next-silently-dropped-item.md` — 27878 and 29247 named there as evidence the list will drift                                                                                                                                   |
| D5  | Domain       | wontfix     | No defect — unscoped `curatedSets` is intended, and `isCuratedBis()` reads `bisTags`                                                                                                                                                                                                  |
| D6  | Domain       | wontfix     | No defect — no contradictions found                                                                                                                                                                                                                                                   |
| S1  | Spec         | fixed       | `b2da640` gates the force-include to ret and regenerates all six universes; `git diff --numstat -- data/universes/` is empty after a full regen                                                                                                                                       |
| S2  | Spec         | fixed       | `a448466` replaces ticket 154's verdict with the reconciled three-number account (253 committed, 256 ungated, **254** correct) and names 28034's real source                                                                                                                          |
| S3  | Spec         | wontfix     | No defect — criteria met, verified independently for 163 and 164                                                                                                                                                                                                                      |
| S4  | Spec         | wontfix     | No defect — the ticket 169 deferral is explicit and substantive                                                                                                                                                                                                                       |
| S5  | Spec         | wontfix     | No defect — no forbidden action taken                                                                                                                                                                                                                                                 |
| T1  | Standards    | wontfix     | No defect — provenance is exemplary; the scope bug is S1, fixed                                                                                                                                                                                                                       |
| T2  | Standards    | wontfix     | No defect — comment policy, test placement and Types from JSON all clean                                                                                                                                                                                                              |
| T5  | Standards    | wontfix     | The claim is true as scoped to ret; the feral gap it sat beside is fixed at `b2da640` and reconciled in ticket 154                                                                                                                                                                    |
| T6  | Standards    | wontfix     | Two subjects over 50 chars, bodies correct. Rewriting history costs more than it returns                                                                                                                                                                                              |
| O1  | Orchestrator | fixed       | `.scratch/carry-forward/issues/174-force-included-items-claim-unknown-origin-they-have.md` — fixing S1 surfaced that all six force-included items ship `kind:unknown` despite recorded origin; excepted by id at `57adad6` so a new item of that shape still fails, real fix ticketed |
| O2  | Orchestrator | defer       | `.scratch/carry-forward/issues/172-no-gate-compares-committed-universes-against-a-regen.md` — the missing gate that let S1 happen at all, and the one I would act on first                                                                                                            |

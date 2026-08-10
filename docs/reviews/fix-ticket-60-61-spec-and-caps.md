# Pre-merge review — fix/ticket-60-61-spec-and-caps

Diffed against: `phase-2/trust...fix/ticket-60-61-spec-and-caps` (463a4f0),
merge-base `5e9ea89`. 13 files, ~550 insertions before the fixes below.

Four reviewers, each on the sharp lane (Opus, effort medium) with **fresh
context** — the diff and their own brief only, no access to the authoring
session. `codex` is not on `PATH`, so option 1 of the dispatch ladder was
unavailable; option 2 (fresh sharp subagents, all axes in one parallel batch)
ran normally. No wall, no downgrade.

This branch was written in the same session that then reviewed it, which is
exactly the case fresh-context reviewers exist for — and it paid: **the
adversarial axis found two real defects in the new code**, one of them the same
class of bug the branch was written to fix.

## Adversarial

Four findings. Both blocking ones were confirmed by hand before fixing.

**A1 — the under-cap banner promised the wrong direction.** `disclosure.ts`.
Ticket 60's whole point is that talent hit is _assumed_, so the error runs both
ways. The over-cap branch was corrected for that; the under-cap branch was not,
and still appended "The real shortfall may be smaller than this" next to
"Assumes 3/3 Precision". For a character who skipped Precision the rating is
~47 too high, so the true shortfall is **larger**. Reproduced:

```
~23 rating under the hit cap — Heroic Presence … would lower the cap by ~16.
The real shortfall may be smaller than this. Assumes 3/3 Precision — your
logged build is not read for talents yet.
```

A confidently wrong direction with no error — the failure mode the ticket
exists to prevent, reintroduced by its own fix. **Fixed**: with an assumption
present the line now reads "The real shortfall could run either way."

**A2 — the test that claimed to pin the over-cap change could not fail.**
`disclosure.test.ts`. It passed `gap: 22.92` — positive — which takes the
**under-cap** early return, a branch that never contained "at least this much".
The reviewer proved it by deleting the entire floor logic and watching all 15
tests stay green. **Fixed**: the test now uses a negative gap and asserts both
arms. Re-verified by mutation — hardcoding the floor back makes it fail:

```
× hitCapBanner > drops the over-cap floor once talent hit is only assumed
```

**A3 — the refusal message leaked a raw tree index.** `rank.ts` rendered
`` `tree ${classification.treeIndex}` `` into user-facing CLI output ("reads as
tree 1, not ret"), which means nothing to a player. Also noted independently by
the domain axis. **Fixed**: added `treeName()` to `spec.ts` (which already owns
class/tree knowledge), so the message reads "a Protection build". A test pins
it, and covers the `treeIndex: 0` (holy) arm that had no coverage.

**A4 — `spec-mismatch` throws before the job row is created**, so unlike every
other `RankError` it never reaches the `errorKind` catch and the Phase 2 job
API records nothing. **Deferred to ticket 64** — moving the guard after job
creation is a sequencing change with its own blast radius, and the CLI path
(the only caller today) reports it correctly.

**Cleared under scrutiny:** the `talentHitFromString` refactor preserves
behaviour exactly on the 0-rating, missing-segment and non-digit paths
(`charAt` out of range → `""` → `Number("")` is 0 → `<= 0`); absent `className`,
`unsupported-class`, `ambiguous` and `needs-form-uptime` all correctly pass
through; `cli.ts` prints `kind` generically so the new kind needs no case; the
2/3 disclosure test genuinely decodes rather than hardcoding.

## Domain

**No contradictions against `docs/phase0-findings.md` or
`docs/verification-log.md`.** All six load-bearing game claims verified against
the pinned wowsims source.

- **Precision** — correct on every field. `trees/paladin.json` tree 1
  ("Protection"), local index **2**, `maxPoints: 3`; `sim/paladin/talents.go`
  adds `PhysicalHitPercent` at literally 1%/point. Grepping `hit` across the
  whole paladin tree returns **zero** other hits, and the Retribution tree has
  no hit talent — so ret's only hit talent genuinely lives in another tree.
- **`feral: undefined`** — correct. No feral melee-hit talent exists to miss;
  druid has only spell-hit (Moonkin) and proc hooks.
- **`unsupported-spec` as a positive reading** — domain-sound. The paladin proto
  has three trees and one supported spec, so a plurality in tree 0 or 1 _is_
  evidence the fight was played as something else. A respecced ret's later
  fights classify ret and rank normally; the guard is per-fight.
- **`subType`** — the comment is accurate and does not overclaim, matching
  findings §4's "only returns class-level strings".
- **Talent string layout** — segments sum to **5 / 11 / 45 = 61**, matching
  findings §4's "talent plurality 5/11/45 → Ret" and R18's 61-at-70.
- **Banner** — removing "the only remaining uncounted source" was right and for
  the stated reason. Heroic Presence retained as party-scoped and cap-lowering
  matches R8.

**Unverified (not contradictions).** The 2/3 test string was fabricated by a
`.replace()` whose search literal never appeared in the source string, yielding
a **60-point** build — illegal at level 70. The assertion held, but the fixture
was not a real build. **Fixed**: replaced with `5-062201-…`, verified to sum to
61 with Precision reading 2.

The **known edge** both axes surfaced: a build whose plurality tree is not
Retribution but who is still played as melee DPS (e.g. `[0, 31, 30]`) is
refused. Domain's verdict is that refusing remains the safer arm, since ranking
would run that gear against ret's preset, EP weights and APL. Recorded on
ticket 40 as an accepted edge with the `--fight` override.

## Standards + Spec

### Standards

**S1 — ticket 60's `Status:` carried off-vocabulary prose** (`closed —
assumption kept deliberately, now disclosed`). `issue-tracker.md:32` fixes the
vocabulary and the line is machine-parsed. **Fixed** → `closed`. (The broader
`closed`-vs-`resolved` drift across 37 existing files is pre-existing and not
this branch's to settle.)

**S2 — ticket 61's `Blocked by:` was rewritten to `none` on close**, destroying
the record that the blocker had been _mis-recorded_ — which the ticket body then
spends a paragraph explaining. **Fixed**: the line now says `none` _and_ what it
used to claim and why that was wrong.

**S3 — Data Clump.** `{talent, points, maxPoints}` was spelled out inline in
five places. **Fixed**: extracted `TalentHitAssumption` in `caps.ts`. Taking the
reviewer's better suggestion, `hitCapBanner` now reads the field off the
`HitCapEntry` it is already passed instead of taking a second options
parameter — which deleted the clump, the options object, and `cli.ts`'s
`exactOptionalPropertyTypes` conditional dance in one move.

**S4 — Middle Man.** After the refactor `talentHitRatingFromString` was a
one-line wrapper with **no production caller**, existing only for its own
tests — the same shape ticket 61 was filed about. **Fixed**: deleted; its three
tests now exercise the behaviour through `capStateFrom`, the real entry point.

**S5 — a comment restating its code** in `talentHitFromString`'s docstring, and
a stale "Holy carousel marker" line in a test comment that survived the A3
correction from the previous review. **Fixed** both.

**Not a finding:** the reviewer flagged `packages/core/dist/caps.d.ts` as a
stale tracked artifact. `dist/` is gitignored and **zero** files are tracked —
it was reading a local build directory.

**Clean:** durable claims are well handled — both commit messages and all three
tickets carry re-runnable evidence or explicit measurement, with no unmarked
hypotheses. No JSON-derived types.

### Spec

**P1 — ticket 60's bullet 2 was closed on a reading the ticket did not state.**
The bullet asks for a test showing the cap "does not silently inherit the
preset's Precision"; what landed pins the inheritance itself. **Fixed** by
writing the reading down rather than quietly keeping it: bullet 1 closed on its
_second_ branch (disclose, not thread), so bullet 2 can only mean the
inheritance is no longer **silent**. The ticket now names both covering tests
and states plainly what is _not_ covered and why.

**P2 — ticket 61's bullet 2 is unmet and the close said so only indirectly.**
The unreachability argument holds (verified: `SpecId` is `ret | feral`, so the
`detected: <other spec>` branch needs a second supported spec on one class),
but 61 never said the bullet was unmet, unlike 60 which modelled it. **Fixed**:
61 now carries an explicit "Bullet 2 closes unmet, deliberately" section.

**P3 — ticket 33's third criterion is now genuinely met.** Verified independent
of the author's claim: `rank.test.ts` asserts ≈119.31 through `rankUpgrades`
against the real slamaltman recording, exercising the previously untested
`talentsStringFromRequest` accessor end to end.

**P4 — ticket 40 correctly stays open**, and the diff does not overclaim.

**P5 — the `unsupported-spec` widening is justified scope, but was undocumented.**
Ticket 40's Done-when requires the "no matching fight" decision be written down
before it is built; it was built in 61. **Fixed**: the refusal policy, its two
qualifying shapes, everything that still ranks, and the accepted `[0, 31, 30]`
edge are now recorded on ticket 40.

**P6 — `map.md` was stale.** **Fixed**: 60 and 61 marked closed with their
outcomes, 62 annotated with the unreachability measurement.

## Summary

Sixteen findings. Two were blocking, and both were defects this session
introduced: a banner that stated the wrong direction (A1) and a test that could
not fail (A2). Finding A1 is the same species the branch was written to
eliminate — a plausible number with no error — which is the clearest argument
available for reviewing your own work with fresh context.

Thirteen findings were fixed in this pass. One is deferred to a ticket (A4,
job-row recording), one was rejected as a non-finding (the `dist/` claim, which
did not survive checking), and one is an accepted edge recorded on ticket 40.

The domain axis came back clean on all six game claims, verified against the
pinned wowsims source rather than general knowledge.

`pnpm verify` green after the fixes: 32 files, 440 passed / 2 todo.

## Disposition

| ID  | Axis        | Disposition | Ticket / note                                                                                        |
| --- | ----------- | ----------- | ---------------------------------------------------------------------------------------------------- |
| A1  | Adversarial | fixed       | Under-cap banner says "could run either way" when talent hit was assumed; both arms now tested       |
| A2  | Adversarial | fixed       | Over-cap test uses a negative gap; re-verified by mutation (hardcoding the floor makes it fail)      |
| A3  | Adversarial | fixed       | `treeName()` in `spec.ts`; message reads "a Protection build"; holy/treeIndex-0 arm now covered      |
| A4  | Adversarial | defer       | `.scratch/carry-forward/issues/64-spec-mismatch-throws-before-the-job-row-exists.md`                 |
| D1  | Domain      | fixed       | 2/3 talent string replaced with `5-062201-…`, a legal 61-point build (was a fabricated 60-point one) |
| D2  | Domain      | wontfix     | `[0,31,30]` deep-prot ret is refused; refusing is the safer arm, recorded as an accepted edge on 40  |
| S1  | Standards   | fixed       | Ticket 60 `Status:` prose suffix removed                                                             |
| S2  | Standards   | fixed       | Ticket 61 `Blocked by:` records what it used to claim and why that was wrong                         |
| S3  | Standards   | fixed       | `TalentHitAssumption` extracted; banner reads it off `HitCapEntry`, deleting the options param       |
| S4  | Standards   | fixed       | Unused `talentHitRatingFromString` deleted; its tests retargeted through `capStateFrom`              |
| S5  | Standards   | fixed       | Restating docstring merged; stale "carousel marker" test comment corrected                           |
| S6  | Standards   | wontfix     | `dist/` staleness — not a finding, `dist/` is gitignored and untracked                               |
| P1  | Spec        | fixed       | Ticket 60 records the disclosure reading of bullet 2 and what is not covered                         |
| P2  | Spec        | fixed       | Ticket 61 carries an explicit "bullet 2 closes unmet" section                                        |
| P3  | Spec        | fixed       | Verified: 33's ~119.31 pin is genuine and end to end                                                 |
| P5  | Spec        | fixed       | Refusal policy written down on ticket 40, as its Done-when requires                                  |
| P6  | Spec        | fixed       | `map.md` updated for 60, 61 and 62                                                                   |

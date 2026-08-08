# Pre-merge review — fix/carry-forward-backlog

Diffed against: `phase-2/trust...fix/carry-forward-backlog` (a268467), merge-base
`a2dff47`. 84 files, ~11.5k insertions, ~35 commits.

Four reviewers, each on the sharp lane (Opus, effort medium) with **fresh
context** — the diff and their own brief only, no access to the authoring
session. `codex` is not on `PATH` in this environment, so option 1 of the
dispatch ladder was unavailable; option 2 (fresh sharp subagents, all axes in
one parallel batch) ran normally. No wall, no downgrade.

The branch is a carry-forward backlog burn-down, so the Spec axis was pointed
at the tickets' own "Done when" sections rather than a PRD.

Note the diff was re-pinned mid-review: five commits (`5844b25`…`a268467`)
merged in from another branch, including a previously-stranded 250-line
addition to `docs/verification-log.md`. The merge-base did not move. Those
commits are docs/tickets only — no source — but since the verification log is
the Domain axis's own source of truth, that reviewer was told to scrutinise the
new entries as diff rather than trust them as reference.

## Adversarial

Five findings, two of them blocking. Every claim below was re-verified by hand
before being written down.

**A1 — `matchesRequestedSpec` has zero production callers, so the bug it names
is still live.** `packages/core/src/spec.ts:126`. Ticket 40 shipped the
function, exported it (`index.ts:108`) and unit-tested it, but nothing in
`src/` calls it:

```bash
grep -rn 'matchesRequestedSpec' packages/core/src/
# -> spec.ts:126 (definition) and index.ts:108 (barrel), nothing else
```

A ret request against a protection night still resolves, sims against ret's
preset and EP weights, and returns a confidently wrong ranking with no error.
Ticket 04's first capture — slamaltman's protection night scored as ret — is
the real instance, not a hypothetical. Ticket 40 is honest that the wiring did
not ship; the point here is that a reader of `spec.ts` sees a tested, exported
guard and may reasonably assume it guards something. **Deferred to ticket 61.**

**A2 — the hit cap folds the _preset's_ talent hit onto the _player's_ gear.**
`caps.ts:199` via `talentsStringFromRequest` (`rank.ts:877`), which reads
`raid.parties[0].players[0].talentsString` off the composed request. `compose`
never writes that field from the logged character — the function's own
docstring says so — so it is always the pinned preset's `5-053201-…`, i.e. 3/3
Precision, +47 rating, unconditionally, for every ret character.

What makes this blocking rather than a documented approximation is the timing:
ticket 33 _also_ removed the banner's hedge in the same branch, correctly per
its own "Done when" (_"The banner's 'talents not counted' caveat is removed or
narrowed"_). So the one user-facing sentence that would have flagged the
assumption is gone from the same commit that made the assumption load-bearing:

```
before: "~N under the hit cap counting gear alone — talents and raid buffs are
         not counted and only ever add hit … likely much smaller."
after:  "~N under the hit cap — Heroic Presence … would lower the cap by ~B.
         The real shortfall may be smaller than this."
```

A logged ret paladin who skipped Precision reads ~47 rating too high, `hit.gap`
~47 too low, and `isHitDriven`/`hitRegression` price every candidate against
it — a plausible number, no error, PLAN.md's stated worst case. It also makes
the error two-sided, undercutting the new docstring's argument that Heroic
Presence is "the only remaining uncounted source". **Deferred to ticket 60.**

**A3 — a load-bearing comment stated a decoded fact the data contradicts.**
`caps.ts:145-151` described segment 0 of the talent string as "a
carousel/version marker … not decoded further". It is the Holy tree:
`5-053201-0523005120033125331051` sums per segment to `[5, 11, 45]`, exactly
the Holy/Prot/Ret tuple asserted at `spec.test.ts:16` and `rank.test.ts:103`.
The `treeSegment: 1` index is right; the recorded reason was wrong, so the next
spec added by following the comment would pick the wrong segment. **Fixed** —
the comment now derives the alignment from the segment sums.

**A4 — test theatre: a name promising what the body admits it cannot do.**
`spec.test.ts:100`, "flags a mismatch when talents classify cleanly to a
different supported spec", asserts `classifySpec("Paladin", [20, 20, 5])` — an
_ambiguous_ split — and concedes in its own comment that it is testing
something else. The `{matches:false, detected:<other spec>}` branch, the only
branch distinguishing the function from a bare equality check, is exercised by
no test; three of the five tests in the block assert the identical
`{matches:false, detected:undefined}`. **Deferred to ticket 62.**

**A5 — a tautological test.** `view.test.ts:361` asserts `belowCutoffInView`
and `belowCutoff` agree, but ticket 36 collapsed the recomputation so
`view.ts:214` now assigns `belowCutoffInView: item.belowCutoff` verbatim. It
passes by construction, and the test's own comment says "The two always agree."
The genuine version of this assertion already exists at `rank.test.ts:1899`,
which engineers a paired-replicate crossing rather than recomputing.
**Deferred to ticket 62.**

**Cleared under scrutiny** — worth recording, because these were the likeliest
places for theatre. The reviewer mutation-tested
`check_wowhead_prose_suppression.py` by planting a fake `wowhead` locus row on
an item that already carries a `db` Karazhan locus: exit 1, right message. Both
new Python gates are wired into `pnpm verify` (`package.json:10`) and
`check_boss_aliases.py` guards its own vacuity ("no universe files found"). No
JSON-import type-widening hazard (`SpecId` is hand-written; `ItemSourceKind`
comes from codegen, not a JSON import). Precision's mechanics check out against
the pinned wowsims source (`sim/paladin/talents.go:457`, flat
`PhysicalHitPercent` at 1%/point). The `pool-hardening.test.ts` additions are
substantive: the tier-piece cross-check documents its own mutation test, and
the `KNOWN_UNCORROBORATED` allowlist has a reverse test forcing it to shrink.

## Domain

**No contradictions against `docs/phase0-findings.md` or
`docs/verification-log.md`.** The T6 token mapping — the claim the reviewer was
explicitly told to distrust rather than accept from its commit message — holds
up per piece.

All five new `feral-tokens.json` entries resolve in `data/items/index.json` with
`setName: "Thunderheart Harness"` (the feral variant, consistent with the file's
own stats-based split rule: Malorne Harness 29096 carries Str/Agi, Regalia and
Raiment carry Int/Spirit). Slots are five distinct correct ones — 31039 head,
31042 chest, 31034 hands, 31044 legs, 31048 shoulder — all `phase: 3`. Every
zone/boss reproduces byte-exact from `data/atlasloot_sources.json` keyed on
token id. Vanquisher is correct for druid T6: the tokens sit in consecutive
per-boss triples and the feral picks interleave with the independently
Wowhead-verified ret Conqueror picks with no collision.

The caps arithmetic was independently recomputed from the pinned preset string:
3 × 15.769233 = **47.31**, cap 9% = **141.92**, 72 + 47.31 = **119.31** —
matching the docstring's "≈47 / 142 / near 119" exactly.

Also verified sound: `matchesRequestedSpec` reintroduces no `specID` use and
treats `ambiguous`/`needs-form-uptime`/`unsupported-spec` as non-matches;
`BOSS_UNIT_TO_ENCOUNTER` gets TBC encounter truth right (Illidari Council is
four units, Eredar Twins two, M'uru transforms into Entropius) and correctly
declines to fold the three Karazhan Opera variants, which are distinct
encounters filling one slot rather than aliases; `TOKEN_BOSS_SEPARATOR = " - "`
correctly guards `Fathom-Lord Karathress` against a bare-hyphen split.

**Unverified, flagged separately from contradictions.** The strongest evidence
for the T6 piece↔token pairing is an uncommitted live Wowhead "Currency for"
fetch — the AtlasLoot and db.json cross-checks constrain slot, set variant and
boss, but not which of three same-boss tokens buys the piece. Likewise 31091's
Warrior/Hunter/Shaman grouping is live-page only. Both would be settled by
capturing those lists into a committed fixture the way `atlasloot_sources.json`
is. **Wontfix here:** `feral-tokens.json` already states this limitation in its
own notes ("UNVERIFIED against Wowhead", "still needs a human check"), which is
what the durable-claims rule asks for, and ticket 56 owns the scrape.

Two smaller unverified items: the leading talent-string segment is labelled
"observed empirically" (A3 above now decodes it), and `percentPerPoint` encodes
a modelling choice — Precision grants flat hit _percent_, converted to rating
for cap comparison — which is fine for a shortfall display but is not a
sim-returned number.

## Standards + Spec

### Standards

**S1 — ticket 57 carried `Status: done`, outside the documented vocabulary.**
`docs/agents/issue-tracker.md:32` fixes the set as `open`/`claimed`/`resolved`;
the corpus in practice is 36 `closed`, 10 `resolved`, 12 `open`, and this one
`done`. `check_merge_ready.py:107,126` test `not in ("open","claimed")`, so
`done` reads as closed — it passed, but by accident. Confirmed by hand: 57 is
absent from `pnpm issues:open`. The risk is not 57 itself (it `Blocks: none`)
but that a typo'd status on a genuinely-open ticket would silently vanish from
the list rather than gate a land. **Fixed** — set to `closed`.

**S2 — `ItemSourceOrigin` is a hand-written union mirroring a Python-owned
list.** `pool.ts:27`, six origin strings produced by `add_source(…)` in
`assemble_universe.py`, sitting beside `ItemSourceKindName` which _is_ generated
from JSON per AGENTS.md § Types from JSON. Nothing fails if one side adds a
value.

The reviewer supported this with a claim of existing drift — that `"sunmote"`
appears in the TS union with no Python emitter. **That is wrong**, and is
recorded here at reduced strength for it: `assemble_universe.py:1105` emits
`"sunmote"`, and the `"unknown"` literal nearby is a `kind`, not an origin. All
six match exactly. The structural point stands; the evidence for urgency does
not. **Wontfix** — no drift exists today, and the generated-types path is
available whenever a seventh origin is added.

**S3 — two comments restated their code.** `report-events-offline.ts`'s
`OfflineRawFixture` doc ("The shape both raw fixture types have in common")
restated the declaration; `real-source.ts`'s `loadUniverseEntries` opened with
_what_ ("Reads `data/universes/<universe>.json` once per call") before the
load-bearing _why_. **Fixed** — first deleted, second trimmed to the why.

**S4 — Data Clump / Long Parameter List (judgement call).**
`buildOfflineRecordings` takes seven positional params, four of which travel
together (`route`, `confidence`, `notFoundMessage`, `killedAt`), plus a
`notFoundMessage` callback whose two call sites barely use its arguments (one
is `() => "slamaltman not found in raw fixture"`) — mild Speculative
Generality. **Deferred to ticket 24**, the existing standards-smells cleanup
ticket.

**Clean:** durable claims are unusually well handled on this branch — ADR-0020,
the verification-log five-box entry, and tickets 57/58/59 all pair causal claims
with re-runnable commands, and hedges are explicit where unmeasured. New
comments in `caps.ts`, `view.ts` and `assemble_universe.py` are _why_, several
pointing at a ticket or ADR.

### Spec

**P1 — ticket 33 closed with its third criterion unmet.** _"A test pins the
fixture character near 119 rather than 72."_ The ~119 figure was reproduced by
a one-off `npx tsx` run recorded in the ticket, not pinned by a test; the test
that landed (`caps.test.ts:178`) uses a synthetic single-item set and asserts
additivity, saying so in its own comment. `grep "119\|talentsString\|capState"
packages/core/test/rank.test.ts` returns nothing. A regression in
`talentsStringFromRequest` would not be caught. **Fixed** — correction recorded
on the ticket; the end-to-end pin folds into ticket 60, which touches this path
anyway.

**P2 — ticket 44 was investigated but its file was never touched.**
`git diff phase-2/trust...HEAD -- .scratch/carry-forward/issues/44-*.md` is
empty, yet the branch carries a merge commit, a 162-line plan, three
measurement scripts and an SME handoff. The tracker's own rule is that tickets
are the source of truth, "not the review prose, not chat" — and the conclusion
here is substantial: the ticket's stated cause is **false**. Across 2114 rows,
zero put a `rep`/`badge`/`unknown` row ahead of a `raid` row; the only
multi-kind pair is `raid`+`token`, already ordered correctly in all 61 cases.
What survives is 7 within-`raid` zone ties. **Fixed** — `Progress:` line plus a
`## Measured` section recording the disproof, the re-runnable command, and a
rescoped "Done when".

**P3 — ticket 55's second criterion silently dropped.** _"`rankLabel` is
constrained, or singleton labels are surfaced by a gate."_ The gate was built
then deleted (sound reasoning: it measured page vocabulary, not defects), and
the work moved to open ticket 56 — but the status read `closed — measured,
premise false`, which claims more than happened. Confirmed the underlying data
loss is real: all 411 `ret-p4.json` entries carry `rankLabel: null`. **Fixed** —
status now names the surviving criterion and where it went.

**P4 — ticket 40 lost its `Blocked by:` line.** `pnpm issues:open` printed
`(unset)` for 40 alone among 12 open tickets.
`docs/agents/issue-tracker.md:38-41` requires the field, and 40 is exactly its
stated use case — "a **component that does not exist yet**". **Fixed** — set to
the component 40's own Progress text names.

**Verified sound.** PLAN.md's Phase 2 gate edit is correct: seven boxes ticked,
one (`≥3 real characters produce believable shortlists`) left unticked,
matching `docs/verification-log.md`, which records that box as PARTIAL and the
gate as "7 of 8 recorded". No box was ticked without a write-up. Data claims
were checked independently rather than trusted: spliced `" - "` boss fields = 0,
30129 Serpentshrine rows = 0, profession values across all six universes are
exactly the 5 real professions, 30993 resolves to `The Illidari Council` in all
three ret universes. Tickets 36, 37, 38, 42, 48, 49, 51, 52, 53, 54 meet their
criteria. Scope creep was minor and declared in DELEGATION-STATE.

## Summary

Twelve findings across four axes. Two are blocking and both are the same
species — a confidently wrong number with no error, PLAN.md's stated worst
case — and neither is introduced by this branch so much as _left standing_ by
it: `matchesRequestedSpec` guards nothing (A1), and the hit cap credits every
ret character with the preset's Precision while the banner that used to hedge
that was removed (A2). Both are deferred to tickets rather than fixed here,
because both cross the compose stage and A1's parent (ticket 40) is
deliberately open.

The domain axis came back clean, which is the notable result: the T6 token
mapping the branch claims to have "verified per piece" reproduces byte-exact
from committed sources, and the caps arithmetic recomputes to the digit.

Six findings were fixed in this review pass — all documentation, status, or
comment corrections, no behaviour change. `pnpm verify` green after them: exit
0, 32 files, 425 passed / 2 todo, on Node 22.16 (DELEGATION-STATE records that
verify fails on Node 20 for `node:sqlite`).

One reviewer claim was checked and rejected rather than recorded (S2's
`sunmote` drift); it is written up at the strength the evidence supports.

## Disposition

| ID  | Axis        | Disposition | Ticket / note                                                                                                                                 |
| --- | ----------- | ----------- | --------------------------------------------------------------------------------------------------------------------------------------------- |
| A1  | Adversarial | defer       | `.scratch/carry-forward/issues/61-matchesrequestedspec-has-no-production-caller.md`                                                           |
| A2  | Adversarial | defer       | `.scratch/carry-forward/issues/60-cap-folds-preset-talents-onto-the-player.md`                                                                |
| A3  | Adversarial | fixed       | `caps.ts` comment now derives segment alignment from the 5/11/45 sums instead of calling segment 0 a version marker                           |
| A4  | Adversarial | defer       | `.scratch/carry-forward/issues/62-two-tests-pass-by-construction.md`                                                                          |
| A5  | Adversarial | defer       | `.scratch/carry-forward/issues/62-two-tests-pass-by-construction.md`                                                                          |
| D1  | Domain      | wontfix     | T6 pairing's live-page witness is uncommitted; `feral-tokens.json` already declares the gap per durable-claims, and ticket 56 owns the scrape |
| S1  | Standards   | fixed       | Ticket 57 `Status: done` → `closed`; confirmed it was absent from `pnpm issues:open`                                                          |
| S2  | Standards   | wontfix     | `ItemSourceOrigin` mirrors a Python list, but the claimed `sunmote` drift does not exist — all six origins match `add_source`                 |
| S3  | Standards   | fixed       | Deleted the restating `OfflineRawFixture` doc; trimmed `loadUniverseEntries` to its why                                                       |
| S4  | Standards   | defer       | `.scratch/carry-forward/issues/24-standards-smells-cleanup.md`                                                                                |
| P1  | Spec        | fixed       | Correction recorded on ticket 33; the end-to-end pin folds into ticket 60                                                                     |
| P2  | Spec        | fixed       | Ticket 44 given a `Progress:` line and a `## Measured 2026-08-06` section with the disproof and re-runnable command                           |
| P3  | Spec        | fixed       | Ticket 55 status now names the surviving criterion and points at ticket 56                                                                    |
| P4  | Spec        | fixed       | Ticket 40 `Blocked by:` restored                                                                                                              |

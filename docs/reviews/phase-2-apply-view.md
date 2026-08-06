# Pre-merge review — phase-2/apply-view

Diffed against: `phase-2/trust...phase-2/apply-view` (f99c486 → 81cbb7e)

**Merge base is `phase-2/trust`, not `dev`.** Phase 2 subplans review against
the integration branch and merge back into it; nothing reaches `dev` until the
§14 gate closes (`.scratch/phase-2/spec.md`, "Branch topology").

**Dispatch.** Four reviewers, each on fresh context with the diff and its own
brief only. `codex exec` is not on `PATH` in this environment, so option 2 of
the skill's ladder was used: fresh subagents on the sharp lane (Opus, effort
`medium`, per `docs/agents/model-policy.md`). No wall, no downgrade. The
Standards+Spec axis ran through the `code-review` skill unchanged, which is why
it appears below as two sections rather than one.

Two axes converged independently on the same defect (A1 ≡ S4). That is the
strongest signal in this review and it was a real bug, reproduced before fixing.

---

## Adversarial

**A1 — `assignTieGroups` tied a pinned downgrade with the upgrades behind it.**
Tie grouping ran _after_ `compareRows` reordered by pin bucket, but the walk
assumes delta-descending order. Under `pinBis: true` a pinned BiS row with a
negative delta sits at index 0, becomes the group **leader**, and every
following row satisfies the overlap test. Reproduced:

```
items: [-8 BiS se 1], [+40 se 1], [+39 se 1]  with { pinBis: true }
→ [1,-8,'tie-1'], [2,40,'tie-1'], [3,39,'tie-1']
```

A −8 DPS downgrade displayed as tied with a +40 upgrade — a confidently wrong
ordering claim with no error, reachable from the shipped CLI via `--pin-bis`.
No test covered `pinBis` + tie groups together.

**A2 — one wide-SE row bridged rows that do not overlap each other.** The
docstring claimed groups stay "bounded at 2×SE", but the test
`row.deltaDps + row.se >= leader.deltaDps - leader.se` lets the group's width be
set by its widest _member_. Reproduced:

```
[100 se 0.01], [50 se 60], [49 se 0.01] → tie-1, tie-1, undefined
```

100 and 50 marked tied; 50 and 49 — genuinely indistinguishable — split.

**A3 — `belowCutoffInView` can never differ from `belowCutoff`.** It is
recomputed from `deltaDps`, `deltaPct` and `r.cutoff`, all identical to what
`rank.ts` used; filtering changes which rows are present, never a row's numbers.
The field's comment asserted behaviour the code does not implement.

**A4 — `{ ...item }` is a shallow copy**, so `rows[i].bisTags` and `.sources`
share identity with the caller's `Ranking`. Nothing writes to them today, but
the no-mutation test only checked top-level key absence.

**A5 — the sim-count half of the gate box is structurally unfailable.**
`applyView` is pure, sync, and never receives `deps` or the `SimRunner`, so
`sim.runs` is unreachable from it by construction.

## Domain

**D1 — wrong boss on the tier token, in the one test meant to prove the token
hop.** The fixture paired `Gloves of the Fallen Champion` with
`Prince Malchezaar`. `data/universes/ret-p2.json` records `"boss": "The Curator"`
(Malchezaar drops the _Helm_ token). The two-hop boss filter — the §15
risk-table case the whole test exists to guard — was therefore never exercised
against a real token→boss row. It passed only because the fixture was
self-consistent.

**D2 — two more invented source rows.** 29381 Choker of Vile Intent was written
as `Tempest Keep / Void Reaver`; it is `{"kind":"badge","cost":25}` — a Badge of
Justice neck that can never carry a zone. 28530 Brooch of Unquenchable Fury was
written as `Tempest Keep / Al'ar`; it is `Karazhan / Moroes`.

**Where D1/D2 actually come from — the curated data was never at fault.**
`data/two-hop/ret-tokens.json` is precisely the setup this needs: 18 entries
with `pieceId`/`tokenId`/`tokenName`/`zone`/`boss`, parsed from AtlasLoot token
drop IDs, cross-checked against Wowhead item pages, carrying an
`assertTokenIdDiffers` guard and a recorded correction for a Wowhead mislabel.
`assemble_universe.py` merges it into the universes, and re-checking all 15 tier
pieces in `ret-p3.json` against the map found **zero** disagreements on zone,
boss or token name. Malchezaar is even a genuine Karazhan token boss — he drops
the _helm_ token (29073), not the gloves — so the fixture was a right-raid,
real-boss, wrong-slot pairing.

The bug was that the **test bypassed that pipeline** and hand-wrote its sources.
Two real gaps behind it, filed as ticket 37: the tier-piece hardening test
asserted `zone` but never `boss` or `token` (so the same scrambling would pass
in the _real_ universe too), and 45 hand-written `ItemSource` literals across
the suite are each free to invent a triple with nothing cross-checking them.
The `boss`/`token` half of that is fixed on this branch.

**D3 (unverified, not wrong) — the SE ≈ 2.18 figure had no recorded
provenance.** `docs/verification-log.md` records **1.678 DPS** at 5,000
iterations; 2.18 was read off a 3,000-iteration run and appears in no log entry.
Per AGENTS.md § Durable claims a causal claim needs a re-runnable command.

**Verified correct and left alone:** zone strings match the canonical set;
"ret's curated sets stop at P2" matches PLAN.md §530 and `data/presets/ret/`;
"17 entries in fixed slot order" is supported by verification-log R17; 30129
Crystalforge Breastplate is genuinely multi-zone at P3. Nothing in the diff
touches `permanentEnchant`, race inference, `specID`, meta activation, the 19→17
mapping, or `CURRENT_PHASE`.

## Standards

**Comment policy (hard, repeated).** AGENTS.md: "Comments explain **why**, never
**what**." Several blocks were pure restatement — the `sortKey = …`
transcription above `compareRows`, `tagRichness`'s four lines of prose over
`return item.bisTags.length`, `ViewResult.groups`, `ViewOptions.pinBis`, and the
`// Filter first, then the cutoff` line duplicating rationale already on
`belowCutoffInView`.

**Durable claims (judgement).** The SE figure — same as D3, found independently.

**Middle Man.** `tagRichness` delegating to one property access, used twice in
one expression.

**Duplicated Code / Divergent Change (and a real bug).** `cli.ts` carried both
`args.raid` and `args.view.raid` from one flag. The tell: the report path
reconstructed a filtered ranking from `view.rows` while its `meta.raid` named
only the raid filter — so `--boss` or `--hide-owned` silently shaped a report
that misdescribed itself.

**Testing section: no violation.** `applyView` is named in AGENTS.md as a
permitted direct pure-function target, and `view-gate.test.ts` sits at the
`rankUpgrades` interface through recorded adapters. Nothing asserts on stage
internals.

## Spec

**S4 — tie groups assigned over a pin-reordered list.** Independently the same
defect as A1, with the same recommended fix (assign on delta order, before
pinning).

**S1 — `groupBy: 'raid'` ships arbitrary, not merely limited.** Bucketing
depends on JSON array order. Filed and measured as ticket 35; a partial, not a
done.

**S2 — the below-cutoff "expand" is data-only.** §10 wants rows "hidden behind
an expand"; `belowCutoffInView` is computed and the CLI prints `(below cutoff)`
inline. Defensible with no UI in existence, but a partial-by-disclosure.

**S3 — `pinBisAvailable` is keyed on the wrong thing.** §4.1 says disable where
no set data exists for **(spec, maxPhase)**; the flag is
`r.items.some(i => i.bisTags.includes("BiS"))`, a property of the pool as
ranked. A ranking filtered to a pool where no BiS member survived reports
`false` for the right answer by the wrong route.

**Scope creep — three accepted, one noted.** `ViewResult` vs §4.1's literal
`RankedItem[]` is required by §4.1's own disabled-toggle demand and ticket 03's
"expose enough from the ranking for a caller to know the control has no data" —
an array cannot carry it. The `meetsCutoff` move and the four CLI flags serve
§14's stated reason for landing the view layer here. `filterByZone` remains on
the public surface with its own tests, so the duplicate is reduced, not removed.

**Both gate boxes genuinely closed** at the altitudes ticket 30 named, with a
premise guard and a negative control on the token box.

---

## Summary

Nine findings, seven fixed. The one that mattered was found twice
independently: tie grouping over the pinned order displayed a −8 DPS downgrade
as tied with a +40 upgrade, reachable from the shipped CLI. The three fixture
errors are the more uncomfortable finding — a test written to prove the tier
token two-hop was proving it against a boss/token pairing that does not exist in
the data that ships. Both classes of bug were invisible to a green `pnpm verify`.

The follow-up mattered more than the finding. The curated token data is fine —
`data/two-hop/ret-tokens.json` is well sourced and the universes agree with it
on every field — so this was not a missing-data-layer problem. It was a test
bypassing a good pipeline, sitting on top of a hardening test that checked
`zone` but not `boss`. That second gap is now closed and mutation-checked;
the fixture-hygiene half is ticket 37.

Note the interaction with open ticket 34 (`pnpm verify` never typechecks tests):
these fixtures are typed `PoolEntry`, so the invented _values_ were always going
to need a data check rather than a type check. Ticket 34 would not have caught
D1–D2; reading the universe JSON did.

`pnpm verify` green at 81cbb7e: 291 tests, 27 files.

## Disposition

| ID                     | Axis               | Disposition | Ticket / note                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           |
| ---------------------- | ------------------ | ----------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| A1 / S4                | Adversarial + Spec | fixed       | Tie groups assigned on a delta-sorted copy, so grouping cannot depend on display order. Two regression tests, both fail against the pre-fix code                                                                                                                                                                                                                                                                                                                                                                                                                        |
| A2                     | Adversarial        | fixed       | Overlap measured on `Math.min(row.se, leader.se)`, so a wide-SE row cannot bridge a gap its partner's interval never spans. Regression test                                                                                                                                                                                                                                                                                                                                                                                                                             |
| D1                     | Domain             | fixed       | `boss: "The Curator"`, copied from `ret-p2.json`, with the re-check command in the fixture                                                                                                                                                                                                                                                                                                                                                                                                                                                                              |
| D2                     | Domain             | fixed       | 29381 (badge, no zone) replaced with 30129 Crystalforge Breastplate — a second token piece in another zone, so the filter must discriminate. 28530 corrected to `Karazhan / Moroes`                                                                                                                                                                                                                                                                                                                                                                                     |
| D1/D2 root cause       | Domain             | fixed       | The tier-piece hardening test (`pool-hardening.test.ts`) asserted only `zone`, so a scrambled `boss` would have passed in the real universe too. It now asserts `boss` and `token` against `data/two-hop/ret-tokens.json` for all 15 pieces; mutation-checked by setting 29072's boss to `Prince Malchezaar` and watching it fail                                                                                                                                                                                                                                       |
| D1/D2 remainder        | Domain             | defer       | `.scratch/carry-forward/issues/37-token-boss-unguarded-and-fixtures-bypass-the-map.md` — 45 hand-written `ItemSource` literals across the test suite, none cross-checked against the committed universe. Correctly _typed_, so ticket 34 would not catch them either                                                                                                                                                                                                                                                                                                    |
| D3                     | Domain + Standards | fixed       | Comment now gives the `pnpm rank …` command and states the 1.678 @ 5,000-iteration log figure alongside the 3,000-iteration observation                                                                                                                                                                                                                                                                                                                                                                                                                                 |
| Standards (comments)   | Standards          | fixed       | Restating comments deleted; `tagRichness` inlined                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       |
| Standards (CLI report) | Standards          | fixed       | `RankReportMeta.view` carries the whole `ViewOptions`, so a report cannot claim only `--raid` while `--boss` cut rows                                                                                                                                                                                                                                                                                                                                                                                                                                                   |
| A4                     | Adversarial        | fixed       | No-mutation test compares against `structuredClone`, catching nested writes                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             |
| A3                     | Adversarial        | defer       | `.scratch/carry-forward/issues/36-relative-cutoff-within-a-filtered-view.md`. Confirmed: `CUTOFF` is a constant pair (§10) and `meetsCutoff` reads only it plus the row's own delta, so recomputing after filtering is a no-op. The ordering §12 asks for is still real (filtering never deletes a row); the open question is whether §12 wanted the _threshold_ derived from the filtered set, which would make one item read as an upgrade in one filter and noise in another — against §2's "no view changes a number". Comment rewritten to state the no-op plainly |
| S1                     | Spec               | defer       | `.scratch/carry-forward/issues/35-groupby-raid-picks-an-arbitrary-zone.md` — measured 0 multi-zone entries at P2, 5 at P3+                                                                                                                                                                                                                                                                                                                                                                                                                                              |
| A5                     | Adversarial        | wontfix     | Upheld. `expect(sim.runs).toBe(runsAfterRank)` cannot fail today: `applyView(ranking, view)` takes two plain objects and holds no reference to a `SimRunner`, so nothing in the loop could move that counter. What closes the gate box is the `contentHash` assertion beside it — that one can fail, because `applyView` does touch the `Ranking` — plus the signature. The run-count line stays as a tripwire on a future `applyView(r, v, deps)`, which is worth two lines but is not itself the guarantee. Calling it "half the gate box" earlier was overstated     |
| S2                     | Spec               | wontfix     | The expand is a UI affordance and there is no UI until Phase 3 (`.scratch/phase-2/spec.md` excludes the web shell). The data it needs is present and flagged; nothing is deleted                                                                                                                                                                                                                                                                                                                                                                                        |
| S3                     | Spec               | wontfix     | Reaches the right answer for ret P2, where the pool is unfiltered at rank time. Keying on (spec, maxPhase) needs a curated-set registry that does not exist yet; the Phase 3 gate box is answerable today. Revisit when feral adds a second spec (ticket 05)                                                                                                                                                                                                                                                                                                            |

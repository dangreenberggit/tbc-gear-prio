# Pre-merge review — feat/tickets-369-370

Reviewed range: `624eb3c7302f8b72dfe9aae5a580c6e16cce520e..3398f7d51c9cd51b36f8dbae162bf4636fa8c9e9`

Four axes, each a fresh Opus subagent with no memory of writing the code.
`codex` is not on `PATH`, so option 1 of the skill's dispatch order did not
apply; all four ran as option 2 (review lane, Opus). The adversarial and domain
axes used the briefs in `.agents/reviews/`; Standards and Spec came from the
`code-review` skill.

The branch closes two tickets: **370** (a regression test guarding the
clear-before-swap ordering in `candidateSwapWithRepairs`) and **369** (a ledger
of the upstream files the fork diverges on, plus reverting a dead `iterations`
parameter in the fork's `ui/core/sim.ts`).

## Adversarial

**A1 — the guard is narrower than its comment claims.** `swapItemAt` takes the
equipment array as a _parameter_ and computes `fillOptsForSwap` from whatever it
is handed. So there are two ways to break the same behaviour: reverse the two
statements (T5 catches it), or leave the order alone and pass `equipment`
instead of `cleared` (T5 stays green — the removed off-hand's unique gem reaches
`usedUnique` either way). The comment's "reversing these two statements fails
only that test" is true but is not "this ordering is guarded". Filed as ticket 371.

**A2 — the T5 red was unverified by that axis, and it said so.** Its read-only
brief forbade mutating the tree, and its attempt to route around that with a
vitest alias produced a **false green**: a `throw` planted in the mutant did not
fire and the suite still reported 6/6. It reported this as unverified rather
than as a pass. Closed by the orchestrator running the mutation directly — see
Summary.

**A3 — fixture and synthetic weights judged sound.** 34831 is colour 3, unique,
stamina-only; 24033 is colour 3 and _not_ unique, so `.not.toBe(24033)` is not
vacuous. `candidate-gems.ts`'s `if (gem.unique && usedUnique.has(gem.id))` is
the line that would divert the pick.

**A4 — pin bump self-consistent.** Clone HEAD `bbad1b8a4` matches the lock file
and `ls-remote`. The remaining `f90b12a7b` occurrences are deliberate historical
references plus frozen stage-gate logs.

**A5 — every checkable claim in the divergence note holds.** `sim.ts` diff
against upstream empty; seven `makeRaidSimRequest` call sites each passing one
argument; `sim_header.tsx:67`'s non-null `querySelector` as described.

## Domain

Scope confirmed up front: no ranking logic, no EP weights, no sim output
change. Findings are about claim accuracy.

**D1 — the T5 comment misnames the socket it watches.** Twinblade's
`sockets: [2, 4, 3]` against `GemColor` (Red=2, Blue=3, Yellow=4) makes array
index **2** blue; the comment said index 0. The assertion passes anyway, but not
for the stated reason: under stamina-only weights the solver's colour-_free_
fill (score 39) beats its colour-_matched_ fill (score 27), so colour matching
is not in play and 34831 lands at index 0 regardless.

**D2 — "the only unique colour-3 gem" is exact; "the only unique gem that can
fill a blue socket" is not.** `gemColorMatchesSocket` admits green, purple and
prismatic, so 35 unique phase-≤2 gems can occupy a blue socket. None competes on
stamina (34831 has 15, next-best 6), so the test is unharmed — but the
uniqueness reasoning is narrower than the matching rule it rests on.

**D3 — the EP-preset claim is slightly overstated.** 19 of 20 committed presets
omit stat 2 entirely; `rogue/fallback` carries `"2": 0.01`. Substance survives
(34831 would rank 14th of 42 under real rogue weights, so the bug would still be
invisible), but "every real preset" is literally false.

**Clean:** the two-hander/off-hand rule (correct for TBC; titan's grip is
WotLK), and `verification-log.md` Q1 records that the engine does _not_ enforce
it — which is why our composer must. The hunter `item_sets.go` claim verified
end to end: `applyItemEffects` dispatches on item id with no class check, item
30892 is mail with hunter pet effects, and `data/equip-eligibility.json`
independently lists all three paladin specs as able to equip it. The
"no sim output change" framing is drawn honestly in both the note and the
ticket.

## Standards + Spec

**S1 (hard) — the divergence note contradicted the tip.** It said the revert was
"not yet pushed and not yet the lock file's pin" and that re-running the command
against the pinned sha "will still see `sim.ts` listed until the pin moves".
Commit `3398f7d` had already moved the pin onto `bbad1b8a4`, so the note
instructed readers to expect the opposite of what they would get. Breaches
AGENTS.md § Durable claims.

**S2 — the `rank.ts` comment is partly provenance, not why.** The pointer to T5
is arguably load-bearing; the "leaving T1-T4 green — proof that…" clause is a
record of the red observation that already lives in ticket 370.

**S3 — `.not.toBe(NEXT_BEST_BLUE_GEM)` is redundant** given the preceding
`toBe(UNIQUE_BLUE_GEM)`.

**S4 — the "same line-change counts" sentence is wrong.** Verified at both shas:
`translation.json` +91→+92 and `schemas/translation.schema.json` +306→+310. Two
additive files _did_ move, so "nothing upstream moved" is overstated as written.

**S5 — `pnpm verify` green is not reliably reproducible.** Ticket 370 checks the
box, and the run it was checked against did pass; a later run failed on
`bulk-boundary.test.ts` and `bulk-screen-driver.test.ts`, both
`Test timed out in 30000ms`.

**Spec findings, all resolved in the branch's favour:** the fifteen-vs-thirteen
reconciliation is sound (both shas return fifteen; nothing was quietly dropped);
the `sim.ts` revert living in the gitignored clone is acceptable delivery
because the lock `_comment` names the commit, the file and the `+2 -18` shape
and `pushed: true` carries a recorded `ls-remote`; the 370 deviation from the
recommended test site is defensible because the ticket's step 1 offered both;
the fork-port why-not is genuine (zero vitest/jest hits, zero `*.test.ts` files
in the whole checkout); and `sim-implemented-effects.json` plus the lock
`_comment` are required delivery of 369's item 3, not scope creep.

**S6 — one reviewer claim rejected.** The Standards axis argued `rank.ts` is
ported, so a comment-only edit forces the PROVENANCE/re-pin cycle. Inverted: the
hash rows live in the fork's `upgrades/engine/PROVENANCE.md` keyed to the _fork_
copy, while the edit was to `packages/core/src/rank.ts` on the source side. No
PROVENANCE file appears in the diff and `engine-port-drift:check` passed green
at this tip. Recorded as `wontfix` with that correction rather than as written.

## Summary

No blocking defect. The shipped behaviour is correct on both tickets: the
clear-before-swap ordering is right on `dev` and stays right, and the divergence
ledger's factual claims all survived independent re-checking by two axes.

Every finding was either a **documentation defect** (S1, S4, D1, D3) or a **gap
in a guard rather than a bug** (A1). Four were fixed on the branch; two are
deferred as tickets; one was rejected as inverted.

The adversarial axis's inability to verify the T5 red was closed directly: the
orchestrator mutated `packages/core/src/rank.ts` (swap before clear, uncleared
array passed), ran the file, and observed

```
× T5 — the removed off hand's unique gem is free for the candidate's own socket
  → expected 24033 to be 34831
  Tests  4 failed | 2 passed (6)
```

then restored from backup (`git status` clean of it afterwards). That mutation
is broader than ticket 370's, which reversed statement order only and turned
**T5 alone** red — the discrimination the ticket demanded. Both observations
stand; neither is variant 2 of ticket 371, which nothing has yet run.

## Disposition

| ID  | Axis        | Disposition      | Ticket / note                                                                                                 |
| --- | ----------- | ---------------- | ------------------------------------------------------------------------------------------------------------- |
| A1  | Adversarial | defer            | `.scratch/carry-forward/issues/371-t5-pins-statement-order-not-the-cleared-argument.md`                       |
| A2  | Adversarial | fixed            | Mutation run directly by the orchestrator; red observed and recorded above                                    |
| A3  | Adversarial | no change needed | Fixture and synthetic weights judged sound                                                                    |
| A4  | Adversarial | no change needed | Pin bump self-consistent                                                                                      |
| A5  | Adversarial | no change needed | Divergence-note claims re-verified                                                                            |
| D1  | Domain      | fixed            | Socket comment corrected: index 2 is blue; free fill outscores matched fill, which is why index 0 reads 34831 |
| D2  | Domain      | wontfix          | Test is unharmed — no blue-capable unique competes on stamina. Narrowness noted here rather than reworded     |
| D3  | Domain      | fixed            | Comment now says 19 of 20 presets omit stamina and `rogue/fallback` weights it 0.01                           |
| S1  | Standards   | fixed            | "How this was produced" rewritten to state the current pin and keep the `f90b12a7b` substitution              |
| S2  | Standards   | wontfix          | The T5 pointer is load-bearing for a future editor; ticket 371 will revisit the comment's claim               |
| S3  | Standards   | wontfix          | Kept: it names the intended failure mode and gives `NEXT_BEST_BLUE_GEM` its purpose                           |
| S4  | Spec        | fixed            | Sentence now names both moved files and confines the claim to upstream-authored ones                          |
| S5  | Spec        | defer            | `.scratch/carry-forward/issues/372-bulk-wasm-tests-time-out-under-full-suite-load.md`                         |
| S6  | Standards   | wontfix          | Reviewer claim inverted — source side, not ported side; drift gate green                                      |

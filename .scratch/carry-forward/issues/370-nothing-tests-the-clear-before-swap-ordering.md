Status: closed
Closed: <pending commit>
Type: task
Origin: docs/reviews/feat-two-hander-clears-offhand.md (adversarial axis)
Blocks: none
Blocked by: none

# Nothing tests that the off-hand clear runs before `swapItemAt`

## The gap

`candidateSwapWithRepairs` in `packages/core/src/rank.ts` must call
`clearOffHandForTwoHander` **before** `swapItemAt`, and pass the cleared array
into the swap. That ordering was made an explicit acceptance criterion when
ticket 350 was planned, because `swapItemAt` computes its gem-fill options from
whatever array it receives.

**No test enforces it.** Measured: reversing the two statements in a throwaway
copy — `swapItemAt` on the original array, the clear afterwards — leaves all
five tests in `packages/core/test/two-hander-clears-offhand.test.ts` green.

```
$ npx vitest run packages/core/test/two-hander-clears-offhand.test.ts
  Test Files  1 passed (1)
       Tests  5 passed (5)      # with the ordering REVERSED
```

Found by the adversarial axis of the `feat/two-hander-clears-offhand` review and
reproduced independently before filing.

## Why the ordering matters

`fillOptsForSwap` (same file, grep for it) sweeps every slot except the swap
target and collects their gems:

```
for (const id of equipment[i]?.gems ?? []) {
  otherGemIds.push(id);
  if (getGem(id)?.unique) usedUnique.add(id);
}
```

`candidate-gems.ts` then skips any gem already in `usedUnique` (grep
`gem.unique && usedUnique.has`). So if the clear ran *after* the swap, a unique
gem socketed in the off-hand item being removed would still be counted as worn,
and would still block the candidate two-hander's own socket. The result is a
plausible but wrong gem set, and therefore a wrong DPS — with no error and no
failing test.

Only a grep quoted in a commit message currently guards this. A grep is not a
regression test.

## Why it was not fixed inline

Expressing the property needs a worn off-hand that carries a unique gem the
candidate two-hander also wants. The committed fixtures cannot do it:

- `vendor/wowsims/warrior_p2_fury.gear.json` wears Talon of Azshara (30082) in
  the off hand, which has `sockets: []` — no gem to sweep.
- Only **one** socketed off-hand-capable item exists in `warrior-p2`: Aldori
  Legacy Defender (28825, `handType` 3, sockets `[3]`).
- Only **one** unique gem in the whole phase ≤ 2 palette has colour 3: id
  34831.

So the test would need a hand-built equipment array no recorded character
wears, arranged specifically to make the gem solver observable. That is a
different test from the ones this file holds — its header says it drives the
`rankUpgrades` seam — and designing it honestly (which off-hand, which gem,
whether colour 3 satisfies the solver's matching rules for one of Twinblade's
`[2, 4, 3]` sockets) is its own piece of work.

## What to do

1. Decide where this belongs: a direct unit test of `candidateSwapWithRepairs`
   asserting the candidate's gems, or a `fillOptsForSwap`-level test asserting
   `usedUnique` excludes the removed slot's gems. The second is closer to the
   mechanism and needs no item fixture at all.
2. Whichever is chosen, the test must fail when the two statements are
   reversed. Prove that by reversing them and watching it go red, not by
   reasoning.
3. Port the same test to the fork copy's engine if it is expressible there, or
   record why not.

## Acceptance

- [x] A test exists that fails when `clearOffHandForTwoHander` runs after
      `swapItemAt` instead of before.
- [x] The red was observed, with the command and output recorded.
- [x] `pnpm verify` green.

## Resolution

Added T5 to `packages/core/test/two-hander-clears-offhand.test.ts`: a direct
unit test of the exported `candidateSwapWithRepairs`, following T2's own
pattern, rather than exporting `fillOptsForSwap` for test purposes — the
existing file already has a precedent (T2) for calling the composition
function directly with a hand-built equipment array, and `usedUnique`'s
effect is observable through the gems `candidateSwapWithRepairs` returns
without touching a second private function.

Hand-built equipment: off hand wears Aldori Legacy Defender (28825, the one
socketed off-hand-capable item in warrior-p2, colour-3 socket) socketed with
the phase <= 2 palette's only unique colour-3 gem (34831, stats: +15 stamina
only). The candidate two-hander is Twinblade of the Phoenix (29993, sockets
`[red, yellow, blue]` — array index 0 is the blue socket). EP weights are a
synthetic single-stat set (`{"2": 1}`, stamina only): every real preset in
this repo leaves stamina unweighted, which would score 34831 at EP 0 and make
the ordering bug invisible (measured directly — see below).

Red observed by reversing the two statements in `candidateSwapWithRepairs`
(swap first on the original array, clear after) and running:

```
$ npx vitest run packages/core/test/two-hander-clears-offhand.test.ts
 × T5 — the removed off hand's unique gem is free for the candidate's own socket (ticket 370)
   → expected 24033 to be 34831
 ✓ T1, T2, T3a, T3b, T4
Test Files  1 failed (1)
     Tests  1 failed | 5 passed (6)
```

Only T5 failed — T1-T4 stayed green under the reversed ordering, confirming
T5 is what closes the gap the ticket described (the other five do not).
Ordering restored; the same command then passed 6/6.

Fork copy (`vendor/tbc-new-fork/ui/core/components/individual_sim_ui/upgrades/engine/rank.ts`):
`candidateSwapWithRepairs` there is byte-identical to this file's version
(`scripts/check_engine_port_drift.py`, part of `pnpm verify`, confirms this on
every run) — same ordering, same comment. Not portable: the fork checkout
carries no test runner at all. `vendor/tbc-new-fork/package.json` has no
`vitest`/`jest` dependency and no test script, and
`find vendor/tbc-new-fork -iname "*.test.ts"` returns zero files anywhere in
the checkout, not just under `upgrades/`. There is no test file to add this
one to and no runner that would execute it. The drift gate is what stands in
for a fork-side test today (PROVENANCE.md's own words: "A hash match proves
the file's bytes have not changed since this table was written — nothing
about behaviour"), which is a real gap but a pre-existing, repo-wide one, not
specific to this ticket.

## What is NOT claimed

Nothing here says the shipped behaviour is wrong. The ordering is **correct on
`dev`** — verified by grep in both engine copies, and the five existing tests
pass against the correct ordering. This ticket is about the absence of a guard,
not the presence of a defect.

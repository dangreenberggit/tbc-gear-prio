Status: open
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

- [ ] A test exists that fails when `clearOffHandForTwoHander` runs after
      `swapItemAt` instead of before.
- [ ] The red was observed, with the command and output recorded.
- [ ] `pnpm verify` green.

## What is NOT claimed

Nothing here says the shipped behaviour is wrong. The ordering is **correct on
`dev`** — verified by grep in both engine copies, and the five existing tests
pass against the correct ordering. This ticket is about the absence of a guard,
not the presence of a defect.

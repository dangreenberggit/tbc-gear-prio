Status: open
Type: defect (misleading comment; the code is currently correct by luck)
Origin: stage-gate plan review of ticket 212 slice 3 (finding F5), 2026-08-17
Blocks: none
Blocked by: none

# E-W3's package-assembly comment states the opposite of what runtime does

`packages/core/test/wowsims-fork-parity.test.ts` assembles the 2pc package
fixture shoulder-first, then head, and justifies that order with:

> swap the shoulder first so the head swap below shares its gem-repair
> starting point with what `selectPackage`/`buildSetBonuses` actually
> assembles at runtime.

Runtime does the opposite. `selectPackage` sorts the added pieces by
**ascending `slotIndex`** (`packages/core/src/set-value.ts:216-222`,
`.sort((a, b) => a.slotIndex - b.slotIndex)`), and `SIM_ORDER` puts head at
index 0 and shoulder at index 2. So `buildSetBonuses` applies head first,
shoulder second — the reverse of the fixture, and the reverse of what the
comment asserts.

Reproduce:

```bash
grep -n "sort((a, b) => a.slotIndex - b.slotIndex)" packages/core/src/set-value.ts
node -e "const {SIM_ORDER}=require('./packages/core/dist/slots.js'); console.log('head',SIM_ORDER.indexOf('head'),'shoulder',SIM_ORDER.indexOf('shoulder'))"
```

## Why this has not caused a failure

The two orders produce byte-identical equipment on this fixture, so E-W3 is
green and has been. Verified 2026-08-17: the suite passes at
`230e1bf` and again after ticket 212 slice 3's edit, with no `setPackage`
database mismatch — and slice 3's stub database is a pure function of
equipment item ids, so a divergence would have surfaced there.

The reason it holds is that gem repair on this fixture is order-insensitive:
neither swap changes the other's repair starting point in a way that alters
the final protos. That is a property of these two items, not a guarantee.

## Why it is still worth fixing

The comment is load-bearing documentation for anyone extending the fixture.
It tells a future reader that the fixture deliberately mirrors runtime order
when it deliberately does not, so a new set candidate whose gem repair *is*
order-sensitive would produce a mismatch that reads as an engine bug rather
than a fixture bug. This was found during a plan review that specifically
asked whether the harness's equipment could differ from what rank composes
internally (stage-gate finding F5), and the answer was "not here, not yet".

Deliberately left unfixed by ticket 212 slice 3: that slice froze the harness
so a fixture change could not be confused with the port it was gating.

## Where this work happens

**This repo only** (`C:/Users/dgree/Code/lulz/tbc-gear-prio`), on the feature
branch in play (`feat/candidate-pool` at the time of writing). The file is
`packages/core/test/wowsims-fork-parity.test.ts` — a parent-repo test, not a
ported engine file, so no fork commit, no PROVENANCE re-hash, and §9.1a does
not apply. E-W3 imports the fork's sources at runtime but nothing in the fork
clone changes.

## Options

1. Reverse the fixture to head-then-shoulder and correct the comment. Lowest
   risk; makes the stated invariant true. Re-run E-W3 to confirm it stays
   green (expected: byte-identical, per the above).
2. Keep the order and rewrite the comment to say the order is arbitrary here
   because repair is order-insensitive for this pair, with the check that
   would catch it if that ever stopped being true.

Option 1 is preferred: the comment's claim — that the fixture mirrors runtime
— is worth making true rather than retracting, since it is what a reader
extending the fixture will rely on.

## Acceptance criteria

- [ ] The fixture's assembly order and its comment agree with
      `set-value.ts`'s ascending-`slotIndex` behaviour.
- [ ] E-W3 green after the change, with the run recorded.
- [ ] If the order is deliberately left reversed (option 2), the comment says
      why and names the condition under which it would break.

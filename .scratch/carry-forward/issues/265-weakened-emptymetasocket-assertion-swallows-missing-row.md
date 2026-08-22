Status: resolved
Type: task (test hardening — not a currently-observed failure)
Origin: docs/reviews/fix-ticket-257-feral-meta-preference.md
Blocks: none
Blocked by: none

# `emptyMetaSocket` assertion weakened to `toBeFalsy()`, and the optional
chain in front of it can hide a dropped row

## Resolved 2026-08-22 in `980a87f`, before merge

Fixed on the branch rather than deferred. `expect(row).toBeDefined()` now
precedes the flag assertion, so a dropped row fails loudly instead of
satisfying `toBeFalsy()` through an undefined optional chain. The comment
above it states why the order matters.

`pnpm verify` green after the fix: 861 passed.


`packages/core/test/rank.test.ts`, in `rankUpgrades per-spec meta
preference` (the test renamed to "seats the feral preferred meta on a feral
run instead of disclosing an empty socket (ticket 257)"), the fix changed:

```ts
expect(row?.emptyMetaSocket).toBe(true);
```

to:

```ts
expect(row?.emptyMetaSocket).toBeFalsy();
```

This is weaker in two compounding ways:

1. `toBeFalsy()` passes on `undefined` as well as `false`. Confirmed by
   reading `rank.ts:1013`: `emptyMetaSocket` is only ever assigned `true`,
   never explicitly `false` — so today it is genuinely `undefined` on this
   row (verified by adding a temporary console probe, run, then deleted; the
   working tree was confirmed clean before and after). The assertion is not
   currently vacuous, but it no longer distinguishes "the flag is
   affirmatively false" from "the flag was never set" — a distinction the
   original `toBe(true)` didn't need to make, but a `toBe(false)` replacement
   would have preserved.
2. `row?.` is an optional chain over `ranking.items.find((i) => i.itemId ===
   29098)`. If a future regression causes this candidate to silently drop out
   of `ranking.items` (a pool-resolution bug, a skip that should have been an
   error, etc.), `row` becomes `undefined`, `row?.emptyMetaSocket` evaluates
   to `undefined`, and `toBeFalsy()` still passes — the test goes green while
   asserting nothing about the actual candidate.

Additionally, no assertion in this test confirms the candidate's meta socket
was actually filled with 32409 — only that the disclosure flag/substitution
text are absent. A regression that left the socket empty *and* failed to set
the flag (a compound bug, admittedly) would not be caught here; it would
only be caught by the separate `equipmentForCandidateSwap feral meta
preference (ticket 257)` test in the same file, which does assert
`head.gems` contains `32409`. Worth confirming that second test's coverage is
enough on its own, or tightening this one.

## Acceptance criteria

- [ ] Add `expect(row).toBeDefined()` (or equivalent) before dereferencing
      `row?.emptyMetaSocket`, so a dropped candidate fails loudly here too.
- [ ] Consider `toBe(false)` instead of `toBeFalsy()` if the codebase's
      convention is that `emptyMetaSocket` is expected to be explicitly
      `false` rather than `undefined` on a normally-priced row — or document
      why `undefined` is an acceptable value here.
- [ ] `pnpm verify` green.

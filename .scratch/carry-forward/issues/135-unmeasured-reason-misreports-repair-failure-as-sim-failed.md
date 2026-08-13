Status: closed
Closed: a6b911c
Type: bug
Origin: round-4 pre-merge review of `feat/set-bonus-value` (spec axis, finding 3)
Blocks: none
Blocked by: none

# Set-bonus package repair failures ride under `unmeasured: "sim-failed"`

When gem repair fails while assembling a completion package, `buildSetBonuses`
(`packages/core/src/rank.ts`) records the threshold as
`unmeasured: "sim-failed"` — but no sim ran. The prose `reason` string is
accurate ("gem repair could not activate its meta"); the machine-readable enum
tag contradicts it. `set-value.ts`'s `UnmeasuredReason` union has no value for
a repair failure, and that file was outside the issue-1 slice's path scope.

## Done when

- [x] `UnmeasuredReason` gains a `"repair-failed"` value
- [x] the push site in `buildSetBonuses` uses it
- [x] a test pins that a repair failure on a package member yields
      `unmeasured: "repair-failed"` (not `"sim-failed"`) with the repair
      message in the reason text
- [x] check any renderer switching on the enum

## CLOSED (2026-08-12, `a6b911c`)

`"repair-failed"` added to `UnmeasuredReason` in `set-value.ts`, used at the
`buildSetBonuses` catch site in `rank.ts`. The genuine package-*sim* failure
~30 lines below keeps `"sim-failed"` — the two are now distinguishable, which
was the point.

**Renderer check.** `UNMEASURED_REASON_TEXT` (`rank-report-rules.ts`) is the
only renderer that switches on the enum, and it is a `Record` over
`NonNullable<SetBonusValue["unmeasured"]>` — so adding the union value broke
`pnpm typecheck` until a reason string was supplied. That is a compile-time
gate rather than a review item; a future value cannot be added without
answering it. Verified by running `npx tsc --build` between the two edits and
seeing TS2741 name the missing key.

**Test.** `packages/core/test/rank.test.ts`, "reports a package gem-repair
failure as repair-failed, not sim-failed". It drives `rankUpgrades` rather
than the push site directly. Getting the failure to land on the *package* took
some care and is worth recording: a candidate that fails repair on its own
never reaches the pool, so the row comes back `insufficient-pieces` and the
code under test never runs. The fixture instead puts the only worn colours on
the shoulder and legs — the two slots the 4pc package replaces — with a
palette holding just the meta gem. Each piece swapped alone leaves
Relentless's 2/2/2 satisfied; assembling all four displaces the gems carrying
it, and repair has nothing left to recolour with.

Verified red before green: the assertion first failed with
`expected 'sim-failed' to be 'repair-failed'`, which is precisely the bug this
ticket describes.

Re-runnable:

```
npx vitest run packages/core/test/rank.test.ts -t "repair-failed"
```

Full suite at the fix commit: 731 passed, 2 todo (`npx vitest run`).

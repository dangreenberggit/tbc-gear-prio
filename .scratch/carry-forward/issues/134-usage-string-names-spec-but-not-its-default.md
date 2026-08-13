Status: open
Type: cleanup (trivial)
Origin: pre-merge review of `feat/set-bonus-value`, round 3, 2026-08-12 (spec axis, 3-S2)
Blocks: none
Blocked by: none

# The usage string names `--spec` and its values but not its default

Ticket 125 asked for: "Usage output names `--spec`, its accepted values, and its
default." Two of the three shipped. `packages/core/src/cli.ts:79` prints
`[--spec ret|feral]`, so the flag and its accepted values are named; the default
(`ret`, set at `cli.ts:114`) is not.

Ticket 125 is `Status: closed` and its closing note says the fix is done, while
both of its acceptance boxes are unticked. Filed separately rather than reopening
125, since the bulk of that ticket did ship.

Fix is one string: `[--spec ret|feral (default ret)]` or similar.

## Acceptance

- [ ] `pnpm rank --region US` (no realm) prints a usage line naming `--spec`, its
      accepted values, and its default.
- [ ] Ticket 125's acceptance boxes are ticked, or its note is corrected to say
      what was left out.

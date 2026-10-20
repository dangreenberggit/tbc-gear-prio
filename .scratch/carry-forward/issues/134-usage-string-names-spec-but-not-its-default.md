Status: wontfix
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

## Comments

### 2026-10-19 — wontfix (ticket housekeeping)

Per the owner's 2026-10-16 scope ruling: there is no standalone web app or Stage 4 deploy, and the work is the fork's Upgrades tab only (`PLAN.md:934`; `.scratch/plans/upgrades-tab-finish-line.md:53-56`): this concerns only this repo's command-line ranking or its HTML report, which the tab does not use. The usage string is in `packages/core/src/cli.ts`.

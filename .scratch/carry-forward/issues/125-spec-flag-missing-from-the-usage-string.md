Status: closed
Type: cleanup (trivial)
Origin: ret catch-up round, 2026-08-11
(`.scratch/set-bonus-value/ret-catchup/01-survey.md` §7)

# `--spec` flag missing from the usage string

`parseArgs` accepts `--spec` (default `ret`, cli.ts:114) but the usage
string at `packages/core/src/cli.ts:79` does not list it. Verify: run
`pnpm rank --help` (or trigger usage with a bad flag) and grep for `--spec`.

One-line fix: add `--spec <ret|feral>` to `usage()` with its default noted.

## Acceptance criteria

- [ ] Usage output names `--spec`, its accepted values, and its default.
- [ ] `pnpm verify` green.

## Closed (2026-08-11, ret catch-up round W6 disposition)

`--spec ret|feral` added to the usage string (cli.ts `usage()`), the one
cheap fix the round had ticketed instead of doing; done at review's nudge.
Verify: `pnpm rank --region US` (no realm) prints the usage line naming
`--spec`.

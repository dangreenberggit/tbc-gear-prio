# Review: fix/locale-keys-fork-gate

Range: `dev` 6f60cd14 to the branch tip, plus fork branch
`fix/upgrades-locale-plurals` (fork `c2a0d88c3` to `d94930daa`). It serves
`.scratch/plans/upgrades-tab-finish-line.md` Chunk 5 (PR readiness). The
orchestrator's brief asked for two things on 2026-11-20: fix the locale keys
that fail upstream's `ui/i18n/locale_keys.test.ts` "the way wowsims does it",
and close the gate gap that let the failure through.

## What changed

- **Fork, `d94930daa`.** `BelowCutoffGroup.tsx` asked for
  `upgrades_tab.results.below_cutoff_group` and `…_title` with a `count`, and
  the locale file had only i18next plural forms (`_one`, `_other`). Upstream
  uses no plural keys. It picks a singular key or a count key in code:
  `ui/features/bulk/components/BulkSettings/CombinationsCount.tsx:34-36` on
  `upstream/master` (`combination_singular` / `combinations_count`, with
  `{{amount}}`). The group title now does the same, with
  `below_cutoff_group_singular` / `_count` and
  `below_cutoff_group_title_singular` / `_count`. The schema follows. These
  were the only plural keys in `assets/locales/en/upgrades.json`;
  `sources_section_other` is an ordinary key looked up as written. Three
  tests pin the text for one row and for the cutoff title; the text the player
  reads is unchanged.
- **Main repo.** `scripts/check_fork_tests.py` (`pnpm fork-tests:check`) runs
  the fork's whole unit suite instead of the tab's 906 tests, and then
  upstream's `test-locales.mjs`. Upstream CI runs both
  (`.github/workflows/run_tests.yml` in the fork). The lock moves to
  `d94930daa` and `data/sim-implemented-effects.json` follows. Ticket 432
  (locale check not in verify) closes with it. So does ticket 866, which
  recorded this same `locale_keys.test.ts` failure on 2026-11-09; it closes by
  the fork fix, with upstream's test unchanged (`pnpm merge-ready` named it).

## Review

One fresh reviewer (Opus `general-task`), read-only, 2026-11-20. Full report:
`.scratch/agent-reports/2026-11-20-general-task-review-locale-keys-fork-gate.md`
(gitignored). It found no defect in the code. It found two stale lines and
one open ticket that the branch made false, and one whitespace nit.

**A1 (low).** Ticket 432 asked for the locale check in verify and was still
open; `docs/upgrades-tab-scope.md` said "No locale step in `verify:steps`".
Fixed: 432 closed with a `Verified by:` line, its map line marked closed, and
the scope row removed.

**A2 (low).** `docs/adr/0038-…md:276` described `fork-tests:check` as "the
fork's ui/features/upgrades tests". Fixed: it now says the whole unit suite.

**A3 (nit).** One blank line before `if __name__` in
`scripts/check_fork_tests.py`. Fixed.

## Checks

The gate, red before the fork fix: the new script run against the main
checkout's fork at `c2a0d88c3` (lock pinned there), node v22.23.2:

```
FAIL  ui/i18n/locale_keys.test.ts > locale keys > finds every key ui/ asks for in en
Tests  1 failed | 2858 passed (2859)
fork tests check: vitest run exited 1 at fork commit c2a0d88c30b0. ...   rc=1
```

The old scoped gate passed on the same commit (906 tests).

Green in the pair, node v22.23.2:

```
python scripts/check_fork_tests.py
fork tests check ok at fork commit d94930daaf8f: vitest run, whole suite (Test Files  341 passed (341); Tests  2862 passed (2862)); test-locales.mjs passed   rc=0, 56 s
pnpm verify      gates: 1745 ran, 0 skipped   rc=0, 375 s
```

Time added: the scoped run took 16 s and the whole suite 61 s on an idle
machine (the reviewer measured 15 s and 62 s), so about 45 s more per verify.
`test-locales.mjs` takes under a second.

The reviewer also ran the locale, BelowCutoffGroup and ResultsPane tests
(30 passed), `npm run test:locales` (all four en files valid), and the gate
with a fake failing `node` (rc 1) and with no `node` (rc 2).

The fixes for A1-A3 are docs, a ticket and a blank line, so they have no
test; `pnpm merge-to-dev` re-runs verify on the tip.

## Notes

- Vitest exits 1 when it finds no test files, so that case reads as "a
  failing test" (rc 1). The old gate behaved the same way.
- `test-locales.mjs` passes when its file search matches nothing; on this
  WSL checkout it matched four files.
- The count is passed raw, where upstream formats it with `formatToNumber`,
  because the old text used the raw count.
- Two strings outside this ask read "1 eligible items" and "1 items" at count
  1 (`upgrades.json:43`, `:74`). Not touched here.
- The three new BelowCutoffGroup tests pass before and after the change by
  design: they pin text that must not change. The red test is upstream's
  `locale_keys.test.ts`.

## Disposition

| ID  | Axis        | Disposition | Ticket / note                                        |
| --- | ----------- | ----------- | ---------------------------------------------------- |
| A1  | Adversarial | fixed       | 432 closed; scope row removed; map line closed       |
| A2  | Adversarial | fixed       | ADR 0038 line 276 reworded                           |
| A3  | Adversarial | fixed       | blank line restored in `scripts/check_fork_tests.py` |

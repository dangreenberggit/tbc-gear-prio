# Binary provenance — stage-2-close-shortlist-box

Every artifact this branch produces cites this file instead of asserting the
binary exists. `vendor/` is gitignored (C2), so a fresh worktree has none of it.

## Pinned engine

| field | value | command |
| --- | --- | --- |
| tag | `v0.0.119` | `grep -E '"(tag\|commit)"' data/wowsims.lock.json` |
| commit | `3267f8dfa4a20746d4982c1522fdec1d4eb77f4c` | same |
| binary path | `vendor/wowsimcli-v0.0.119-win32-x64/wowsimcli-windows.exe` | `ls -la vendor/wowsimcli-v0.0.119-win32-x64/` |
| byte size | 22,305,280 | same |
| sha256 | `4b60235dcbb0088c9644ba464223fc9f65fcb3fccb2710cfc37fa3c752db97b1` | `sha256sum vendor/wowsimcli-v0.0.119-win32-x64/wowsimcli-windows.exe` |
| feral APL | `vendor/wowsims/feral_default.apl.json`, `priorityList` length 22 | `python -c "import json;print(len(json.load(open('vendor/wowsims/feral_default.apl.json'))['priorityList']))"` |

## Regenerating on a fresh worktree

```
pnpm fetch:wowsimcli
pnpm sync:wowsims
sha256sum vendor/wowsimcli-v0.0.119-win32-x64/wowsimcli-windows.exe   # must equal the sha256 above
pnpm sync:wowsims:check
```

The sha256 line is the verification: a fetch that lands a different build
produces a different digest, and every DPS number on this branch is only
comparable against runs on this digest.

## Baseline `pnpm verify` (2026-08-21, base `1ecd2e5`)

Exit 0. Test totals: **46 test files passed, 857 tests passed, 1 skipped, 2 todo (860)**.

Ticket 240 (vendor-gated tests can silently skip) — checked rather than assumed.
The single skip is named and is vendor-gated:

```
↓ packages/core/test/wowsims-fork-parity.test.ts > wowsims-fork-parity (E-W3) >
  skipped: vendor/tbc-new-fork is present but its protos are not generated
```

Observed with `pnpm vitest run --reporter=verbose 2>&1 | grep -iE "skip|todo"`.
It gates fork-parity, not the ranking path this branch measures; the wowsimcli
binary itself is exercised live by Steps 2 and 4, whose result files are
committed. No other test skipped.

## Step 3/4 — live re-sim of the three shortlists (2026-08-21)

Wall time per character, measured with `date +%s` around each invocation. Step 3's
trip-wire was 15 minutes on the first character (~7× ticket 200's measured ~2.1 min
for 246 p2 candidates at the default `concurrency: 4`). It did not fire.

| character | spec | maxPhase | pool | wall | above cutoff | baseline DPS |
| --- | --- | --- | --- | --- | --- | --- |
| slamaltman | ret | 3 | 391 | **200 s** | 44 | 2003.0 |
| shredzepelin | feral | 2 | 228 | 144 s | 14 | 2266.9 |
| nexess | feral | 2 | 228 | 144 s | 12 | 2302.5 |

Transcripts (`.scratch/rank-reports/stage2-close-*.stdout.txt`) each carry the
invocation, the resolved fixture path, this binary's digest, and the CLI's own
`gear read from …` provenance line:

```
slamaltman    gear read from Hydross the Unstable (VGjFb3mtX9xHgyav fight 8, ranked route)
shredzepelin  gear read from Void Reaver (YwahQLgv2jBrZGn6 fight 63, ranked route)
nexess        gear read from Fathom-Lord Karathress (4C2fJrMvcjaXL3KN fight 32, ranked route)
```

shredzepelin reads Void Reaver, not Morogrim — the ticket-06 routing (`cli.ts:372`)
is doing its job. Step 4's `meta`-fields fallback was not needed and no production
code was touched (R7's expected-unused prediction held).

**C11 is superseded by observation, as the plan required.** C11 (flagged
non-load-bearing) carried 20 rows at p2 / 43 at p3 with baseline 2145.6, sourced
from `synthetic-roster-recordings.json` via `b7bcf51`. Live at this tip the feral
p2 counts are **14 (shredzepelin) and 12 (nexess)** with baselines 2266.9 and
2302.5. Any artifact citing above-cutoff counts cites this table, not C11. Counted
with `python -c "...len([i for i in d['ranking']['items'] if not i.get('belowCutoff')])"`
against each `stage2-close-*.json`; the transcripts' `#N` lines agree.

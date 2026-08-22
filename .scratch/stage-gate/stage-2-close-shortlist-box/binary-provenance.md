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

Status: open
Type: defect
Origin: feat/round-11-followups `pnpm verify` logs (upstream-drift:warn step), 2026-10-04
Blocks: none
Blocked by: none
Related: 354, 245

# The upstream drift check stops on an HTTP 404 and never reports drift

## What is wrong

`python scripts/sync_wowsims.py --check` exits 1 with `HTTPError: HTTP
Error 404: Not Found`. The pin `17a8fb28c` is behind upstream `master`
and tag `v0.0.147`, both `42c75dc9b` (`git -C vendor/tbc-new-fork
ls-remote upstream refs/heads/master refs/tags/v0.0.147`). The check then
fetches `ui/core/constants/other.ts` at that tip to read its phase
(`sync_wowsims.py:624`), and that raw URL returns 404, while it returns
200 at the pin (`curl -s -o /dev/null -w "%{http_code}"
https://raw.githubusercontent.com/wowsims/tbc-new/<sha>/ui/core/constants/other.ts`).
Whether upstream moved or deleted the file is unverified.

## Where it was found

Branch `feat/round-11-followups` at `2d281ee7`, in every `pnpm verify` of
this branch, for example
`.scratch/stage-gate/round-11-followups/546-verify.txt:284-292`
(gitignored): the `upstream-drift:warn` step prints "CHECK DID NOT RUN --
drift is UNKNOWN, not absent." Re-run: `corepack pnpm sync:wowsims:check`.

## Why it matters

The step is warn-only, so `pnpm verify` passes. But the one check that
tells us the engine pin is behind upstream reports nothing, at a time when
the pin is behind. Upstream changes that affect rankings can go unnoticed.

## What would close this

`corepack pnpm sync:wowsims:check` runs to the end and reports drift (or
none), and `upstream-drift:warn` in `pnpm verify` no longer prints "CHECK
DID NOT RUN".

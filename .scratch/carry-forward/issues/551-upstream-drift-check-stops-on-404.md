Status: closed
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

## Closed 2026-10-05: the phase file moved upstream; --check now follows it

### Cause

Upstream moved the phase file. Commit `c86fd86f5` ("[UI] Lane 3: port
ui/sim as the TBC-shaped skeleton", 2026-09-16) added
`ui/sim/constants/other.ts`, and commit `7b539641` ("Delete the pre-port
UI tree", 2026-09-16) removed `ui/core/constants/other.ts`. Re-run:
`gh api "repos/wowsims/tbc-new/commits?path=ui/core/constants/other.ts&per_page=3"`
and the same with `path=ui/sim/constants/other.ts`. Raw fetch status, by
`curl -s -o /dev/null -w "%{http_code}"`:

| path | pin `17a8fb28c` | tip `42c75dc9b` |
| --- | --- | --- |
| `ui/core/constants/other.ts` | 200 | 404 |
| `ui/sim/constants/other.ts` | 404 | 200 |

Three defects followed from the move:

1. `pinned_fetch.fetch` raises `urllib.error.HTTPError`, and both phase
   reads in `do_check()` caught only `SystemExit`, so the 404 ended the
   check with a traceback.
2. `--check` read only the old path.
3. The new file declares `export const CURRENT_PHASE = Phase.Phase3;`
   with no `: Phase` annotation, and `parse_current_phase` required it.

### Fix

- `b7d3644a` — `read_phase_at(sha)` turns an `HTTPError` into a
  `SystemExit` that names each path tried. Both `do_check()` call sites
  use it, so a missing file is a `DRIFT:` line, not a crash.
- `ccde6986` — `read_phase_at` tries `ui/sim/constants/other.ts` first,
  then the `TRACKED` path. `TRACKED` is unchanged: `--restore` and
  `--update` at the current pin need the old path.
- `ef464ad1` — the `: Phase` annotation is optional in both
  `parse_current_phase` regexes.

Each commit adds one check to `scripts/check_sync_wowsims.py`, written
first and seen failing before the fix (`python scripts/check_sync_wowsims.py`:
rc 1 before each fix, rc 0 with 28 checks after the last).

### Check output after the fix

`corepack pnpm sync:wowsims:check`, 2026-10-05, rc 1 (drift found, no
traceback):

```
  pinned:   17a8fb28c5ad14b649acecdaacd488594048f467 (17a8fb28c5ad)  phase 3
  upstream: v0.0.147 (42c75dc9b6ef)
  latest release: v0.0.147 (42c75dc9b6ef) -- informational on a sha pin
  master CURRENT_PHASE = 3

  DRIFT: pin is behind master: 17a8fb28c5ad -> 42c75dc9b6ef
  DRIFT: watched ref master moved: 17a8fb28c5ad -> 42c75dc9b6ef (informational -- not a build pin; re-review before treating its features as still absent)
```

`corepack pnpm upstream-drift:warn` prints the same two `DRIFT:` lines
and no "CHECK DID NOT RUN".

### Not fixed here

The same upstream move breaks 97 of the 98 `TRACKED` paths at the tip,
so the next `--update` or pin move cannot vendor them. That needs a pin
move and an owner decision: ticket 558.

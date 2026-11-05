# Pre-merge review project values

The values that the `pre-merge-review` skill reads for this repo, one
section per kind.

## Branches

**Integration branch:** `dev`

## Axes

**Adversarial brief:** `.agents/reviews/adversarial.md`

**Domain brief:** `.agents/reviews/domain.md`: TBC/WCL/wowsims facts vs.
`docs/stage0-findings.md`

**Domain content:** game-domain content (TBC, WCL, wowsims facts)

## Tooling check

**Tooling list:** `TOOLING_PATHS` in `scripts/check_merge_ready.py`. The
owner approves every change to that list.

**Command:**

```bash
python scripts/check_merge_ready.py --product-files
```

## Small-change lane

**Paths that are never a small change:** a path that starts with
`data/`, `vendor/` or `packages/core/src/`, or has `.generated.` in its
name.

## Focused check

**Other repo:** the fork, `git -C vendor/tbc-new-fork log -p <fork-from>..<fork-to>`,
where `<fork-from>` and `<fork-to>` are the `commit` values in
`data/wowsims-fork.lock.json` at the round's `<from-sha>` and `<through-sha>`.
When `git diff --quiet dev...HEAD -- data/wowsims-fork.lock.json` exits 0, the
branch never moves the fork pin: skip the fork log and treat the
wowsims-file condition below as holding.

**Commit kind:** a fork re-pin: it changes `data/wowsims-fork.lock.json`,
and every other file it changes is under `data/` or `docs/`.

**Condition:** the round's fork range leaves the fork's changes to upstream
wowsims files as they were: no fork commit in it edits an upstream file,
and no upstream merge in it changes a file that the fork modifies.
`docs/fork-upstream-touchpoints.md` § How to reproduce every number here
shows how to list those files.

## Review file

**Path:** `docs/reviews/<branch-name>.md` (slashes → dashes)

**Disposition rules:** `docs/agents/known-traps.md`, "Before writing a
review Disposition table"

## Tickets

**New ticket:** `.scratch/carry-forward/issues/<NN>-<slug>.md`, with the
header lines that `docs/agents/issue-tracker.md` § Carry-forward tickets
lists.

**Ticket path pattern:** `.scratch/carry-forward/issues/*.md`

**Ticket map:** `.scratch/carry-forward/map.md`

## Commands

**Gate command:** `pnpm verify`

**Merge check:** `pnpm merge-to-dev --check-only`. On `phase-N/*` with
open `Blocks: phase-N` tickets still open:
`pnpm merge-to-dev --check-only --ack-open-blockers`

**Merge command:** `pnpm merge-to-dev`

**Merge override, never set without the ask:** `TBC_ALLOW_DEV_MERGE=1`

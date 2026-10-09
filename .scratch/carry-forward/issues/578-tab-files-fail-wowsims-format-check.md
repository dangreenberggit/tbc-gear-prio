Status: open
Type: task
Origin: stage-gate cleanup-upstream-footprint, Gate B row R4-1 and owner ruling of 2026-10-08T22:16Z (`.scratch/stage-gate/cleanup-upstream-footprint/decision-log.md`; gitignored, owner's checkout)
Blocks: none
Blocked by: none
Related: 573, 575, 576

# 100 of the tab's files fail wowsims' formatting check

## Owner's requirement (2026-10-08)

> "We can do the reformatting later but of course they will eventually have to
> pass a formatting check"

So every tab file must eventually pass wowsims' formatting check. Not on the
current cleanup.

Wowsims' formatter settings (`.oxfmtrc.json` in `vendor/tbc-new-fork`) are not
edited unless the owner approves that exact edit. That includes adding the
tab's files to its `ignorePatterns`.

## What is there

Wowsims' format script is `npx oxfmt . --check` (`package.json` `fmt`), and
wowsims' CI runs it. At fork `9c367c242` it fails on 100 files, all of them
the tab's own:

```
cd vendor/tbc-new-fork && node node_modules/oxfmt/bin/oxfmt --check .   # rc 1, "Format issues found in above 100 files"
```

- 64 under `ui/features/upgrades/model/data/`: the 63 bundled JSON data
  copies (44 `*.universe.json`, 19 `*.ep-weights.json`; every tracked JSON
  file in that folder) and `data.ts`.
- 36 under `ui/features/upgrades/model/engine/`: the ported engine files (31
  in the folder, 3 in `seams/`, 2 in `fixtures/`).

No existing wowsims file fails. The gate review measured 103 files before the
cleanup moved three of ours out of the fork (Gate B row R4-1).

## Why this is not a plain `oxfmt` run

- The ported engine files are hashed in `docs/fork-provenance/engine.md`, and
  `pnpm verify` (`engine-port-drift:check`) compares them with this repo's
  `packages/core` sources. Reformatting them moves every hash and needs the
  PROVENANCE cycle (`docs/agents/known-traps.md`, "Before editing a ported
  engine file").
- The bundled JSON copies must byte-match their sources under `data/`
  (`python scripts/sync_fork_universes.py --check`). Reformatting them in the
  fork alone breaks that check; the source writers or the sync script would
  have to write wowsims' format.

## Done when

`npx oxfmt . --check` passes in the fork with `.oxfmtrc.json` unchanged (or
changed only by an edit the owner approved word for word), and `pnpm verify`
passes after the re-pin.

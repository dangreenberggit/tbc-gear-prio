Status: blocked
Type: task
Origin: ticket 551 fix on feat/silence-followups, 2026-10-05
Blocks: none
Blocked by: owner decision on moving the engine pin past upstream 7b539641
Related: 551, 263

# 97 of the 98 tracked upstream paths are gone at upstream `master`

## What is wrong

`TRACKED` in `scripts/sync_wowsims.py` lists 98 upstream paths. At the
upstream `master` tip and tag `v0.0.147` (both `42c75dc9b6ef`), 97 of them
do not exist. At our pin `17a8fb28c` all 98 exist. Only
`assets/database/db.json` is at the same path in both.

Upstream restructured its UI tree on 2026-09-16: `c86fd86f5` ("[UI] Lane 3:
port ui/sim as the TBC-shaped skeleton") added `ui/sim/` and `ui/specs/`,
and `7b539641` ("Delete the pre-port UI tree") removed the old
`ui/<class>/<spec>/` and `ui/core/` trees.

Where the 97 missing paths are at the tip, matched by file path below
`ui/`:

| new location | count |
| --- | --- |
| `ui/specs/<class>/<spec>/...`, same path below the spec directory | 94 |
| `ui/core/constants/other.ts` is now `ui/sim/constants/other.ts` (ticket 551) | 1 |
| `ui/core/proto_utils/utils.ts`: the two helpers we read are in `ui/sim/proto/utils.ts` | 1 |
| no file of the same name: `ui/druid/feralcat/sim.ts` | 1 |

Re-run: fetch both trees with
`gh api "repos/wowsims/tbc-new/git/trees/<sha>?recursive=1"` for
`42c75dc9b6ef` and `17a8fb28c5ad14b649acecdaacd488594048f467` (neither
response is truncated), and test each `TRACKED` value for membership.

## Why it matters

`do_update` fetches every `TRACKED` path at the new commit and refuses to
write a lockfile when any fetch fails (`scripts/sync_wowsims.py`, the
`fetch_errors` check after the fetch loop). So `--update`, `--update --ref
master`, or any pin move to a commit at or after `7b539641` fails until
`TRACKED` is remapped (hypothesis, untested: reasoned from the code and the
tree listing; `--update` was not run because it writes `vendor/`).

`--check` is not affected: ticket 551 taught it to read the phase from
either path. `--restore` at the current pin is not affected.

## Why it is not done on the branch that found it

Remapping `TRACKED` only means something together with moving the pin:
at the current pin the new paths do not exist, so the remap and the pin
move are one change. The pin move is the owner's decision. It moves the
engine every ranking is computed with, and it needs the fork re-pin and
re-baselining that come with any engine move (`docs/agents/known-traps.md`,
"Before moving the wowsims engine pin").

Two tracked files feed `scripts/extract_sim_defaults.mjs`, which parses
`feral_sim.ts` for buff and debuff defaults and reads two helpers from
`proto_utils.ts`.

- Both helpers exist at the tip: `defaultRaidBuffMajorDamageCooldowns`
  at `42c75dc9:ui/sim/proto/utils.ts:133` and
  `defaultExposeWeaknessSettings` at `:169` (re-run: `git -C
  vendor/tbc-new-fork grep -n
  "defaultRaidBuffMajorDamageCooldowns\s*=\|defaultExposeWeaknessSettings\s*="
  42c75dc9 -- ui`). So `proto_utils.ts` needs a path change to
  `ui/sim/proto/utils.ts`. Whether the extractor's parse still matches
  the helpers' bodies there is untested.
- `feral_sim.ts` has no same-name successor. Where its defaults now live
  is unknown; `ui/specs/druid/feralcat/` at the tip has `inputs.ts`,
  `presets.ts` and `spec.ts` (hypothesis, untested: one of these holds
  the defaults).

## What would close this

The owner decides to move the engine pin past `7b539641`. Then: `TRACKED`
is remapped, including a new source for `feral_sim.ts` and the new path
for `proto_utils.ts`;
`--update --ref <chosen sha>` writes a lockfile with all tracked files;
and `corepack pnpm sim-defaults:check` passes against the new vendored
sources. Or the owner decides not to follow upstream past `7b539641`, and
this ticket closes as `wontfix` with that ruling quoted.

Status: open
Type: task
Origin: user, during ticket 66 — "there should also be a skill for database /
  data work that i think we'll do at the end of the branch before merging"
Blocks: none
Branch: feat/phase-3-vendor-and-craft-coverage (do before merging)
Blocked by: none
Relates to: 66 (the work that surfaced the need), 67 (reviews that change), 58

# Write a skill for database / data work

**Timing: end of `feat/phase-3-vendor-and-craft-coverage`, before merging.**

Marked with `Branch:`, not `Blocks:`. `Blocks: phase-N` means a **PLAN.md §14
delivery phase**, and PLAN.md's Phase 3 is the *web shell* — not started, gate
boxes all unchecked. This branch's "phase-3" is the **TBC content tier** (P3
raids, `ret-p3.json`). Writing `Blocks: phase-3` here would claim this ticket
blocks the web shell, which is false, and would surface it on a future
`phase-3/*` branch that has nothing to do with this work.

**Not a gate.** `pnpm land` reads `Blocks:` only, and only on `phase-N/*`
branches; this is a `feat/` branch, so nothing will stop a merge for this
ticket. It is a note to act on. Check it by hand, or `grep -l "^Branch: " .`

## Why

Ticket 66 was filed as a gate fix and turned into a data-pipeline change:
vendoring a new upstream module, pinning it without moving an existing pin,
parsing it to a committed artifact, then regenerating six committed universes
and proving nothing else moved. None of that is covered by an existing skill.
`tdd` is red/green on code, `pre-merge-review` is the branch gate,
`sme-rank-review` is game-domain judgement on a ranking. The data lane has its
own failure modes and they are the ones this repo keeps hitting.

## What it should cover (from what ticket 66 actually required)

- **Vendored inputs are pinned.** Add to `TRACKED`, then `--restore` at the
  existing commit rather than `--update`, which chases latest and moves every
  other file's pin. `sync_wowsims.py` and `sync_atlasloot.py` are the pattern.
- **`vendor/` is gitignored.** Never put a fetched artifact in a module's import
  path — it makes `pnpm verify` hard-fail on a fresh worktree until a network
  restore runs. Parse to a committed artifact under `data/` instead. This is why
  ticket 66 declined to pin and parse `names.ts`.
- **Regenerating a committed generated file is a claim.** Byte-compare the
  unchanged ones against `HEAD`, diff the changed ones field by field, and state
  what moved and why. "Entry counts unchanged, only `factionId` added" is the
  shape of the answer; a raw `git diff --stat` against `HEAD` is not — it shows
  intended changes, not instability.
- **Prove determinism separately.** Run the generator twice and `cmp` the two
  outputs. Diffing against `HEAD` does not test reproducibility.
- **A lossy normalisation is only safe if something guards it.** The prose→id
  join collapses to letters; the gate fails if two factions ever collide. Pair
  every such shortcut with the check that catches its failure.
- **Single-witness transcription is the recurring complaint** (48-53, 58, 66§4).
  Cite the corroborating source, and say plainly when it is untracked.
- **Check whether a stale comment or test encodes the old model.** Ticket 66
  found the wrong belief written into `pool.ts` and a `pool-hardening`
  assertion; both had to change with the data.

## Before writing it

- Read `writing-great-skills` and `writing-for-agents` — AGENTS.md requires the
  second as a review pass on any skill file.
- AGENTS.md § "Editing skills": keep the lane sharp. Engineering-process rules
  do not belong in a game-domain skill and vice versa. This one is pipeline and
  provenance, not ranking judgement.
- Skills are mirrored: `.claude/skills/<name>/` and `.agents/skills/<name>/`
  must match or `pnpm mirrors:check` fails.
- AGENTS.md requires proposing skill/AGENTS.md changes in chat and waiting for
  approval before editing. Adding a *new* skill plus its AGENTS.md pointer is
  that kind of change — get the go-ahead.

## Done when

- The skill exists in both mirrors and `pnpm mirrors:check` passes.
- AGENTS.md points at it from the "Agent skills" section.
- It has been reviewed against `writing-for-agents`.

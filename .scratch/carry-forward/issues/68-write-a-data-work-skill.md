Status: closed
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

## Landed, 2026-08-08

`data-pipeline-work`, in both mirrors. **Five rules, not the six this ticket
lists** — two changes, both from review:

- The `vendor/`-import rule was **cut**. It restates `.gitignore`, which the
  environment already says, and an agent parsing into `data/` has no pull
  toward importing the raw file. Its one non-obvious part — passes locally,
  fails on a fresh clone — survives as a checklist line with the `names.ts`
  precedent.
- The stale-comment rule was **re-headed** on the claim that is not default
  behaviour: a data change falsifies beliefs in code you never opened, across a
  package boundary. Editing comments in files you are already touching needs no
  skill; grepping `packages/core/` after a Python/JSON change does. Also added
  that 66's assertion needed **replacing, not editing** — it asserted the wrong
  invariant rather than a stale one.

The skill records which rules `pnpm verify` already gates, and that all three
gates are AtlasLoot-only. That boundary is the point: a green verify on a
non-AtlasLoot input reads exactly like one that checked the pin and the regen.

Two review passes. `writing-for-agents` first (self), which cut duplicated
per-rule checks and turned prohibitions into positive headings. Then an
independent agent for clarity, which verified every factual claim in the file
and found one wrong: the gated-rules section named two rules when **three** are
gated — the collision check is `check_rep_tables.py:136`, confirmed by reading
it. It also found the regen rule stated a principle with no command and no
bucketing criterion; it now has both, and the ordering rule that a bucket
assigned after the diff rules nothing out.

Dropped from that review's findings: a "leading word" framing the file had
carried. It compressed one instruction into a coined term the agent would have
to unpack again, and "already used elsewhere in the repo" is not a reason to
spread a word into a new setting.

## Done when

- ~~The skill exists in both mirrors and `pnpm mirrors:check` passes.~~ Done.
- ~~AGENTS.md points at it from the "Agent skills" section.~~ Done.
- ~~It has been reviewed against `writing-for-agents`.~~ Done, plus an
  independent clarity review.

# Stash salvage — fan-out process

**Feature branch:** `phase-1/five-seed-spread`  
**Base SHA:** `2d0741efc4b1225fb8a1309b4bbee0e28d011c3e`  
**Date:** 2026-07-28  
**Stash frozen refs:** see `.scratch/stash-salvage/stash0-refs.txt`  
**Do not drop `stash@{0}`.** Prefer reading frozen SHA / `inbox/` copies.

## Why this exists

Before raid-scoped fan-out, dirty ranking/pool WIP was stashed with a note that
it was “unrelated.” Work continued on tip; tip never got candidate gem fill;
membership was redesigned; the stash was left behind. This pass **scavenges**
what is still useful, **reconciles** it with tip, and **quarantines** the rest
with an explicit unresolved note — no silent `stash pop`, no rewriting history.

## Locked salvage decisions

1. **Do not** restore stash wholesale onto tip.
2. **Do not** bring back EP top-N membership (`ret.json` 12/slot + `fullPool` as
   the rank path). Tip’s universe path stays.
3. **Do** port PLAN §9 candidate gem fill onto tip’s universe rank path.
4. **Do** port HTML rank report onto tip CLI (universe load, no `--full-pool`).
5. **Do** restore `sme-rank-review` skill files (tip AGENTS already references them).
6. **AGENTS / skills / model-policy:** archaeology only with a sharp reviewer —
   tip may already be better; stash hunks are guilty until proven useful.
7. EP pool/curate/generate stash copies → quarantine folder + decision note only.

## Partition

| Slice | Branch | Model | pathsAllowed | pathsForbidden |
|-------|--------|-------|--------------|----------------|
| A gems | `phase-1/w-salvage-gems` | Composer | `packages/core/src/candidate-gems.ts`, `packages/core/test/candidate-gems.test.ts`, `packages/core/src/rank.ts` (gem fill + post-swap meta repair only), `packages/core/test/rank.test.ts` (only tests for gem fill), `packages/core/src/index.ts` (candidate-gems exports only), handoff | `packages/core/src/cli.ts`, `rank-report*`, `data/**`, `scripts/**`, skill/docs files |
| B report | `phase-1/w-salvage-report` | Composer | `packages/core/src/rank-report.ts`, `packages/core/test/rank-report.test.ts`, `packages/core/src/cli.ts`, handoff; **barrel lines for rank-report stated in handoff** (A owns `index.ts`) | `candidate-gems*`, `data/pools/**`, `scripts/generate*`, `scripts/curate*` |
| C sme | `phase-1/w-salvage-sme` | Composer | `.agents/skills/sme-rank-review/**`, `.claude/skills/sme-rank-review/**`, handoff; if AGENTS needs a fix, **state the exact line in handoff** (D owns AGENTS) | all `packages/**`, `docs/agents/model-policy.md`, other skills |
| D docs | `phase-1/w-salvage-docs` | **Grok high** | `AGENTS.md`, `docs/agents/model-policy.md`, `.agents/skills/{parallel-phase,dont-be-stupid,writing-great-skills}/**`, `.claude/skills/{same}/**`, archaeology report under `.scratch/stash-salvage/` | `packages/**`, `data/**`, pool scripts |
| E quarantine | `phase-1/w-salvage-quarantine` | Composer | `.scratch/stash-salvage/quarantine/**` only | everything else — **do not modify tip pool/scripts** |

**Fan-in:** editorial (delegator). Conflict policy: path ownership; A owns
`index.ts` and applies B’s stated export lines at merge. D owns AGENTS and
applies C’s stated line if any.

## Acceptance (per slice)

- **A:** `fillCandidateGems` on tip; candidates no longer hardcode `gems: []`;
  after fill, meta repair still applies to the full set (PLAN §9); core tests green.
- **B:** `pnpm rank --offline ... --report path.html` works with **universe**
  pool; no resurrection of `--full-pool` as membership escape.
- **C:** skill files present in both mirrors; `pnpm mirrors:check` still green
  after fan-in (C must keep mirrors identical).
- **D:** written archaeology with per-hunk verdict: take stash / keep tip /
  unresolved; any applied edits justified against tip history.
- **E:** quarantine copies + `UNRESOLVED.md` explaining what we don’t know and
  what must not be merged without an owner decision.

## Claims to re-check at fan-in

| Claim | Command |
|-------|---------|
| No `gems: []` on candidate swap | `rg "gems: \\[\\]" packages/core/src/rank.ts` |
| Universe still default pool | `rg "universes/ret-p" packages/core/src/cli.ts` |
| No `prefilterPool` / `fullPool` return | `rg "prefilterPool|fullPool" packages/core` |
| SME skill mirrored | `pnpm mirrors:check` |
| Stash still present | `git stash list \| head -3` + SHA in `stash0-refs.txt` |

## Inbox for workers

Frozen extracts (same content as stash untracked / tracked WIP):

- `.scratch/stash-salvage/inbox/` — candidate-gems, rank-report, sme skill
- `.scratch/stash-salvage/inbox-tracked/` — stashed AGENTS / model-policy / skills
- `.scratch/stash-salvage/quarantine/from-stash/` — EP pool + generate/curate + stash cli/rank

## Stash note (correcting the old one)

The previous PROCESS note calling this WIP “unrelated” was **wrong for gem fill,
rank report, and sme-rank-review**. It was only correct for EP membership pool
curation. This salvage pass exists because that mislabel caused tip to proceed
without PLAN §9 candidate gemming.

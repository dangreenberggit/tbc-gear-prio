# Ticket sweep 154–164 — handling plan

Written 2026-08-14 (Fable, design lane). Executed by an Opus orchestrator per
[`orchestration.md`](orchestration.md).

## The one structural fact

The eleven tickets were filed from two branches that have **not** been merged
into each other:

| Branch | Tip (2026-08-14) | State |
| --- | --- | --- |
| `feat/shopping-list-wowsims-tab` | `e1f460c` | the wowsims tab detour; this session's branch |
| `feat/ret-p3-data` | `cffaee0` (worktree `..\tbc-gear-prio-wt-ret-p3-data`) | review green, SME gate closed, **awaiting the user's merge ask** |

`git merge-base --is-ancestor feat/ret-p3-data HEAD` → false. Common ancestor
`3673b24`.

Tickets 157, 158, 159, 160, 161, 163, 164 all point at code that exists only
on `feat/ret-p3-data` (`ep_weights_path_for`, `PER_FILE_PIN`, the
worn-unrankable classifier, the ret-p3 ranking artifacts). Tickets 155, 156,
162 point at code that exists only on `feat/shopping-list-wowsims-tab` (the
fork parity test, the E-W2 harness, the Upgrades tab). Ticket 154 is a data
regen and can ride with either, but it must ride with 158 (see below).

**Decision:** two work branches, one per base. Do not merge either base into
the other — that is the user's `merge-to-dev` decision, not ours.

- **Branch A** `feat/sweep-tab-tickets` off `e1f460c` — tickets 155, 156, 162.
- **Branch B** `feat/sweep-ret-tickets` off `cffaee0` — tickets 154, 157–161,
  163, 164. B is a strict superset of `feat/ret-p3-data`; when the user
  merges B to `dev` it carries `ret-p3-data` with it, so `ret-p3-data` need
  not be merged separately (state this in B's review).

Each branch gets its own `pre-merge-review` and its own merge ask.

## Per-ticket handling

Grouped into slices so that no source file is owned by two slices running at
once. "Done when" is the ticket's own acceptance criteria unless narrowed here.

### Branch A (base `e1f460c`)

| Slice | Tickets | Files owned | Notes |
| --- | --- | --- | --- |
| A1 | 155 | `packages/core/test/wowsims-fork-parity.test.ts`, its recorded-observation fixture(s), `.scratch/handoffs/wowsims-tab/slice-2/HANDOFF.md` (mutation table) | Multi-seed + socketed candidate + set-bonus completion. Fixture extension vs regen is the ticket's stated untested hypothesis — the worker measures it first and says which it did. `pairedReplicateSe` perturbation must fail the test; re-run the mutation table. |
| A2 | 162 **v1 half only** | the Upgrades tab (`upgrades/**`) assumptions drawer + one test | Drawer names the EP-weights file and its `pin`; test pins that the prefilter uses committed weights while `player.getEpWeights()` differs. **v2 (opt-in toggle, shim, pseudo-weight decision) is not built** — it is a design the user has not asked for. Ticket stays open with a comment saying v1 landed. |
| A3 | 156 | `docs/plans/wowsims-tab/plan.md` §5, the serving recipe (add `vite.build-workers.mts` step) | Measurement, not code. Best effort: reproduce in the harness browser, try a production build (`vite build`) vs dev server, record numbers. If the slowness cannot be explained **and** a real foregrounded browser is not available to the agent, the worker writes exactly what was measured, what was ruled out, and leaves the ticket open with a comment. Never invent numbers. |

A1/A2/A3 are file-disjoint → run in parallel.

### Branch B (base `cffaee0`)

| Slice | Tickets | Files owned | Notes |
| --- | --- | --- | --- |
| B1 | 158, 159, 154 | `scripts/assemble_universe.py`, `data/presets/**`, a new shared EP-weights index (JSON + generated TS via `scripts/generate_json_literal_types.py`), `packages/core/src/cli.ts`, `data/universes/**` (regen of every universe incl. feral) | Order inside the slice: (1) 159 — lift the phase→weights mapping into one JSON source read by both the assembler and `cli.ts` (ticket 102's rule: no hand-copied table); decide and record whether the CLI reads `pseudoWeights` (default: keep dropping, say so in a comment on 162). (2) 158 — stamp resolved weights path + `pin` into universe file and report. (3) 154 — regen feral-p2/p3, state whether 253 or 256 is right with evidence, byte-compare all regenerated universes against HEAD and document any residual drift. One slice because all three touch the assembler and all three regen `data/universes/`. |
| B2 | 157, 163 (full), 164 | `scripts/assemble_universe.py` (pool admission), `packages/core/src/rank.ts`, `packages/core/src/dead-slots.ts`, rank-report / HTML renderer, `data/universes/ret-*.json` regen, `.scratch/handoffs/wowsims-tab/ret-p3-ranking/**` | **Runs after B1 merges** (same files). 157: fix the no-source exclusion for D7-eligible items (`assemble_universe.py:1416-1424`, `excludedNoSource`), admit the 3 librams + 3 trinkets, regen, re-measure recall. 163: worn-but-unpooled guard in `rankUpgrades` — explicit row/warning, tested at the module interface; relic-slot caveat where candidate effects are unimplemented stays as-is (sim-side, out of scope). 164: local note in the slot section, non-loss styling, sticky-nav chip state — report layer only. Re-run the ret-p3 ranking so 163's "worn relic recognized" is shown, not claimed. |
| B3 | 160, 161 | `scripts/check_sync_wowsims.py`, `PLAN.md` §16 item 3, `.scratch/handoffs/wowsims-tab/slice-6/HANDOFF.md:664-665` | Disjoint from B1/B2 → runs in parallel with B1. 160: three cases from the ticket's done-when plus the "promote out of PER_FILE_PIN is a no-op" check. 161: two doc corrections. |

## Out of scope (say so, do not do)

- Merging either branch to `dev`, or `ret-p3-data` into anything.
- Ticket 162 v2 (toggle, fork shim, `epScore` pseudo channel).
- Implementing libram proc effects in the fork (163 layer 3).
- Reopening the SME §9.6 gate — B2's handoff notes that 157 landing re-opens
  the "would a ret trust this?" question and leaves that to the user.

## Ticket bookkeeping

A worker that fully meets a ticket's acceptance criteria sets `Status:
resolved` and appends `## Comments` with the commit SHA and the command a
reader re-runs. Partial → stays `open`, comment says what landed and what did
not. Every causal claim in a ticket comment or commit message points at a
re-runnable command or says **untested**.

## Done when (whole sweep)

- Branch A and branch B each: worktrees torn down, `pnpm verify` green on the
  integrated tip, `docs/reviews/<branch>.md` written by `pre-merge-review`,
  Disposition table covers every worker concern.
- Every ticket 154–164 has a comment dated 2026-08-14 recording its outcome.
- The orchestrator's final handoff lists, per branch, the tip SHA, the review
  verdict, and the exact `pnpm merge-to-dev` ask for the user — **and stops**.

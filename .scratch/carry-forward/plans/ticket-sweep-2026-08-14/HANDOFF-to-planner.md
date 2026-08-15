# Handoff to the planner — ticket sweep 154–164

From: the session that wrote [`plan.md`](plan.md) / [`orchestration.md`](orchestration.md)
and dispatched the Opus orchestrator. Written 2026-08-15, after the sweep
finished and before any merge. Audience: whoever picks the plan back up
(design lane). The orchestrator's own record is [`PROCESS.md`](PROCESS.md);
this file is about **plan vs. outcome** — what the plan got wrong and what
that means for the next plan.

## Outcome in one table

| Branch | Base | Tip | Commits | verify | Review |
| --- | --- | --- | --- | --- | --- |
| `feat/sweep-tab-tickets` (main checkout) | `a48594a` | `a0e2536` | 16 | green, 760 pass | `docs/reviews/feat-sweep-tab-tickets.md`, merge-ready |
| `feat/sweep-ret-tickets` (worktree `..\tbc-gear-prio-wt-sweep-ret`) | `cffaee0` | `01bbf12` | 17 | green, 773 pass | `docs/reviews/feat-sweep-ret-tickets.md` (on that branch), merge-ready; supersedes `feat/ret-p3-data` |
| fork clone `vendor/tbc-new-fork`, branch `w/a2-162-v1` | `adb0d135` | `63494ce7b` | 4 | — | ticket 162 v1; **unpushed, gitignored, invisible to a fresh checkout** |

`dev` unmoved at `5be6a81`. Nothing merged. Re-check tips: `git log -1 <branch>`.

Tickets: resolved 154, 155, 157, 160, 161, 163, 164 (plus 158, 159 — see
deviation 3). Open: 156 (partial), 162 (v1 done, v2 unbuilt by design). New:
165–168 on branch A, 169–174 on branch B; `pnpm issues:open` on each branch
lists them.

## Where the plan was wrong

1. **The Upgrades tab is not in this repo.** `plan.md` assigned slice A2 to
   `upgrades/**` as if it were a main-repo path. It lives in the nested,
   gitignored fork clone `vendor/tbc-new-fork` (own git repo) at
   `ui/core/components/individual_sim_ui/upgrades/`. Worktree-isolated
   workers cannot see gitignored dirs, so A2 came back blocked and had to be
   respawned in place, committing to the fork's own history. **Rule for next
   time:** before assigning a path, `git ls-files <path>` on the base — a
   ticket quoting a path is not evidence the path is tracked here.

2. **`e1f460c` was stale by the time the orchestrator read it.** Committing
   the plan moved the tip to `a48594a`. The orchestrator caught it via
   `git rev-parse` (as instructed). Write "the tip at spawn time, resolved by
   `git rev-parse`" rather than a literal SHA in the plan body.

3. **Tickets 158/159 were already resolved on `cffaee0`.** The main-branch
   copies of those ticket files said `open` (that is what `pnpm issues:open`
   showed me), but `feat/ret-p3-data` carried the fixes and its copies were
   already resolved. Ticket files are duplicated across unmerged branches and
   their `Status:` lines diverge — read the ticket **on the branch you will
   base from**, not on the branch you happen to be standing on. B1's scope
   shrank to 154 as a result.

4. **Worker completion notifications route to the parent session, not to
   the orchestrator subagent.** The orchestrator ended its turn once with
   five workers in flight (the exact anti-pattern the skill forbids); I had
   to resume it and relay A2's blocked handoff by hand. If a plan calls for
   a subagent orchestrator, tell it up front that it must poll worker
   branches / handoff files, because it will never be notified.

5. **The Agent tool has no effort control.** "Opus high" became a prompt
   instruction. Model policy talks about `/effort`, which a subagent spawn
   cannot set.

## Where the plan held

- Two bases were the right call; B is a strict superset of `ret-p3-data`, so
  one merge ask covers both (state this in the merge ask).
- The B1 → B2 sequencing on `assemble_universe.py` / `data/universes/**`
  was necessary: the review still found a ret-only fix (157's
  force-include) leaking into feral universes; had B1/B2 run in parallel it
  would have been a merge conflict on generated data instead of a reviewable
  commit (`b2da640` fixed it).
- The base-SHA assertion text was load-bearing: five of five worktrees were
  created at `origin/main`, and all five self-corrected only because of it.

## Open decisions for the user (not the planner)

- Merge order. Whichever branch merges second must first update
  `EP_WEIGHTS_SOURCE_BY_SPEC` in the fork's `upgrades/data/data.ts`
  (ticket 168) — B adds p3 weights, the tab still names the p2 file.
- Push the fork clone's `w/a2-162-v1` (and its pin) somewhere durable.
- SME §9.6: 157's newly admitted librams have unimplemented procs in the
  pinned sim and render as plain losses (ticket 171). The orchestrator's view
  is that this re-opens "would a ret trust this?". No verdict file was edited.

## What the next plan should pick up first

Ticket 172 — nothing in `pnpm verify` compares a committed universe against
a regen. That gap is what let deviation-list item "leak into feral" reach a
committed artifact two commits after 154 fixed the same class of drift. It
is cheap and it closes the failure mode this whole sweep kept tripping over.

Then, in no particular order: 156's 20-candidate table (needs a real
foregrounded browser), 162 v2 (only if wanted), 165–167 (fork test
visibility / drift-gate robustness), 169–174.

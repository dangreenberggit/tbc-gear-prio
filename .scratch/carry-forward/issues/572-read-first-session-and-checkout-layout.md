Status: blocked
Type: task
Origin: owner request, 2026-10-07T01:32Z (`.scratch/stage-gate/558-p3-settings-gates/decision-log.md`, line 103, gitignored, owner's checkout)
Blocks: none
Blocked by: none
Priority: BLOCKING — the owner rules on Q-session-layout before the next orchestration session opens
Related: 558, 560, 564, 565

# READ FIRST: session and checkout layout (Q-session-layout)

`Status: blocked` because only the owner can move it (`docs/agents/issue-tracker.md`, "`blocked`").

## Owner's words

From `decision-log.md` line 103 (owner's checkout, `.scratch/stage-gate/558-p3-settings-gates/`):

> Wow this git situation got even more confusing , not less. Not sure how to more cleanly open seasons just for that repo while still maintaining reference access to the tbc gear prio and original fork repos

> Make a brief ticket about this , make sure it's more noticable than other tickets and has the details you've gathered so far

## The layout today

Four checkouts, as two pairs. Branch and short HEAD from `git -C <path> rev-parse --abbrev-ref HEAD` and `rev-parse --short HEAD`, measured 2026-10-08T14:47Z:

| Folder | Branch | HEAD | Role |
| --- | --- | --- | --- |
| `C:/Users/dgree/Code/lulz/tbc-gear-prio` (owner's copy) | `dev` | `b4bc9475` | untouched by 558 |
| `…/tbc-gear-prio/vendor/tbc-new-fork` | `feat/upgrades-tab` | `cb5610677` | the old tab |
| `C:/Users/dgree/Code/lulz/tbc-gear-prio-wt-react-port` (port worktree) | `feat/upstream-react-port` | `7966f7ca` | all 558 main-repo work |
| `…/tbc-gear-prio-wt-react-port/vendor/tbc-new-fork` | `feat/upgrades-tab-react` | `b2851da58` | all React tab work |

Each pair is one git repository: `git rev-parse --git-common-dir` in the port worktree gives `tbc-gear-prio/.git`, and in its fork worktree gives `tbc-gear-prio/vendor/tbc-new-fork/.git`. So every branch is visible from both folders of a pair.

Sessions open in the owner's copy and work in the port worktree by full paths. Stage records (`.scratch/stage-gate/`, gitignored) and handoffs (`.scratch/handoffs/`, untracked) live in the owner's copy.

**Junctions.** Two folders under the port worktree's `vendor/` are junctions into the owner's copy: `atlasloot` and `wowsimcli-17a8fb28c5ad14b649acecdaacd488594048f467-win32-x64` (`cmd //c "dir /AL C:\Users\dgree\Code\lulz\tbc-gear-prio-wt-react-port\vendor"`). Deleting through a junction deletes the owner's copy of the files. Remove a junction only with `cmd //c rmdir <path>`.

**Merge state.** Nothing from 558 is in `dev` or pushed: `git -C C:/Users/dgree/Code/lulz/tbc-gear-prio merge-base --is-ancestor 7966f7ca dev` gives rc 1, and `git branch -r --contains HEAD` prints nothing in the port worktree or its fork worktree.

**Ticket ids.** `dev`'s `NEXT` reads 559 (`git -C C:/Users/dgree/Code/lulz/tbc-gear-prio show dev:.scratch/carry-forward/issues/NEXT`); the port branch's reads 573. The port branch has used 559 to 572, so a ticket filed on `dev` before this branch merges reuses an id.

**Memory.** Claude memory is kept per session folder. `ls C:/Users/dgree/.claude/projects/` has `C--Users-dgree-Code-lulz-tbc-gear-prio` and no folder for the port worktree, so a session opened in the port worktree starts with no memory notes.

## Clutter

Seven `C:/Users/dgree/Code/lulz/tbc-gear-prio-*` folders besides the port worktree (`ls -d`), checked against `git -C C:/Users/dgree/Code/lulz/tbc-gear-prio worktree list` and `git branch --merged dev --list <branch>`:

| Folder | Git worktree? | Branch | Merged into `dev`? |
| --- | --- | --- | --- |
| `tbc-gear-prio-worktrees/` | no (holds one worktree, next row) | — | — |
| `tbc-gear-prio-worktrees/subagent-foreground-helpers` | yes | `feat/subagent-foreground-helpers` | no |
| `tbc-gear-prio-wt-job-row` | no; plain files, no `.git` | — | — |
| `tbc-gear-prio-wt-layout-gate` | yes | `feat/layout-gate-merge-to-dev` | yes |
| `tbc-gear-prio-wt-node22` | no; empty | — | — |
| `tbc-gear-prio-wt-ret-p3-data` | yes | `feat/ret-p3-data` | yes |
| `tbc-gear-prio-wt-salvage-docs` | yes | `phase-1/w-salvage-docs` | yes |
| `tbc-gear-prio-wt-sweep-ret` | yes | `feat/sweep-ret-tickets` | yes |

`git worktree list` also shows 10 worktrees under `tbc-gear-prio/.claude/worktrees/` and 2 under `tbc-gear-prio/.scratch/`. `ls C:/Users/dgree/.claude/projects/` has 11 `C--Users-dgree-Code-lulz-tbc-gear-prio--claude-worktrees-*` folders. Nothing has been deleted.

## Needed from the owner: Q-session-layout

**A, keep as is.** Nothing changes. Memory, stage records and handoffs stay in one place. Sessions keep opening in one folder and working in another by full paths, which is the confusion the owner named.

**B, open sessions in the port worktree, with the owner's copy added as a second folder.** The desktop app supports extra folders. Sessions then open where the work happens. The cost: the port worktree gets a new, empty memory folder unless the notes are copied or linked, and new stage records would land apart from the P1-P3 records in the owner's copy.

**C, run P1's planned hand-back, and add a clearly named reference copy of `dev` and the old fork branch, for example `tbc-gear-prio-ref-dev`.** The hand-back is P1 `plan.md:21` (owner's copy, `.scratch/stage-gate/558-upstream-react-port/plan.md`): remove both worktrees, switch the owner's fork clone to `feat/upgrades-tab-react`, clean the old branch's ignored leftovers, reinstall and rebuild, switch the owner's copy to `feat/upstream-react-port`. The result is one working copy with memory and records in place. The costs: the owner's copy leaves `dev`, and the steps need care (the two junctions, the leftover clean-up, `npm ci`, `make proto`). The worktree removal needs both trees clean and no stage running; both held at 2026-10-08T14:47Z.

The session recommends C. The owner has not chosen.

## Done when

- The owner has chosen A, B or C, and it is applied.
- The owner has ruled on each folder in § Clutter.
- If the layout changed: the handoff and AGENTS.md "The forked tab repo" say where sessions open. AGENTS.md edits need the owner's approval first (AGENTS.md "Writing for agents").

## Order

Settle this before the next orchestration session opens, because the answer decides where that session opens. Recommendation, not a gate.

Where the work stands, from the owner's checkout `.scratch/stage-gate/`:

- **P3 (ticket 560) is finished.** Final Gate C passed and 560 closed (`558-p3-settings-gates/decision-log.md:163`). The branch is merge-ready by the gate: `pnpm merge-to-dev --check-only` rc=0 at `ddfb3116`; `7966f7ca` adds a ticket note only (`:205`).
- **The hand-back is the next step**, before the merge ask. The session has put Q-568-option, Q-568-keep-edits and Q-handback to the owner, then the merge (`:205`). Option C is that hand-back plus a reference copy, so answer Q-session-layout together with Q-handback.
- **Ticket 564 is closed** and ticket 565 (TanStack table and virtual rows) was filed from it (`564-tab-state-zustand/decision-log.md:83-84`). 565 is open; the owner wants it run in its own session (`558-p3-settings-gates/decision-log.md:202`). That session opens wherever this ticket's answer says.

# Handoff — upgrades-tab finish line

Rewritten 2026-09-14 by the orchestrating session, after Chunk 1 merged.
Supersedes the 2026-09-13 version. Chunk 2 is next.

Plan: `.scratch/plans/upgrades-tab-finish-line.md` (revision 1).

## State right now

| Thing | Value |
| --- | --- |
| Core branch | `dev` at `7dea165d`, tree clean, **25 commits unpushed to origin** |
| Chunk 1 | **done, reviewed, merged** (`feat/upstream-catchup-chunk1`, 11 commits) |
| Engine pin | `17a8fb28c5ad14b649acecdaacd488594048f467` = upstream `master` = tag `v0.0.137` |
| Watched ref | `master` (the dead `feature/backend-reforge` is gone) |
| `sync_wowsims.py --check` | **rc 0, `in sync.`** — the failure that motivated Chunk 1 |
| Fork clone HEAD | `2781486d6b324c3092c0c5dcd51a26bbb7103d78`, branch `feat/upgrades-tab`, clean |
| Fork remote | `5e9013b78…` — **the merge tip is NOT pushed**, `pushed: false` |
| `pnpm verify` | rc 0 |
| Open tickets | 115 |
| Chunks 2–5 | not started. **Chunk 2 is next** (desktop-transport gate, stage-gate) |

### The one thing to do before anything else

**Ask the owner to push the fork.** `data/sim-implemented-effects.json` embeds
fork commit `2781486d6…`, which exists on one disk. Nothing in `pnpm verify`
notices — `git ls-remote` appears in no executable file and the `pushed` flag has
zero code readers. ADR-0030 Consequence 4 accepts this risk; ticket 355 was filed
when it bit. A fresh clone cannot reproduce the committed artifacts until that
push happens.

Pushing is owner-authorised, historically an explicit ask. Afterwards set
`pushed: true` and verify with the `ls-remote` above — never trust the flag.

## What Chunk 1 changed that later chunks should know

**The engine moved 82 commits.** One behaviour change is user-visible and
recorded in `docs/adr/0033-upstream-is-master-again.md` Consequence 5: upstream
fixed a bug where one-handed weapons received Two-Handed Weapon Specialization's
damage bonus. Measured at −80.35 DPS on a 1H main hand (3σ band 2.16) versus
−0.67 on the committed 2H skeleton. **Ret rankings now score 1H weapons ~80 DPS
lower relative to 2H**, and any previously published 1H-vs-2H ranking was
inflated on the 1H side. The ADR carries the binaries, input, seed and numbers
inline, so it is re-runnable without the gitignored working note.

**Several other engine changes were not measured**, and Consequence 5 names them
without claiming magnitudes: Seal of Vengeance 15→20 PPM, Justicar 2pc and
Lightbringer 4pc `Pct`→`Flat`, a proc-suppression pass across seals, metagems and
weapon enchants, and five ret talent conversions. If a ranking shifts
unexpectedly, that list is the candidate set.

**Upstream's own P3 BiS sets moved** for mage and shadow priest (Consequence 6).
The committed universes track it.

**`pnpm verify` does not prove the pin state.** Its chain ends in
`upstream-drift:warn`, which returns 0 on every branch. Run
`python scripts/sync_wowsims.py --check` by hand and read its line.

**The local test fixture is still stamped `simVersion ec5c5f2`** — the old pin.
So a green verify is not engine evidence at the new pin. Re-recording it is an
open decision nobody has taken (ADR-0033 Consequence 7).

## Ticket 386 is now closeable — but it is the owner's call

The previous handoff said Chunk 1 would make `docs/upgrades-tab-scope.md`'s
done-condition 3 satisfiable *as written*, and instructed the next session not to
reword it. Both halves now hold: both pins name a `master` sha at or after the
PR-385 merge (`17a8fb28`), and `--check` exits 0. Verify before closing:

```
python -c "import json;w=json.load(open('data/wowsims.lock.json'));f=json.load(open('data/wowsims-fork.lock.json'));print(w['commit'][:12], list(w['watchedRefs']), f['branchedFrom'][:12])"
python scripts/sync_wowsims.py --check; echo rc=$?
```

## Chunk 2 — desktop-transport gate (stage-gate session)

Read the plan's Chunk 2 section in full. Why stage-gate: the deliverable is a
gate other work relies on, and the failure mode is a false "works on desktop"
claim. Two things make a false pass easy — the embedded build has **no precedent
on this machine**, and the tab silently falls back to the WASM runner when its
transport probe fails, so a gate that only trusts the tab's own choice can pass
on the fallback. The plan's step 5 acceptance is built to make that impossible
(assert the runner class *and* observe `/bulkSimAsync` traffic).

Chunk 2 also owns the durable CDP harness. A working throwaway driver exists at
`.scratch/stage-gate/upstream-catchup-chunk1/ret-p5-run.mjs` — promote it rather
than starting over. Read that directory's `README.md` first; it explains what the
leftover files are.

**One measurement Chunk 2 should want:** a full ret P5 run on the WASM page takes
**~32 minutes** (601 candidates × 5000 iterations, priced individually because
the fork's bulk-screening branch engages only on the HTTP transport). The desktop
path is where bulk screening actually runs, so the same work may be far faster
there — untested, and worth measuring early since it shapes what any future
regression can afford.

## Preconditions before touching the fork

The fork clone is a single shared working tree. One registered worktree
(`tbc-gear-prio-wt-layout-gate`) reaches it by symlink — same index, same HEAD.
**Ask** whether any session is live in a worktree; registration does not tell you.
Ticket 149 tracks the sprawl (eight copies of this repo exist).

Both trees clean, fork HEAD equal to the lock, before any fork work.

## Environment traps this session actually paid for

- **`cd X && git ...` fails.** fnm emits an error that breaks the chain — also
  breaks `cd X && grep`. Use `git -C <abs path>`. Bare `pnpm` fails too (Node 20
  in tool shells): `fnm exec --using=22 -- pnpm.cmd <cmd>`, as its own command.
- **A pipe reports the last command's status.** Append `; echo "rc=${PIPESTATUS[0]}"`
  in the *same* call. A later tool call is a new shell and has lost it.
- **`git add <paths>` does not scope a commit** — lint-staged sweeps everything
  dirty. `git status` before every commit.
- **Repo-wide recursive greps match eight worktree copies** and can time out.
  Scope to a named directory.
- **Ticket collisions:** use the strict `^39[0-9]-` form. A bare `^39` matches
  ticket 39 and gives a false positive. `NEXT` is 397.
- **Prose must pass prettier** (`.scratch/` is ignored; `docs/` is not). This bit
  twice — both times on a review file.
- **A same-length edit reverted within the same second** can leave a stale `.pyc`
  in use, so a "restored" run reports mutated behaviour. Use `python -B`.

## Two lessons worth carrying

**Don't defer tickets you could close.** The review filed six findings; the owner
pushed back that the orchestration system already says open issues block the
merge, and that "the branch's plan didn't ask for it" is not a valid reason to
defer. Four of six were small, known fixes and should have been done in the same
session. All six were closed before this merge. The test is not "is it in scope"
— it is "is it small, do I know the fix, and does leaving it undone weaken
something this branch claims?"

**Design the test from the question.** Chunk 1's plan specified a full-tab
ranking regression — 5 runs before, 3 after, noise bands, ~3.7 hours — and it was
withdrawn as wrongly shaped, not merely slow. Ranking is an unstable derived
observable, so the entire statistical apparatus existed to manage instability a
better observable never produces. The replacement asked "did the engine's numbers
change?", simmed one fixed gear set per pin at a fixed seed, and answered it in
25 seconds *with a cause attached*. Two attempts to shrink the original (fewer
repeats, fewer iterations) were both the same error in a smaller package.

## Do not

Push the fork or merge to `main` without the owner's explicit ask. `main` only
receives `dev` when a PLAN.md §14 phase gate is checked off in
`docs/verification-log.md`. Never `TBC_ALLOW_DEV_MERGE=1`, never a raw
`git merge` into `dev` — `pnpm merge-to-dev` is the only door.

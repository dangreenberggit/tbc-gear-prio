Status: open
Type: defect (orchestration seat guard rejects a correct spawn)
Origin: stage-gate run `stage-2-close-shortlist-box`, 2026-08-21 — the reviewer
  seat returned `WRONG_MODEL` on a correctly-modelled spawn
Blocks: none
Blocked by: none

# The stage-gate model guard misfires when the session model is Opus 5

## What happened

`gate-reviewer` was spawned with `model: "opus"` named at the call site, exactly
as `.claude/skills/stage-gate/SKILL.md` requires. Its first action returned:

```
WRONG_MODEL: Opus 5
```

The seat was on the right model. Its own guard says:

> your system prompt names your model. If the name does not contain "Opus",
> return exactly `WRONG_MODEL: <model name>` and stop.

`Opus 5` **does** contain `Opus`, so a correct spawn should pass. The seat
applied the check as though it were an equality test against a bare `Opus`, or
read the trailing version digit as a mismatch signal.

Recovered by `SendMessage` — pointing out that the substring test passes — rather
than by respawning, since respawning would have reproduced it.

## Why it matters

The skill treats `WRONG_MODEL` as a hard stop with one prescribed remedy:
respawn with the model named. That remedy **cannot clear this failure**, because
the spawn was already correct. An orchestrator following the skill literally
loops: spawn → `WRONG_MODEL` → respawn identically → `WRONG_MODEL`. The skill's
escape hatch ("a second failure goes to the user") fires on a non-problem, and
the run stalls on a seat that was never mis-modelled.

Cost so far is one round-trip per affected seat, per run.

## Scope — which seats carry it

```
grep -rl 'does not contain "Opus"' .claude/agents/
```

→ `gate-reviewer.md`, `gate-sme.md`. `gate-executor.md` carries the same guard
with slightly different wrapping (line 20). `gate-planner.md` tests for a
different model name and is unaffected — which is why the planner seat ran
clean in the same session.

So **all three Opus seats** are exposed: reviewer, executor, SME. Only the
reviewer has been observed failing; the other two are **untested** against
Opus 5 as of this ticket.

## Not yet established

- Whether the misfire is deterministic or a one-off read. Observed once.
- Whether `gate-executor` and `gate-sme` reproduce it. Both are spawned later in
  this same run, so evidence should arrive without extra work — record it here
  when it does.
- Whether the guard misreads other version-suffixed names (`Opus 4.8`) the same
  way.

## Suggested fix

The guard's intent is to catch a seat that silently inherited the session's
model and bills the wrong lane. That intent is sound; the wording invites an
equality reading. Options, not ranked:

- State the test as a substring check in words that cannot be read as equality:
  *"if the string `Opus` does not appear anywhere in your model name"*.
- Name the accepted values explicitly, version suffixes included.
- Drop the self-check and rely on the call site, which is where the model is
  actually chosen — the guard defends against an orchestrator that forgot to
  name a model, not against the model lying about itself.

Per `AGENTS.md`, changes to skill files and agent definitions are **proposed in
chat and wait for approval** before editing. This ticket is the proposal, not
the change.

Note also: `.claude/agents/` registers at session start only, so any fix needs a
fresh session before it takes effect.

## Process note — how this ticket got its number

This ticket was filed in `1ecd2e5` **in breach of the allocation rule**, and the
breach is recorded here rather than quietly repaired.

`docs/agents/issue-tracker.md` says: read `NEXT`, use that number, and write the
incremented value back *in the same commit*; never allocate by listing the
directory, because two branches doing that pick the same number and merge
cleanly under different filenames (it happened — two 232s and two 233s on
2026-08-19). This ticket was numbered by listing the directory, and `1ecd2e5`
touched no `NEXT`. For six commits the branch carried a ticket numbered 252
while `NEXT` still advertised 246, which is precisely the collision window the
rule closes.

The counter was later reconciled to 256 in `7cf9383`, so the state on disk is
now correct and 252–255 do not collide with anything present. What cannot be
undone from here is the window itself.

Caught by the pre-merge standards axis, 2026-08-21.

## Acceptance

- [ ] A decision on which of the three fix shapes to take (or another).
- [ ] The guard reworded in all three Opus seat files, or removed.
- [ ] Confirmed in a fresh session that a correctly-modelled Opus seat runs
      without returning `WRONG_MODEL`.
- [x] This ticket records whether `gate-executor` / `gate-sme` also misfired.
      → **Neither did, but the run does not test the guard.** All three seats
      were spawned with a pre-emptive correction in the prompt telling them the
      substring test passes on "Opus 5". `gate-executor` and both `gate-sme`
      seats ran clean. That is evidence the **workaround** holds, not evidence
      the guard is sound — the guard was never allowed to fire. A fresh session
      without the correction is still what would test it.

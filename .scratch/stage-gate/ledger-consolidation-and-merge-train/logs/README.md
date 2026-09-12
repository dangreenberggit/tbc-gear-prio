# Agent work logs — why this directory exists

Every seat and subagent working this stage writes a durable log here.

**These logs are not written for the orchestrator to read in full.** The
orchestrator deliberately keeps its context thin so it can judge gates. The logs
exist so that a **fresh agent with no context** can pick up abandoned or
interrupted work and resume it without re-deriving what was already measured.

## Why this became a rule

Two things forced it in this stage:

1. **`SendMessage` is disabled in this environment.** A spawned agent cannot be
   resumed or asked a follow-up question. Its in-context work is unreachable the
   moment it stops. When a Planner seat produced a ~20KB revision and the write
   to disk did not happen, the text existed only in that agent's context and a
   fresh spawn of the same seat correctly refused to reconstruct it — inventing
   SHAs would have been worse than refusing. The only reliable carrier between
   agents is the filesystem.
2. **A reviewer read a stale `plan.md`** because it started before a write
   landed, and reported confidently against revision 1 while revision 2 was the
   subject. It caught its own mismatch only because its prompt told it to check.
   A log stating "reviewed against plan.md at hash X, mtime Y" makes that class
   of error visible instead of silent.

## What a log must contain

Write it **as you go**, not reconstructed at the end.

- **Date, and the exact state you worked against** — branch, HEAD SHA, and for a
  file you reviewed, its hash or mtime. State what you measured, not what you
  assumed.
- **What you were asked**, in one short paragraph, in your own words.
- **Every command you ran, with its real output**, trimmed to the lines that
  mattered. Not a summary of the output — the output. Per `AGENTS.md`
  § Durable claims, a causal claim points at a re-runnable command or says
  `hypothesis` / `untested` in the same sentence.
- **What you concluded from each**, and which conclusions are judgement rather
  than measurement.
- **Anything you could not verify, and why.** A permission denial, a missing
  binary, a network failure. Name the exact blocked command.
- **Every dead end**, so the next agent does not repeat it. This is the highest
  value part of the log and the part most often omitted.

## Naming

`<what-you-were-doing>.md` — e.g. `plan-review-round2.md`,
`exec-phase-a.md`. One file per agent invocation. If you resume someone else's
abandoned work, append to their file with a dated heading rather than starting a
new one, so the whole thread of that task stays in one place.

## What NOT to put here

Not a transcript dump. Not the full contents of files you read — cite the path
and the lines. Not the final report itself; that goes to the orchestrator and,
where the stage-gate skill requires, into `plan.md` / `plan-review.md` /
`execution-report.md` at the stage root.

Status: open
Type: task
Origin: docs/reviews/phase-2-trust.md (spec axis)
Blocks: phase-3
Blocked by: none

# `docs/verification-log.md`'s ret-universe diff claim does not reproduce

`docs/verification-log.md:1386-1389` states:

> `data/universes/ret-p*.json` grew by additions only — p2 +5, p3/p4/p5 +3,
> zero deletions, no existing row altered

Re-run against the actual merge-base:

```bash
git diff dev...phase-2/trust --stat -- data/universes/ret-p2.json data/universes/ret-p3.json data/universes/ret-p4.json data/universes/ret-p5.json
```

Measured (2026-08-09, at the `phase-2/trust` tip that landed this ticket):

| file | insertions | deletions |
|---|---|---|
| ret-p2 | 845 | 366 |
| ret-p3 | 1697 | 624 |
| ret-p4 | 1811 | 689 |
| ret-p5 | 2210 | 827 |

Every file has substantial deletions — the "zero deletions, no existing row
altered" claim is false as written. The pre-merge review's spec axis further
reported (not independently re-verified line-by-line by this ticket, but
plausible from the diff shape) that ~11-12 rows per file lost a `["BiS"]`
`bisTags` entry with no `bisSets` replacement, meaning items that were
BiS-tagged on `dev` may carry neither tag on `phase-2/trust`.

`.scratch/phase-2/spec.md:84` says: *"If feral's work does change a
`ret-p*.json` byte, that is a finding to report"* — a byte-level change did
happen, and it was reported, but the report's numbers don't match the diff
they claim to summarize.

## Why this matters

AGENTS.md's durable-claims rule: a causal/factual claim in a committed
artifact must point at a re-runnable command. This one does point at one
(`git diff phase-2/trust~1...phase-2/feral --stat`, per a different part of
the log) but that command is now dead — the ref moved under later merges
(also see ticket-worthy: the command doesn't resolve on the current branch
history). The claim was apparently generated from a stale or different
diff and never re-checked against the merge-base actually being described.

## What to do

1. Re-run the diff-stat above against the real merge-base.
2. Diff the actual JSON semantically (not just `--stat`) to find every row
   whose `bisTags`/`bisSets`/`sources` changed, not just added rows.
3. For any row that lost a `["BiS"]` tag with no replacement, decide: is
   that intended (the tag moved to `bisSets`, a genuine correction) or a
   regression from the phase-3 vendor-slice merge (`c3d66b4`) landing rows
   with `origin:"db"` that clobbered curated fields?
4. Correct or retract the verification-log claim; if the BiS-tag loss is
   real and unintended, that is a separate, more urgent finding — file it
   and reference this ticket.

Status: closed
Type: task
Origin: docs/reviews/phase-2-trust.md (spec axis)
Blocks: phase-3
Blocked by: none
Resolution: claim retracted and replaced with a keyed measurement in
  `docs/verification-log.md`. The BiS-tag loss escalation in step 4 does not
  apply — it is the intended carry-forward 47 §1 fix. 2026-08-09.

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

## What was done (2026-08-09)

Measured with a keyed (by `itemId`) comparison, not `--stat`, against
`$(git merge-base dev phase-2/trust)`:

| file | entries base → tip | added | removed | altered |
|---|---|---|---|---|
| ret-p2 | 230 → 240 | 10 | 0 | 230 |
| ret-p3 | 356 → 394 | 38 | 0 | 356 |
| ret-p4 | 403 → 441 | 38 | 0 | 403 |
| ret-p5 | 484 → 534 | 50 | 0 | 484 |

Findings against the ticket's four steps:

1. Done. The "+5 / +3" counts were wrong (real: 10/38/38/50) and so was
   "zero deletions, no existing row altered" — no row was *deleted*, but
   *every* surviving row was altered.
2. Done. Altered rows break down as: `sources` on 100% of rows (each gained
   an `origin` field — this is the phase's provenance work and explains the
   whole 1473-row count on its own); `curatedSets` added on 23–26/file;
   `bisTags`/`bisSets` on 11–14/file.
3. **Intended, not a regression.** The 11 (p2) / 12 (p3–p5) rows that lost
   `["BiS"]` with no `bisSets` replacement are exactly those whose
   `curatedSets` are `p1` / `preraid` only — curated for a stage earlier than
   the one being ranked. `bis_set_labels_for_max_phase`
   (`scripts/assemble_universe.py:360`) deliberately scopes the BiS claim to
   the current stage; this is the fix for carry-forward 47 §1, whose docstring
   names the exact symptom (a phase-5 ret list badging Justicar T4 and five
   pre-raid pieces as BiS). The rows keep `curatedSets`, so provenance
   survives — only the expired verdict is withdrawn. Not a
   `origin:"db"` clobber from the phase-3 vendor slice.
4. Log claim retracted and replaced. **No follow-up finding filed** — step 4's
   escalation was conditional on the BiS loss being unintended, and it is not.

One sub-claim in this ticket's own "Why this matters" is also wrong: it says
the log's `git diff phase-2/trust~1...phase-2/feral --stat` command "is now
dead / doesn't resolve on the current branch history". Both refs resolve
(`phase-2/trust~1` = c5ef1cc, `phase-2/feral` = ce5133b). That command was
never the source of the bad numbers — it describes a different diff
(feral's slice vs its own merge-base) in a different section. Ticket 82
covers the staleness risk in that command.

# Pre-merge review — fix/merge-ready-disposition-parser

Reviewed range: `fc98fdc4d3ecc2bc330ad2e2884967a86fe3ef5e..144ef58105c4d8f2769fc7c709588558a0332387`
Reviewed range: `144ef58105c4d8f2769fc7c709588558a0332387..632cd8e6f243f26682ce01572a7e32bc3fdb44d0`
Reviewed range: `632cd8e6f243f26682ce01572a7e32bc3fdb44d0..07efe1e` (round 3)

Three axes, fresh context each, one parallel batch (Opus, effort medium;
`codex` not on `PATH`). Round 2 covers the single commit that fixes round 1's
blocking finding. Round 3 covers the five commits added after round 2 was
written: three stage records, the comment-policy fix, and a steering-file
change. Every commit on the branch now sits inside a reviewed window.

The branch closes tickets 85 and 381 — the two holes in
`scripts/check_merge_ready.py`, the gate that decides whether a branch may
merge to `dev`. 85: the parser read only the first `## Disposition` section
and a heading with trailing text matched nothing, so rows in later sections
were skipped while the gate printed `merge-ready: ok`. 381: the row regex
matched its third cell against `(fixed|defer|wontfix)`, so a row with any
other word failed the whole pattern and vanished, leaving the
`unknown disposition` branch unreachable from a table.

## Adversarial

**One blocking finding, and it was the same class of defect this branch
exists to eliminate.** A1: `ROW_SHAPED_RE` allowed leading whitespace and the
unparsed test stripped the line before matching, but `DISPOSITION_RE` demanded
`^|`. A Markdown-legal indented row therefore counted toward the denominator,
matched neither `rows` nor `unparsed`, and the all-clean branch printed
`merge-ready: ok` over it. The axis proved it end to end: an indented `defer`
with no ticket path, and an indented `deferred` typo, both exited 0 while
printing `0 parsed of 1 row-shaped lines`. Two further shapes shared the
cause — a trailing-whitespace row and a dash-only-id row.

Fixed in round 2 (`632cd8e`), and the fix closes the class rather than the
instance: the row pattern tolerates surrounding whitespace, the row loop and
the candidate walk now share one classifier instead of two separately-worded
rules that could disagree, and `check()` computes
`candidates - parsed - unparsed` and fails when it is positive. Re-measured
after the fix: both leak fixtures now fail correctly, and the corpus reports
854 rows of 867 candidates, 13 unparsed, **0 leaked**.

A2 (informational, not a defect): `merge_to_dev.py` runs `pnpm run verify` as
a subprocess and then calls `check_merge_ready.check(...)` in-process, so the
self-test now inside `verify` exercises a different interpreter from the one
that gates the merge. Harmless — no shared state, no import-time side
effects — but it validates less than its placement suggests.

Everything else survived scrutiny. Line-number arithmetic: all 13 unparsed
entries across the real corpus report a line whose content matches exactly,
and the duplicate-row case yields distinct numbers where the naive
`str.index` approach collapses both. Escaped pipes: `_row_cells` splits on
`(?<!\\)|` correctly and a `defer` note's ticket path survives. Test theatre:
11 reverted behaviours mutation-tested against a scratch copy outside the
repo, 9 killed by the check that targets them, no check tautological and none
passing against the pre-fix parser. The two survivors were an unreachable
escape-handling path and the duplicate-unparsed-line arithmetic, which no
check covered — now covered.

## Domain

**Clean — no rows.** The game-fact axis is inapplicable: the diff contains a
Python markdown parser, its self-tests, two ticket files, a traps doc, a
skill file and its mirror, and one `package.json` line. There is no item,
stat, sim, EP weight, phase or slot logic anywhere in it, and the axis
declined to manufacture findings against a brief that does not reach.

The effort went to the domain the change does belong to — the repo's own
review-and-merge process — and every claim re-measured independently
reproduced. Ticket 381's Resolution corrects the ticket's own census, so that
correction was the main risk: measured against both the branch parser and the
merge-base parser, there are 15 out-of-vocabulary rows in 8 files, 9 of them
"no findings" in exactly 4 spellings and 6 decorated real dispositions.
Corpus 749 → 854 of 867. All four per-file pairs match. The "never gated
again" claim holds for all 8 files. `known-traps.md` matches the code,
including its two honest "not handled" caveats, both independently confirmed
at zero instances. Ticket 85's Q3 answer checks out, proof file present.
Mirrors byte-identical.

One observation, no action: 3 of the 9 historical no-finding rows are
concerns that were raised and then checked — exactly the case the new skill
sentence says should be `wontfix`. Leaving them unrewritten is deliberate and
documented, and those branches are merged, so nothing is owed. The rule is
prospective.

## Standards + Spec

**Standards.** Two hard comment-policy violations, both deletions rather than
correctness problems: comments that restate their code (`ROW_SHAPED_RE`, the
first line of `_is_header_or_separator`'s docstring, and a duplicated
`SECTION_RE`-level-2 note), and the same rationale prose repeated verbatim at
three sites for both the escaped-pipe and the 5-column cases. The majority of
the new comments do carry non-obvious constraints and are compliant; the
problem is volume and duplication.

The one smell worth acting on was **Duplicated Code** in `scan_disposition`:
the body was walked twice by two independent paths that each re-implemented
the header/separator skip in different terms, so the two filters could drift
apart. That is not merely a smell — it is the root cause of A1, found
independently from the other direction. Fixed in round 2 by sharing one
classifier. Lesser judgement calls: `list[dict]` rows are Primitive
Obsession, and `parse_disposition` is a deliberate, documented Middle Man.
Commit messages, durable claims, the skill mirror and the verify wiring were
all clean.

**Spec: pass.** Every executable Acceptance clause re-run rather than
trusted, at the exact figures the plan forbade adjusting — dedup 59,
candidate-pool 56 of 66 with all ten unparsed line numbers matching, worn
15→17, touchpoints 15→16, exactly 30 checks at the time of review, the Step 7
greps, and `--list-only` no longer listing either ticket. Both tickets'
acceptance boxes are genuinely earned by shipped behaviour. The Step 7
sentence is word-for-word what the plan authorised, one hunk, no other skill
line changed. Nothing in `## Out of scope` was done.

The axis judged all five reported deviations sound: the `.agents/` mirror
edit is required by the byte-compare gate and is identical; ticket 381
genuinely had no `map.md` line, and writing one is more faithful to Step 9's
intent than skipping it; the plan's `## Expected failures` table mis-stages
the unknown-disposition FAILs at "step 3+" when `check()`'s `else` branch was
already live, which is the plan's error and harmless; Step 4's "outside the
repo" fixture instruction is unsatisfiable because `check()` calls
`review.relative_to(ROOT)` and raises, and the permanent `CHECKS` coverage is
stronger than the deleted scratch file anyway; and seven commits for eleven
steps meets "a commit per green slice".

## Round 3 — `632cd8e..07efe1e`

Two axes ran: adversarial and standards/spec. The domain axis was not run and
writes no Disposition row. The range touches a gate script, a steering file and
three stage records, so it has no game-domain content, which is the same reason
round 2's domain axis returned clean.

**One blocking finding, and it stopped the gate this branch exists to fix.**
`dd03c8e` closed ticket 382 while row S2 above still dispositioned it `defer`.
`check_merge_ready.py` requires a `defer` ticket to be open, so the gate
returned rc 1, and `merge_to_dev.py` calls that same function. Reproduce on any
commit from `dd03c8e` to `07efe1e` with
`python scripts/check_merge_ready.py --review docs/reviews/fix-merge-ready-disposition-parser.md --branch fix/merge-ready-disposition-parser`.
Row S2 now reads `fixed`, which is what happened. At the current tip that
command reports 13 rows parsed of 13 and `merge-ready: ok`, rc 0.

**The steering-file commit broke two of the rules it added.** `651ec19` added a
commit-message section to `docs/agents/home/AGENTS.md`: default to
subject-only, six-line soft maximum, no confidence claims about untested
behaviour. Its own body was a single unwrapped 133-character line, against rule
6 quoted three lines above the inserted text. It stated "median 12-15 lines
against an upstream median of 6-10" with no re-runnable command and no named
upstream repository. That figure also disagreed with this branch's own
measurement of 12 at `HANDOFF.md`. The body was reworded by amend, producing
`07efe1e`.

**Three stale facts in `HANDOFF.md`**, the document written to be trusted by a
fresh agent: `HEAD` given as `32e92e6`, `dev` given as `bb647e8`, and
`--check-only` asserted rc 0. `bb647e8` is the worst of the three because it
was never `dev`; `dev` is `fc98fdc`, the branch's own base. All three corrected.

**One missed comment-policy violation** at `check_merge_ready.py:1042`, inside
a function `dd03c8e` otherwise cleaned: a comment restating line arithmetic the
reader does from the string literal above it. Deleted, self-test still 33
checks rc 0.

Verified clean: `dd03c8e` changed no executable line. Ticket 382's four
acceptance boxes are ticked, its Resolution names a re-run command, and
`map.md` names the branch. The three stage records state what they could not
verify.

Two questions the owner answered during this round. The banned-word list
includes "load-bearing", which the repo's own comment policy uses as a term of
art; the owner's ruling is that the word gets swapped for a plain one, and a
sentence with no easy replacement was describing nothing real. The six-line
body maximum collides with record-keeping commits like `32e92e6`, whose 30-line
body holds five separate measured claims. That collision is unresolved and
filed as ticket 383.

One note for the next reader. A PowerShell `Get-Content -Raw` /
`Set-Content -Encoding utf8` round-trip reads existing UTF-8 as cp1252 and
rewrites every em-dash as mojibake. Use the Edit tool for these files.

## Summary

The branch does what tickets 85 and 381 asked, and the measurements behind it
reproduced under three independent re-derivations. The adversarial axis found
one genuine blocker — the fix had reintroduced the silent-drop defect in a
narrower, indented shape — and the standards axis independently found its root
cause as a duplicated-classifier smell. Both are fixed in `632cd8e`, with the
leak invariant now asserted in `check()` and pinned by three new self-tests
(33 total). The remaining findings are comment-policy tidying, deferred as a
ticket rather than churned into this branch's diff.

## Disposition

| ID  | Axis        | Disposition | Ticket / note                                                                                                                                                                                                                                                         |
| --- | ----------- | ----------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| A1  | Adversarial | fixed       | `632cd8e` — indented/trailing-whitespace rows counted in the denominator but reached neither list, passing as `ok`; row pattern widened, one shared classifier, and `check()` now fails on any candidate that reaches neither list                                    |
| A2  | Adversarial | wontfix     | The self-test in `verify` runs in a different interpreter from `merge_to_dev`'s in-process `check()`. No shared state and no import-time side effects, so it is a smaller win than it looks rather than a defect                                                      |
| S1  | Standards   | fixed       | `632cd8e` — the duplicated header/separator classifier in `scan_disposition`, which was A1's root cause, is now one shared function                                                                                                                                   |
| S2  | Standards   | fixed       | `dd03c8e` — comments restating their code and the same rationale repeated at three sites. Filed as `.scratch/carry-forward/issues/382-merge-ready-comment-volume.md`, then fixed on this branch instead of deferred; the ticket is closed                             |
| A3  | Adversarial | fixed       | Closing ticket 382 in `dd03c8e` left row S2 dispositioned `defer` against a closed ticket, so the gate returned rc 1 and `pnpm merge-to-dev` would have failed after paying the full verify cost. Row S2 moved to `fixed`                                             |
| A4  | Adversarial | fixed       | `HANDOFF.md` gave `HEAD` as `32e92e6`, `dev` as `bb647e8` and `--check-only` as rc 0. All three were false at the round-3 tip, and `bb647e8` was never `dev`. All three corrected                                                                                     |
| S4  | Standards   | fixed       | `651ec19`'s body was one unwrapped 133-character line stating two commit-body figures with no re-runnable command, breaking rule 6 and the untested-claims clause the same commit added. Reworded by amend as `07efe1e`                                               |
| S5  | Standards   | fixed       | A comment restating line arithmetic survived `dd03c8e` in `check_merge_ready.py`. Deleted; self-test 33 checks, rc 0                                                                                                                                                  |
| S6  | Standards   | wontfix     | Ticket 382's Resolution heading omits the branch name. `.scratch/carry-forward/map.md` names it on the 382 line, which is the index a reader scans                                                                                                                    |
| S7  | Standards   | defer       | The six-line body maximum has no exemption for record-keeping commits, whose content is one logical act with several measured claims — `.scratch/carry-forward/issues/383-body-cap-vs-record-commits.md`                                                              |
| S3  | Standards   | wontfix     | `parse_disposition` as a Middle Man and `list[dict]` rows as Primitive Obsession. Both deliberate: the shim exists so no caller changes shape, and the row dict is the pre-existing interface this branch chose not to widen                                          |
| Sp1 | Spec        | wontfix     | The plan's `## Expected failures` table stages the unknown-disposition FAILs at "step 3+"; they appear from step 2 because `check()`'s `else` branch was already live. The plan's error, not the code's; recorded here so the next reader does not re-derive it       |
| Sp2 | Spec        | wontfix     | Step 4's "run the fixture outside the repo" is unsatisfiable — `check()` calls `review.relative_to(ROOT)` and raises on an out-of-repo path. Proven from inside the repo instead, and pinned permanently by `check_all_clean_review_is_distinguishable_from_no_table` |

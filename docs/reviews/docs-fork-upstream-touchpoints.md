# Pre-merge review — docs/fork-upstream-touchpoints

Reviewed range: `a2a42954311e08b252070cad4a667d3da9c15355..c2bfa00b954a19eee6de0d3480cc196c94e8ecde`

Dispatch: `codex` is not on `PATH` (`Get-Command codex` → null), so all four
axes ran as fresh subagents on the review lane (Opus), in one parallel batch —
adversarial, domain, and the `code-review` skill's Standards and Spec axes. Every
axis was told it writes nothing.

The branch is documentation only. It folds `docs/fork-upstream-divergence.md`
(session B's answer to ticket 369, framed by merge-conflict risk) into
`docs/fork-upstream-touchpoints.md` (session A's, framed by upstream-PR impact),
deletes the former, repoints two inbound links, updates ticket 369, and reserves
ticket numbers 376–380 for two sibling branches.

## Adversarial

The numeric core holds. The axis independently re-derived the 13/14/15
reconciliation and confirmed it is a genuine **set** comparison rather than a
count match: the 15-set minus the 14-set is exactly `{ui/core/sim.ts}`, the
14-set minus the 13-set is exactly `{test-layout.mjs}`, and the 13 `M` rows match
the Category B table path for path. Pin ancestry is linear (both
`merge-base --is-ancestor` rc 0) and `merge-base bbad1b8a ec5c5f205` returns
`ec5c5f205` exactly.

The `sim_header.tsx` behaviour claim is true at source level: three `!`
assertions and an unconditional `update()` dereferencing `wrap.classList` at
`bbad1b8a4`; all three lookups plus an early return at `5e9013b78`. The axis
judged the document's representation of review finding A3 **honest** — it
paraphrases the finding's own caveat closely and does not overstate it.

The anchor slug is correct under GitHub's slugger, and no inbound reference to
the deleted file survives as a link.

Five defects, all in the periphery rather than the core:

- **A4** — the folded merge-risk table said `schemas/translation.schema.json`
  was "+310 lines" while the same document's Category B row said 309/1. The
  `+310` was a stale figure inherited from the deleted document's older pin.
  Exactly the failure mode the fold exists to catch.
- **A5** — the private-tracker sweep claimed "173 references". The cited
  `git grep -c` sums to 171 matching lines; `git grep -o` gives 178 matches.
  173 is neither. The file count (25) and every spot-checked per-file row were
  correct.
- **A1** — the document's only end-to-end evidence citation points at
  `docs/reviews/fix-sim-header-null-assertion.md`, which exists only on an
  unmerged branch, so a reader on `dev` would hit a dead citation.
- **A6** — the deleted document's fourth column (upstream-candidate/local-only)
  was replaced rather than carried, and three files were re-judged to the
  opposite answer with no note of the reversal. The document flags its _count_
  disagreement with session B but was silent on this one.
- **A7** — item 10's heading still read a bare `50/15` while the table carried
  both figures.

**A2/A3** reported that the document cites `reconciliation.txt` and `map.md`
cites `merge-order.md`, neither tracked. Both are artifacts of the review's
pinned range: step A6, which adds the `.gitignore` allowlist line and writes
`merge-order.md`, had not yet run when the axes were dispatched. Commit
`992de56` tracks the whole stage directory; `git check-ignore -q` on
`merge-order.md` now returns rc 1 and `git ls-tree HEAD` lists both files.

## Domain

Pass with three minor findings, no blocking or material domain error.

Verified true by independent re-derivation: the `ec5c5f2` base (the fork's
history contains exactly one merge commit, `ab59127d9`, so the merge-base is the
right comparison, and ADR-0030:38-40 states the same model independently); the
13 `M` / 122 `A` partition and every `+/−` figure in Category B; the ten
comma-ok guard conversions in `item_sets.go`, with the no-sim-output claim
**correctly hedged** under `AGENTS.md` § Durable claims; the `translation.schema.json`
`required`-array claim (base ends `…, "sidebar"`, head ends `…, "sidebar",
"upgrades_tab"`), which is a sharper and better characterisation than
"additive"; the `item_list.tsx` pure-move verification; the `tsconfig.json`
"measured dead" grep at 0 hits; and the `ab59127d9` quote, which is verbatim and
**not misleadingly truncated**.

- **D1** — the `item_list.tsx` move verification claimed 3030 characters a side,
  and offered a deliberately-stated counter-example that collapsing only spaces
  and tabs gives 3504 vs 3503 and fails to match. Re-running gives 3031 a side,
  and the weaker normalisation gives 3163 a side and **also matches**. The
  conclusion (pure move) is right; the stated normalisation rule was wrong, and
  a reader re-running it would find a match where the document promised a
  mismatch. I re-derived this myself before acting on it.
- **D2** — the observer paragraph said the affordance "must be a
  `MutationObserver`, **not** a `ResizeObserver`". The shipped method wires
  both, plus a scroll listener (`sim_header.tsx:74-76`); the code comment's
  actual claim is narrower — a ResizeObserver alone never fires from
  `addTab()`. As written, the document invited a future merger to delete a line
  that is doing work.
- **D3** — the comment was cited at lines 57–61; it spans 55–63.

On the 13-vs-15 question the axis returned a clear verdict: **13 is right**, and
not a close call once fixed on the document's stated purpose. The owner's
requirement distinguishes new files from modifications to files upstream already
has, and that distinction _is_ the added/modified partition. Counting an added
file in the impact column inflates the number the owner was told to watch;
counting a byte-identical file creates a permanent phantom row. 15 keeps its
value as a reproduction artifact, which is where the document puts it.

## Standards + Spec

**Standards.** Commit messages conform to all seven rules (imperative subjects
≤50 chars, blank line, bodies wrapped at 72, what-and-why not how); the merge
commit is exempt. Durable claims were called "exemplary" — re-runnable commands
inline, inferences labelled, an explicit "What is not claimed" section. Line
endings LF throughout.

Findings: the two dangling-citation items (the A6 timing artifact above); the
`NEXT` 376→381 jump with no ticket files, which inverts the letter of
`docs/agents/issue-tracker.md`'s "increment in the same commit as the new
ticket"; and three judgement calls — the same 13 files tabulated twice in one
document and already disagreeing (the same defect as A4), one 669-line document
serving two audiences, and "the superseded document" used as a backward
reference after a single naming.

**Spec.** Clean. All four brief-mandated survival items are present and located
by heading; all eight plan A4 items plus A5a are implemented; the stale phrase
"throws at runtime if the div is ever merged away" returns no output from
`git grep` on the branch; **no scope creep** — the diff touches exactly the six
files A4/A5a name.

## Summary

Nothing blocking. The document's load-bearing content — the reconciliation, the
per-file judgements, the merge-risk framing, and the `ab59127d9` resolution
record — was independently re-derived by two axes and holds. Five numeric or
framing defects were found, four of them inherited by the fold rather than
introduced by it, and all five are fixed in `7e1378e`. The two "unreachable
artifact" findings were an artifact of the review's pinned range and are
resolved by `992de56`.

The one finding left open is the `NEXT` reservation mechanism, which is
deliberate: it is the plan's own answer to a numbering collision between two
sibling branches, and the residual risk it carries is stated in
`merge-order.md` § Residual risk until the first merge and repeated in the
handoff.

## Disposition

| ID  | Axis        | Disposition | Ticket / note                                                                                                                                                                                                                                                                                                                                                  |
| --- | ----------- | ----------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| A1  | Adversarial | fixed       | The `fix/sim-header-null-assertion` review citation now says it reaches `dev` only when that branch merges, and gives the `git show` that reads it meanwhile (`7e1378e`)                                                                                                                                                                                       |
| A2  | Adversarial | fixed       | Timing artifact of the pinned range: `merge-order.md` did not exist and the stage dir was gitignored when the axis ran. `992de56` writes it and adds the `.gitignore` allowlist line; `git check-ignore -q` → rc 1, `git ls-tree HEAD` lists it                                                                                                                |
| A3  | Adversarial | wontfix     | The renumber is Phase A steps A7/A8 on the two sibling branches, out of this branch's range; the instructions the axis says are missing are `merge-order.md` § Ticket renumber map, tracked by `992de56`. The residual `dev`-window risk is stated there and in the handoff, and the plan cannot write to `dev` to close it                                    |
| A4  | Adversarial | fixed       | `schemas/translation.schema.json` corrected to 309/1 in the folded table; the table now states its counts are measured at `bbad1b8a4` (`7e1378e`)                                                                                                                                                                                                              |
| A5  | Adversarial | fixed       | Tracker sweep now gives 171 matching lines and 178 matches, says which command yields which, and drops the unreproducible 173 (`7e1378e`)                                                                                                                                                                                                                      |
| A6  | Adversarial | fixed       | The folded table now records that three upstream-candidate judgements were deliberately reversed by Category B rather than silently dropped (`7e1378e`)                                                                                                                                                                                                        |
| A7  | Adversarial | fixed       | Item 10's heading now reads `50/15 at bbad1b8a4` (`7e1378e`)                                                                                                                                                                                                                                                                                                   |
| D1  | Domain      | fixed       | 3031 a side; the space/tab-only variant gives 3163 a side and also matches. Re-derived independently before acting (`7e1378e`)                                                                                                                                                                                                                                 |
| D2  | Domain      | fixed       | The observer paragraph now says all three triggers are needed and states the comment's actual narrower claim (`7e1378e`)                                                                                                                                                                                                                                       |
| D3  | Domain      | fixed       | Comment citation corrected to lines 55–63 (`7e1378e`)                                                                                                                                                                                                                                                                                                          |
| S1  | Standards   | fixed       | Same as A2 — both cited artifacts are tracked as of `992de56`                                                                                                                                                                                                                                                                                                  |
| S2  | Standards   | wontfix     | `NEXT` 376→381 with no ticket files is a **reservation**, not an allocation, and is the plan's deliberate answer to two sibling branches having independently allocated 371–373. `docs/agents/issue-tracker.md`'s same-commit rule governs filing a ticket; nothing is filed here. Rationale and the old→new map are in `merge-order.md` § Ticket renumber map |
| S3  | Standards   | fixed       | The two tables disagreed on two figures; both corrected and the folded table now states its measurement base (`7e1378e`). Same substance as A4/A7                                                                                                                                                                                                              |
| S4  | Standards   | wontfix     | One document serving both audiences is the brief's explicit instruction ("one ledger for ticket 369, not two"). Mitigated rather than split: a pointer at the top routes a merge reader straight to the "Merge-conflict view" section (`7e1378e`)                                                                                                              |
| S5  | Standards   | fixed       | The superseded document is now named at first use in both the folded section and Category A, instead of relying on a backward reference (`7e1378e`)                                                                                                                                                                                                            |
| Sp1 | Spec        | n/a         | No findings — all four brief-mandated survival items and all eight A4 items present, no scope creep                                                                                                                                                                                                                                                            |

No finding blocks the merge.

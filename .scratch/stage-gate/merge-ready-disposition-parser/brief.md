# Brief — merge-ready disposition parser

Opened 2026-09-12. Base SHA `fc98fdc4d3ecc2bc330ad2e2884967a86fe3ef5e` on
branch `fix/merge-ready-disposition-parser`, cut from `dev`.

## Goal

`scripts/check_merge_ready.py` reads every Disposition row in a review file, or
fails loudly saying which row it could not read. Today it silently reads a
subset, and the gate prints a row count with no denominator, so an under-read is
indistinguishable from a complete read.

This gate is the last automated check before a merge to `dev`. Its contract is
that every `defer` row points at open work. It can currently satisfy that
contract by not looking.

## The two defects

Both are open tickets, committed on `dev` at the base SHA above.

**Ticket 85 — the section anchor.** `parse_disposition` uses `re.search`, which
returns only the first `## Disposition` section; rows in any later section are
never parsed. Separately, the anchor requires the heading to be followed
immediately by a newline, so `## Disposition (round 3)` matches nothing at all.
Both variants exist in real review files.

**Ticket 381 — the row pattern.** `DISPOSITION_RE` matches the disposition cell
against `(fixed|defer|wontfix)`. Any other word fails the whole row pattern, so
the row is skipped rather than flagged, and the `unknown disposition` error
branch that already exists in the file is unreachable from a table.

They are independent: fixing either leaves the other intact.

## Constraints

- **Verify what you inherit.** The investigation at
  `.scratch/stage-gate/ledger-consolidation-and-merge-train/logs/merge-ready-parser-review.md`
  carries commands and measurements. Treat every one of them as a claim to
  re-derive, not as settled fact. Where it says CONFIRMED it means that agent
  ran it; it does not mean this plan may cite it without running it again.
- **Investigate independently.** Send subagents for anything bounded — regex and
  parser practice, how comparable gates elsewhere report partial reads, whether
  a measurement still holds. Do not reason from this brief alone.
- **Tests use the repo's existing convention**: `--self-test` checks in the
  `CHECKS` tuple of the same file. `parse_disposition` is pure (text in, list
  out), so no new harness is needed.
- **This branch's own review file will be parsed by the parser being fixed.**
  Keep every Disposition row in one table under a bare `## Disposition` heading.
- `pnpm verify` must pass on the tip. Note `pnpm merge-to-dev --check-only` runs
  `pnpm verify` itself — do not run both.

## Open questions

Each needs a candidate that is not the same approach with different constants, a
win condition written down before measuring, and a measurement — or the reason
the committed fixtures cannot measure it. A dropped candidate carries its reason.

### Q1 — does `n/a` become a valid disposition, or does the row change?

Making the row pattern permissive turns on validation that cannot currently
fire. At that moment the one out-of-vocabulary row in the repo —
`| Sp1 | Spec | n/a | No findings ... |` in the touchpoints review — becomes an
error, and that review file fails the gate.

Candidates must differ in kind, not in spelling: accept `n/a` as a no-op
disposition the gate blesses; rewrite the single row to an existing value;
or a third shape the plan argues for (for example, a distinct "no findings"
concept separate from the three dispositions).

**This is owner-facing.** The plan recommends and states the trade; it does not
pick silently. Widening the vocabulary the gate accepts is a standing decision
about what reviewers may write, not a local fix.

### Q2 — is the denominator part of this work?

The investigation argues the root cause is neither regex but the silence:
`disposition rows: 9` reads identically whether it is 9 of 9 or 9 of 61. A
denominator would have made both defects visible without fixing either.

Decide whether that lands here or is deferred, and say why. If it lands, define
what the denominator counts — rows the anchor found, rows matching a looser
row-shaped pattern, or something else — because that choice determines whether
it can detect a future defect of this same class.

### Q3 — does ticket 315 need a human check?

`Sp3` in `docs/reviews/feat-upgrades-dedup-wowsims.md` is a `defer` row naming
ticket 315 in prose rather than as a path. It resolves to no ticket path, so it
would have hard-failed the gate whenever parsed — unlike the other missed rows,
this needs no argument about ticket statuses having moved since.

Determine whether the deferred work was actually done. This is a question about
one ticket's content, not about the parser; it may end in "file a ticket" or
"confirmed addressed, no action". Do not fix the parser and leave it unanswered.

## Out of scope unless the plan argues for it

- **The duplicate-id check** ticket 85 originally suggested. Multi-round review
  files legitimately reuse `A1`/`D1` per round, so failing on a shared id would
  fail nearly every existing review file. If the plan wants ids scoped per
  section instead, it must say so and justify it.
- **Re-litigating the three historical merges.** Whether those gates were green
  at the time depends on ticket statuses as they stood then. It would not change
  the fix, and Q3 covers the one row that needs no such argument.
- Any change to what the gate does *after* parsing — status rules, the relevant
  ticket warning, merge mechanics.

## Done means

- Every Disposition section in a review file is parsed, including headings with
  trailing text.
- A disposition word outside the accepted set fails with a named row id instead
  of vanishing.
- The gate's output makes an under-read visible.
- Self-tests cover, at minimum: two plain sections; a `(round 3)`-style heading;
  one typo'd row among good ones (the silent case); an all-typo'd table (must
  stay loud); a 5-column table.
- Q1 is decided and `docs/reviews/` is consistent with the decision.
- Q3 is answered.
- Tickets 85 and 381 are closed or carry a stated reason for staying open.
- `pnpm verify` passes on the tip.

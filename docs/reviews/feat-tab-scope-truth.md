# Pre-merge review — feat/tab-scope-truth

Reviewed range: `9e86ebcabb9679219d3d795b391dbabfd4f9719f..23c525600ad4d096862396f5df04b58e29d39c7e`

Chunk 0 of `.scratch/plans/upgrades-tab-finish-line.md`. One commit, one file:
`docs/upgrades-tab-scope.md` (+214/−204).

Dispatch: `codex` is not on PATH, so all three axes ran as fresh Opus subagents
at effort medium (the review lane), in parallel, none with access to the
authoring session.

## Adversarial

Essentially clean. Every re-derivable claim in the diff re-derived correctly.

The 115 rows / 115 open tickets result was derived **twice by independent
methods** — once from `pnpm -s issues:open`, once from every ticket file's own
`Status:` line — with both `comm` directions empty each time. All twelve
removals confirmed closed or resolved; no row was dropped for a still-open
ticket. Tickets 124 and 153 correctly kept: both read `Status: open` beneath
trailing text that scans as closed, and their "Why" text tracks the qualifier
rather than the misleading surface reading.

Three findings:

**A1.** The `## Maintenance` rule is an aspiration stated as fact. The doc opens
"This doc is regenerated in the same commit that changes any ticket's `Status:`
line." Nothing enforces it — confirmed twice, via a repo-wide grep for
`upgrades-tab-scope` (hits only the doc and scratch notes) and an enforcement
sweep showing no reference in `.githooks/pre-commit`, `.githooks/pre-push`,
`.github/workflows/`, or any of the 30 checks chained in `pnpm verify`. A future
commit closing a ticket passes every gate with the doc left stale.

**A2.** Definition-of-done condition 2 is not checkable as written. Conditions 1,
3 and 4 each name a command or artifact. Condition 2 wants both transports proven
to "produce the same ranking within noise… with a scripted check a later session
can re-run" — no such script exists or is named, and "within noise" carries no
tolerance.

**A3.** Ticket 366's row understates its own evidence. The row says a panic
"needs a malformed request to fire"; ticket 362 records that panic firing in the
real tab on `/tbc/shaman/enhancement/`, rendering a Go stack trace to an end
user. The adjacent placement is defensible because 362's ours-half is fixed, but
the stated reason is weaker than the tracker shows.

Method note from the axis: an early status tally misread the lister's column
format and briefly made ticket 238 look like an open ticket missing a row.
Re-deriving from the ticket files resolved it — 238 is `resolved` and correctly
has no row.

## Domain

The categorisation is domain-sound. The set-bonus cluster is placed correctly
against ADR-0023: 336 → blocking matches the ticket's explicit "do not credit the
4pc onto the row or touch the sort"; 331 → out-of-scope is right, since
`weightedSetPotentialDps` is report-path only; 86/119 as adjacent matches
decision 6's "left as measured and confounded for now". No row contradicts
ADR-0020, ADR-0026, ADR-0028 or ADR-0031.

**D1.** Definition-of-done condition 3 is unsatisfiable as written. It requires
both pins to name a `master` sha at or after the reforge merge **and**
`sync_wowsims.py --check` to exit 0. The pins name `ec5c5f20…`, a commit on the
branch — `git describe --contains` returns `fatal: cannot describe`, and the
master-side merge is `3163bcfaf`, 80 commits later. The check half is
contradicted by ADR-0030 Consequence 1, which records the permanent
"new release available" warning and points at ticket 354 — filed out-of-scope in
this same doc. Measured: `python scripts/sync_wowsims.py --check` → rc=1.

**D2.** The same run surfaces a second drift line the doc does not account for:
`watched ref feature/backend-reforge: could not resolve … (HTTP 422)`. Upstream
deleted the branch after merging it. Not a defect in this diff — it is the plan's
C1/C4, and Chunk 1 owns it.

**D3.** Row 314 lost half its content and now misdescribes the ticket. It
previously named two sub-concerns, 126 (token/pattern ids) and 328 (styling); it
now names only 328 while still calling itself a **correctness** concern. The TBC
rule that went missing: TMB tracks class tokens and crafting patterns, not the
finished gear item, so an export of gear item ids yields a loot list TMB cannot
match.

**D4.** Rows 313 and 330 both read "rendered live per ticket 315's Resolution;
waits on owner sign-off", but 330 does not say that. It asks first to determine
what its figure represents (2pc, or the next measurable threshold's — possibly
4pc — value) and states the issue "may be a labeling/data bug, not just copy".
315's Resolution establishes the line renders, not that number and label agree.
Player-facing risk: a 4pc-sized figure labelled as a 2pc step.

**D5.** Judgment call 3's heading still names ticket 335, whose row was correctly
removed; the body no longer discusses it.

## Standards + Spec

**Standards: clean.** No banned vocabulary, commit subject 49 characters,
imperative, capitalised, no trailing period, no attribution lines. The long body
went to an independent reviewer per the repo's own rule, which cut six blocks of
diff-restating narration while keeping the command outputs step 1 mandates.

**Spec:** implemented correctly. All eight acceptance checks pass by measurement:
the twelve `grep -c` → 0; the open-ticket loop prints nothing at 115/115; the
`Transport` column present on every row in all four buckets (7/7, 5/5, 41/41,
62/62); `grep -c 'Stage 3 — the web shell'` → 0; the Maintenance section's loop
byte-identical to the spec's, verified with `cmp` rather than by eye. No scope
creep across all 215 added lines.

**S1.** The `Transport` column carries a fourth value, `n/a`, beyond the three the
spec named (`web`, `desktop`, `both`), and it is the most common value — 62 of
115, against `both` 49, `web` 4, `desktop` 0. Declared in the doc's legend rather
than smuggled in. Recommended for acceptance: forcing a docs-only or CI-tooling
ticket into `web`/`desktop`/`both` would make the column lie.

## Summary

Chunk 0 did what it set out to do, and the coverage claim holds under two
independent derivations. The findings divide cleanly: three are inherited defects
in rows the commit reflowed rather than authored (D1, D3, D4), and they are now
tickets; three are honest limits the doc itself acknowledges (A1, A2, S1).

The one thing a reader should carry forward: this doc has no enforcement. Its
acceptance loop is real and re-runnable, but nothing runs it. Chunk 4's
ticket-close discipline is the natural place to fix that, and A1 belongs in its
scope.

## Disposition

| ID  | Axis        | Disposition | Ticket / note                                                                                                                                                      |
| --- | ----------- | ----------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| D1  | Domain      | defer       | `.scratch/carry-forward/issues/386-scope-doc-done-condition-3-unsatisfiable.md` — Chunk 1 makes it satisfiable; do not reword the condition to match today's state |
| D3  | Domain      | defer       | `.scratch/carry-forward/issues/387-ticket-314-row-lost-its-correctness-half.md`                                                                                    |
| D4  | Domain      | defer       | `.scratch/carry-forward/issues/388-ticket-330-is-not-merely-awaiting-sign-off.md`                                                                                  |
| A1  | Adversarial | wontfix     | Accurate as a finding, but the doc's own next sentence says nothing else catches it. Enforcement belongs to Chunk 4's ticket-close discipline, not to Chunk 0      |
| A2  | Adversarial | wontfix     | Condition 2 names the check Chunk 2 creates (`pnpm desktop-gate:check`). A definition of done may name work not yet done                                           |
| A3  | Adversarial | wontfix     | Placement is correct and the trigger is closed; the row's reason is weaker than the tracker but not wrong                                                          |
| D2  | Domain      | wontfix     | Not this diff's defect. Already the plan's C1/C4; Chunk 1 owns the dead watched ref                                                                                |
| D5  | Domain      | wontfix     | Stale heading naming a removed row. Cosmetic; folded into 386's rewording pass                                                                                     |
| S1  | Spec        | wontfix     | `n/a` accepted as a fourth Transport value. The alternative mislabels docs and CI tickets                                                                          |

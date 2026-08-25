# Pre-merge review — feat/upgrades-ui-pass

Reviewed range: `b9e8011..8764bee` (repo) plus the fork clone's
`d49096e..a9df0a86` (`vendor/tbc-new-fork`, branch `feat/upgrades-tab`).
Fix commits landed after dispatch — repo `4c819e5`, fork `a52fdf83` (the
S1 DPS-unit fix) — verified by the executor's served-page re-measurement
(0 missing units, 0 sign regressions across 240 done-state cells) and the
orchestrator's read of the 3-file/16-line diff, not by a fresh review round.

Dispatch: four fresh Opus subagents, effort medium, one parallel batch
(adversarial, domain, standards, spec); `codex` not on `PATH`. Every axis
wrote nothing; both trees confirmed clean by reviewers.

Branch context: output of the `upgrades-ui-pass` stage-gate run
(`.scratch/stage-gate/upgrades-ui-pass/` — brief, plan revision 3,
two-round plan review, execution report, decision log). The substantive UI
code is in the gitignored fork clone; the repo diff carries tickets, the
lockfile re-pin, the regenerated effects artifact, and the verification-log
measurement entry.

## Adversarial

Three findings; the rest of the pass cleared the dangerous paths with
evidence.

- **A1 (medium, latent)** — `pruneEffective()` reads a visibility proxy
  that is not a visibility test: `ToggleControl.visible` checks only its own
  label's `d-none`, while the whole tab pane is hidden by an ancestor
  (`sim_tab.ts:24-26`; the pane is never `active` at construction). Not
  exploitable today — `run()` has exactly two callers and a hidden button
  cannot be clicked — but the doc comment sells it as equivalent to the old
  force-off, and any future programmatic `run()` breaks it silently.
- **A2 (low, cosmetic)** — `formatDelta(0)` renders unsigned `0.0`;
  placeholder-zero rows are filtered before rendering, so a visible `0.0` is
  a genuine measured zero.
- **A3 (informational)** — the entire diff has zero automated coverage: no
  test file references `upgrades_tab.tsx`. No test theatre — there is no
  test to be theatrical. Known constraint (plan C6: the fork has no DOM
  harness and no TS test runner).

Cleared with evidence: the mid-run sort copies before sorting and filters
unsimmed rows first (no mutation, no placeholder crowding, no NaN path);
`pruneEffective` ordering (`setVisible` always precedes the read); Bootstrap
`d-none` (`!important`) beats the partial's `display:flex`; locale/schema
three-key rename consistent with zero stale references; pin three-way
equality reproduced independently; ticket 283's CRLF counts reproduced
exactly (2032 working-tree / 0 in the `HEAD` blob); the execution report's
falsifiable assertions (greps, `<th>` count, pin equality) each reproduced,
and its deviation ledger disclosed the deviation it could have hidden.
Unexamined: the served-page row counts and inversion sequences (needs a
build+server the brief forbids reviewers to run); `engine/**` beyond the two
comparators ticket 279 names (untouched by this diff).

## Domain

No contradictions with `docs/stage0-findings.md` or the verification log.

- Delta-descending provisional rank mid-run is domain-sound: unsimmed rows
  are filtered before the sort (placeholder zeros never masquerade as
  measured "no upgrade"), and the provisional position comes from the render
  index, not `row.rank`.
- The Candidate-B mechanism was **re-derived from source** and holds:
  `rank.ts:883-891` stamps rank via `bySimmedThenDelta` (delta-only
  tiebreak); `view.ts:205` re-sorts via `compareRows` (bisTags then itemId
  tiebreak, `view.ts:174-178`). Two comparators disagreeing only inside
  exact delta ties — cosmetic in domain terms; the delta ordering, which is
  what the ranking means for loot priority, is intact.
- Ticket 279's proposed fix direction (give `bySimmedThenDelta` the same
  bisTags-then-itemId tiebreak) is the domain-correct one: a tied item also
  on a BiS list is the better chase.
- Ticket facts verified: 275's prune change is domain-safe and the
  both-directions check is the right check; 282's zoneless-bucket taxonomy
  and zone list are correct; the measurement entry's "iterations 1" caveat
  is valid because the ordering-consistency claim is independent of
  iteration count.
- **D1 (note, latent)** — the ungated `bisOnlyToggle`/`setPotentialToggle`
  reads are safe only because those controls are visible exactly when
  `state.kind === 'done'`; the invariant is enforced today, asserted
  nowhere. Same family as A1.
- Improvement worth naming: the placeholder count and the run's actual pool
  can no longer disagree — both now go through `pruneEffective()`.

## Standards + Spec

**Standards: no hard violations.** Comment policy (every new JSDoc block
carries a constraint or rejected alternative), durable claims (tickets carry
re-runnable commands and measured counts; 283 narrows its own exposure), and
the cbea.ms commit rules all satisfied. Three judgement calls: **S2** the
`ToggleControl` comment justifies the shape partly by the unbuilt
three-state control; **S3** `rankText: string` encodes two meanings in one
primitive (Primitive Obsession, documented); **S4** `setVisible` is pure
delegation (Middle Man, deliberate so the `<select>` can share it). Fork
idioms consistent throughout: SCSS partial matches its ten siblings,
`<details>` aligns the two disclosure widgets, locale+schema changes paired.

**Spec: one real gap, one factual check, rest conforms.**

- **S1** — plan step 5a's "DPS" unit on the delta value never landed and was
  not ledgered (the executor had silently narrowed the requirement to the
  column header).
- **S5** — the new SCSS scopes label rules under `.upgrades-run-row`, which
  the reviewed diff did not show being added to the JSX.
- Tickets 275 and 278 both meet their own "Done when"; the ledgered
  deviations (dead `belowCutoff` param dropped, idle third empty-state,
  `<details>` key collapse, whitespace normalization — count off by two but
  immaterial) are all sound; no scope creep beyond them.

## Summary

The four axes converged: the UI work is correct, idiomatic, and honestly
measured; the Q1/Candidate-B analysis survives independent re-derivation;
the execution report's claims reproduce. One spec omission (S1) was fixed in
a rework round; the one medium finding (A1, with D1 as its sibling) is a
latent coupling, not a live defect, and is deferred with a ticket. No
blockers to the merge.

## Disposition

| ID  | Axis        | Disposition | Ticket / note                                                                                                                                                                                                   |
| --- | ----------- | ----------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| A1  | Adversarial | defer       | `.scratch/carry-forward/issues/284-toggle-visibility-proxy-is-not-a-visibility-test.md`                                                                                                                         |
| A2  | Adversarial | wontfix     | A visible `0.0` is a genuine measured zero; unsigned is the honest rendering.                                                                                                                                   |
| A3  | Adversarial | wontfix     | No fork test harness (plan C6); adding one for this diff was ruled disproportionate at Gate B. Served-page measurements are the coverage.                                                                       |
| D1  | Domain      | defer       | `.scratch/carry-forward/issues/284-toggle-visibility-proxy-is-not-a-visibility-test.md` (§2 — assert or document the visible-iff-done invariant)                                                                |
| S1  | Spec        | fixed       | DPS unit added as i18n key `results.delta_dps_value` (fork `a52fdf83`, repo `4c819e5`); served-page re-check: 0 missing units, 0 sign regressions across 240 cells.                                             |
| S2  | Standards   | wontfix     | The three-state sentence is plan-mandated (revision 3, step 3: the helper's comment must record the replaceability constraint — owner's out-of-scope guard for STATUS item (e)). Plan overrides the style call. |
| S3  | Standards   | wontfix     | Documented convention; a rank type for two call sites is not worth its weight in a file with no test harness to protect it.                                                                                     |
| S4  | Standards   | wontfix     | Deliberate: the raid-filter `<select>` shares `setControlVisible` without inheriting checkbox semantics.                                                                                                        |
| S5  | Spec        | fixed       | Verified, no change needed: `.upgrades-run-row` is applied at `upgrades_tab.tsx:326`; the reviewer's diff view simply did not include that hunk.                                                                |

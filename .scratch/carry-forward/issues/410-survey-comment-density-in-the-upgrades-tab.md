# 410 — Survey comment density in the upgrades tab, then decide what to cut

Status: open
Type: task
Origin: noticed 2026-09-16 while answering where to record "why we never let the
bulk tournament cull" — the answer was "it is already recorded," at 55 lines
Blocks: —
Blocked by: none

## What

Survey first, cut second. The suspicion is that parts of the upgrades tab carry
comment blocks well past the point where they help, but that is an impression
from one file, not a measurement. This ticket is a survey with a possible fix
attached, not a trim job with a foregone conclusion.

The trigger case is `MAX_CANDIDATES_PER_BULK_REQUEST` in
`vendor/tbc-new-fork/ui/core/components/individual_sim_ui/upgrades/engine/bulk/partition.ts:15-68`
— roughly 55 lines of doc comment, including a twelve-row data table, above a
one-line `const`. See the assessment below before treating it as the worst case;
it may be the *best* case of the pattern, because most of what it says is real.

## Survey

Measure before proposing anything:

- Comment-to-code ratio per file across `upgrades/`, so the outliers are named by
  measurement rather than by whoever happened to read the file.
- For each outlier, classify every block against this repo's own policy
  (`AGENTS.md`, "Comment policy": why not what, load-bearing only, rename before
  explaining): **load-bearing** (a non-obvious constraint, an external-system
  quirk, why a slower path was chosen on purpose, a pointer to the finding that
  forced the shape) vs **restatement** vs **duplicated by a test or a ticket**.
- Note whether the density concentrates in the ported engine files, the adapters,
  or the tab, since those have different provenance rules and the answer probably
  differs by area.

Do not treat length as the defect. A long comment carrying four load-bearing
facts is fine; a short one restating its own line is not.

## Assessment of the trigger case (impressions, not a verdict)

Recorded here so the survey starts from a concrete reading rather than a vibe.
This is one reader's judgment on one file and the survey may overturn it.

What earns its place in `partition.ts:15-68`:

- **The real gate is `shouldUseLegacyBulkSim`, not the Medium stage's
  `MaxSurvivors: 25`.** Two different mechanisms carry the number 25 and only one
  sets the boundary. This corrects a wrong inference a reader would otherwise
  make from a coincidence, and nothing in the code says it.
- **n = 33 returns 5 rows of 33 silently, with no error field set.** An
  external-system quirk with no local symptom. Exactly what a comment is for.
- **The bound prevents culling but does not by itself guarantee a row per
  candidate**, because results lacking `dpsMetrics` are dropped downstream. This
  is the sentence that stops someone deleting the per-chunk row-count assertion
  as redundant.
- **Why 25 rather than the 32 both engines could carry** — headroom given up on
  purpose to keep the two transports on one batch size. A deliberate slower/
  narrower choice, which the policy names explicitly.

What looks like it could go:

- **The twelve-row iteration table.** The comment itself says
  `packages/core/test/bulk-boundary.test.ts` reproduces it. A table maintained in
  two places drifts, and the test is the copy that fails when it is wrong. The
  *conclusion* drawn from it — 25 and 26 are single-stage at every measured count
  — is load-bearing and should stay; the twelve rows behind it can be a pointer
  to the test.
- **The inequality walk-through** (`high×(n+1) ≥ high×n`, then the n = 26 and
  n = 27 cases). This derives the conclusion rather than recording it. It reads
  as a proof someone needed to write once to convince themselves, which is a
  ticket or an ADR, not a comment above a constant.
- **The `PROVENANCE.md` paragraph** at the top of the file, explaining that the
  file has no ancestor and so carries no drift-checker row. Possibly true and
  useful, but it is a fact about repo tooling rather than about this code, and
  the same note likely belongs in one place for every such file rather than
  repeated per file. Check whether it is repeated before cutting it.

Rough shape if that holds: the four load-bearing facts plus the conclusion, with
pointers to the test and to ticket 349 for anyone who wants the derivation.
Perhaps fifteen lines instead of fifty-five. **Untested** — nobody has tried
writing the shorter version and checked that nothing needed goes missing.

## Watch out for

- **Much of this code is currently dead at runtime** (ticket 406) — the bulk path
  is switched off at `makeSimRunner(bulk = false)`. Comments are the only live
  documentation of machinery that may be re-enabled, so the bar for cutting is
  *higher* here than in live code, not lower.
- **Ported engine files have their own rules.** Read
  `docs/agents/known-traps.md` before editing anything under a ported path; a
  comment edit can trip the drift checker the same as a code edit.
- Anything cut should land where a reader will still find it — the ticket, the
  test, or an ADR — not simply be deleted.

## Comments

**2026-09-16.** 406 resolved as keep. The "may be re-enabled" premise under
"Watch out for" is now settled policy rather than a possibility, so the higher
bar for cutting stands on a decision instead of a guess.

`partition.ts`'s constant comment gained a leading paragraph in fork commit
`633169c7f4e835540f3041b7e4bb407218bffc5b` saying the constant is unreachable at
runtime, with the grep that proves it. Any trim must keep that paragraph; it is
the only place the dead-at-runtime fact is recorded in the fork. Nothing else in
the comment was touched — the 406 branch trimmed nothing, so this ticket is
unblocked and its survey scope is unchanged.

## Done when

The survey exists with per-file numbers and the outliers classified, and the
owner has decided whether to act on it. If yes, the cuts land as their own
commits with the relocated material placed first.

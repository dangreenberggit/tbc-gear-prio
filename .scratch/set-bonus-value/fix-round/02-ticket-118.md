# Worker log — ticket 118 (package mode shows and sorts every measured threshold)

Branch: `feat/set-bonus-value`. Date: 2026-08-11.

## What was asked

Implement the owner's decision on ticket 118: member rows carry every measured
threshold's package value as data (2pc AND 4pc, separately), the row detail
line and chip marker display them separately, package mode sorts by the best
of the measured values for the row's set, the control stays, no advisory
prose, default view unchanged. Also fix the ticket-96 pointer so it cannot
send a reader to a destination that contradicts it.

## What changed

Code (commit `ee2a4e4`):

- `packages/core/src/rank.ts` — `SetContext.package` (one entry, largest
  threshold) became `SetContext.packages` (one entry per measured threshold,
  smallest first). New exported `memberPackages(itemId, bonusesForSet)` does
  the attachment; `applySetContext` calls it. A row is a member when its item
  id appears in any of its set's measured packages, and it then carries the
  whole set's measured figures.
- `packages/core/src/rank-report-rules.ts` —
  - `packageSetPotentialDps`: best measured figure when positive, else the
    row's own delta.
  - `formatPackageMembershipLine`: one figure per threshold, e.g.
    `this swap alone: -0.55 — 2pc package +11.31 (2 pieces) / 4pc package
    -6.83 (4 pieces) — each figure is that whole package of Lightbringer
    Battlegear pieces vs current gear (…gem qualifier…)`. Renders for
    negative-only packages too — the numbers are data; only the sort ignores
    non-positive figures.
  - `formatCuratedPackagePointer`: now takes the ranking's `setBonuses` and
    states the measured figures inline: `BiS as part of Crystalforge
    Battlegear, not as this swap alone — its measured packages: 2pc -0.47 /
    4pc -26.77 DPS vs current gear (see Set potential)`.
- `packages/core/src/rank-report.ts` — chip `.pkg` span shows each threshold:
  `pkg 2pc +11.31 / 4pc -6.83`; the emit guard is now the membership fact
  (`setContext.packages`), not a numeric comparison (noted on ticket 115,
  which a separate worker owns). Row `data-package` and chip `data-package`
  stay the sort key, now the best measured figure.

Tests:

- `packages/core/test/rank-package-thresholds.test.ts` — unit tests for
  `memberPackages`, best-of sort, per-threshold row line, and the pointer.
- `packages/core/test/rank-package-artifacts.test.ts` — acceptance against
  both committed artifacts, replaying the new attachment over their
  `setBonuses`: ret Lightbringer rows carry +11.31 and -6.83 and sort by
  +11.31; Justicar (all negative) rows do not move; feral Thunderheart still
  sorts as one positive block (now on the 2pc's +74.11 — the set's best
  measured figure; the 4pc's +64.09 still shows beside it), Malorne
  single-threshold unchanged, Nordrassil still moves no row.
- `packages/core/test/rank-report.test.ts` — fixtures moved to the plural
  shape; chip contract updated (`pkg 4pc +64.07` single, both-figure marker
  test added); ticket-112's four-mode contract (own delta in `.d`, package
  figures in the separate span, sort on `data-package`) still pinned.

Docs:

- `docs/adr/0024-…` — dated amendment (2026-08-11) recording the owner's
  direction in plain English.
- `.scratch/set-bonus-value/spec.md` — §4.1 "What it does" replaced with the
  amended rule; pointer notes in §2.1 and the ADR-0020 discussion.
- Ticket 118 marked resolved with the decision and resolution recorded;
  ticket 115 got a note (its complaint is superseded by the semantic guard,
  with one deliberate difference: the span now emits for negative packages
  too, per the owner's show-the-data direction).

## Known leftovers

- The committed artifacts (`.scratch/rank-reports/shredzepelin-p3.json`,
  `.scratch/set-bonus-value/ret-catchup/artifacts/slamaltman-p3.json`) were
  generated before the shape change and still carry the old single-package
  `setContext` on items. Their `setBonuses` (what the tests read) are
  unchanged. Regenerate with the re-run commands recorded in tickets 112/118
  to refresh the HTML/JSON surfaces.
- `pnpm verify` green (38 files, 686 tests) before each commit. Note for this
  machine: run it from a shell whose Node is 22.16 (the fnm default); the
  PowerShell profile picks up Node 20.18, which lacks `node:sqlite` and fails
  the three store suites before any code runs.

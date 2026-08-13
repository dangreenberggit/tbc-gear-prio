Status: closed
Closed: 610d6db
Type: docs
Origin: ticket 93's closing ask, restated by the pre-merge review of `feat/set-bonus-value`, 2026-08-10 (spec axis)
Blocks: none
Blocked by: none

# no ADR records the set-bonus threshold-selection decision

`docs/adr/` contains nothing on set bonuses. Verify:

```
grep -ril "set bonus\|setBonus" docs/adr/ CONTEXT.md
```

Ticket 93 asked for this explicitly — "if tickets 90/91 land, an ADR should
close that gap". Both landed (`283dd0b`, `915e3a3`) and the ADR was not
written; ticket 93's disposition concedes it and says "worth its own ticket".
This is that ticket.

## Why it matters, concretely

The threshold-selection rule has now been **decided once and mis-remembered
once** in the same codebase:

- Decided in `.scratch/set-bonus-value/spec.md` §2.3 (`nextMeasurableThreshold`
  returns the nearest *implemented* threshold strictly above the post-swap piece
  count, and §2.3's worked example presents the Nordrassil case — 2pc
  unimplemented, so the walk reaches 4 — as intended behaviour).
- Mis-remembered in the `brokenSetBonuses` docstring, which stated the
  break confound as "charged twice" when the closed form is `(k−1)·B`
  (ticket 93, fixed in `2e0b499`).

The symmetric case — 2pc *implemented*, so the walk stops at 2 and never reaches
4 — was never written down, which is exactly how ticket 91's defect survived: it
was an unconsidered consequence rather than a decision anyone revisited.

## What the ADR should record

1. **The threshold-selection rule itself** and, critically, the case spec §2.3
   omitted: at 0 pieces worn with an implemented 2pc, a single swap can never
   reach the 4pc, so per-row credit structurally cannot carry it.
2. **Why per-row numeric credit was rejected** in favour of package-as-card
   (ticket 91, design option (d)) — the decision and its reason, which is that
   the 4pc figure the engine reports is break-confounded (193.89 reported
   against 73.5 ± 6.3 measured) and smearing a fraction of it onto member rows
   would put an authoritative-looking wrong number into the sort.
3. **Suppress-and-disclose, not correct-and-disclose** (ticket 90): a figure
   with non-empty `breaks` is kept out of the sort key and cutoff but still
   shown. No numeric correction is applied anywhere, because `B` is
   gear-dependent — measured at 131.1 ± 6.6 on one reference set and explicitly
   not a per-character constant.
4. **The `(k−1)·B` closed form**, with k=0 and k=1 both producing exactly zero
   inflation.

Sources to draw on: `.scratch/set-bonus-value/spec.md`,
`.scratch/set-bonus-value/measurements-2026-08-10.md`,
`.scratch/handoffs/set-bonus-resolution-2026-08-10.md`, and tickets 90–99.

---

## Closed (2026-08-10) — ADR-0023 written

`docs/adr/0023-set-bonus-thresholds-are-selected-nearest-measurable-and-packages-are-disclosed-not-scored.md`

All four items this ticket asked for are recorded, plus two the follow-up round
added:

1. The threshold-selection rule, with the omitted symmetric case stated
   explicitly — at 0 pieces worn with an implemented 2pc, every swap lands at
   `piecesAfterSwap === 1`, so the walk stops at 2 and the 4pc is structurally
   unreachable from any row.
2. Why per-row credit was rejected for package-as-card, with the measured
   193.89-vs-73.5 inflation as the reason.
3. Suppress-and-disclose rather than correct-and-disclose, with `B`'s
   gear-dependence as the reason no correction exists.
4. The `(k−1)·B` closed form, k=0 and k=1 both inflating by exactly zero.
5. (new) Disclosure is not gated on the ranking toggle — carry-forward 100.
6. (new) A row may point at the panel but never restate its figure —
   carry-forward 96.

Measured figures carry their re-runnable commands (wowsimcli v0.0.101, seeds
`[11,22,33,44,55]`, 3000 iterations) per AGENTS.md's durable-claims rule, and the
one unmeasured direction (does the 2pc shrink on later-phase gear) is labelled
**Untested**.

Verify:

```
grep -ril "set bonus\|setBonus" docs/adr/
```

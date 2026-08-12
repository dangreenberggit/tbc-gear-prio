# Design note — should the set-bonus fix reach earlier than the UI?

**Date:** 2026-08-10
**Branch:** `feat/set-bonus-value` (not landed)
**Question (project owner):** we shipped a UI-side answer to the set-bonus
problem (opt-in whole-package re-sort, ADR-0024). Should something *also* change
earlier, in the sim/measurement process, or is UI-alone right?
**Status of this note:** design judgment, read-only. No code, sims, or tickets
were changed producing it. Everything below labelled *hypothesis* is unmeasured.

**Recommendation up front: UI-alone suffices for the shipped behaviour, plus one
cheap sim-side change (emit worn equipment into the artifact) that is not about
the display at all.** Reasoning below.

---

## 1. The framing that decides it

The owner's operating principle — *wowsims is the oracle; we need only ensure our
inputs and outputs don't distort it* — is the sharpest tool available here, and it
resolves most of the candidate list on its own.

Split the pipeline's quantities into two kinds:

| kind | examples | oracle status |
|---|---|---|
| **measured** — one sim of a real equipment configuration, differenced against one baseline sim | `deltaDps`, `packageDeltaDps` | direct oracle readings. No model sits between the sim and the number. |
| **derived** — arithmetic over several measured quantities | `bonusDps = packageDelta − Σ singles`, the 2pc/4pc split | our model, not the oracle's. Confounds (ticket 90's `(k−1)·B`) live exclusively here. |

The user-facing display now consumes **only measured quantities**. ADR-0024
decision 2 is explicit: package mode sorts and displays on `packageDeltaDps` and
"does not consult" `bonusDps`. ADR-0023 decision 3 keeps break-confounded
`bonusDps` out of every sort key and cutoff comparison. The single-swap number a
row shows is `deltaDps` — likewise a direct reading.

**So the display layer is not "policing derived quantities" in the way the brief
suspects.** It already decided, correctly, to stop consuming them. `bonusDps`
survives as disclosure only. That removes the main motive for changing the
measurement: de-confounding `bonusDps` would improve a number the decision
display no longer reads.

The second consequence is the important one:

> A UI change that switches which measured quantity a row is *organized by* is
> not a workaround for a bad measurement. It is a framing choice, and framing is
> exactly where a single-swap-vs-package mismatch belongs.

The problem ADR-0024 solves is that the ranking's unit (one swap) does not match
the decision's unit (a package). No sim improvement can fix a unit mismatch —
`deltaDps` for T6 shoulders *is* −106 and that is the true, oracle-endorsed answer
to the question "what does equipping this one piece tonight do?". Both figures are
correct; the reader needed both, and now sees both. That is a display problem with
a display fix.

---

## 2. The candidates

### C1 — De-confound `bonusDps` by measuring against threshold-safe arms

*(the corrected ladder from the handoff's "Methodological finding": price stat
swaps only with arms that cross no bonus threshold)*

- **What it buys the display: nothing.** The display does not read `bonusDps`
  (ADR-0024 §2). It would improve a disclosure line in the Set potential panel.
- **Sim budget: substantially over the §2.4 note.** The corrected ladder needs
  restore-arms (`R_*`) per slot on a zero-piece base, i.e. an extra arm per
  package member, plus a zero-piece base arm per set. For a 4pc package that is
  ~5 additional sims *per set per threshold*, against spec §2.4's ~4-per-run
  total. Order-of-magnitude increase, in a stage that currently costs ~4.
- **Complexity: high, and it changes what the number means.** Ticket 99's scope
  limit is decisive here: a threshold-safe ladder measures the bonus **on a
  reference configuration**, not on this player's gear. Ticket 99 says in its own
  words that such a figure is not good for "predicting what a specific character
  gains from completing a set". Building it into the per-character pipeline would
  swap a confounded per-character figure for an unconfounded wrong-character one.
- **UI simplification: marginal.** Removes `setPotentialIsConfounded` and the
  suppression path in `view.ts`/`rank-report-rules.ts` — real but small, and only
  after a large measurement change.
- **Verdict: no.** Highest cost on the list, and its beneficiary is a line of
  disclosure text.

### C2 — Regem/optimize gems inside the package sim (ticket 103)

- **What it buys the display: it would close a real, measured ~16.7–33 DPS gap**
  (+64.07 ours vs +80.80 flat-filler vs +97 wowsims web), which is the one place
  our *output* genuinely diverges from what the oracle shows the user. Under the
  owner's principle this is the strongest candidate on the list — it is an
  input-fidelity issue, not a modelling one.
- **But it is foreclosed by an invariant we chose deliberately.** Spec §2.2 step 1
  requires the package to be assembled with the same sequential
  `equipmentForCandidateSwap` single swaps use, so PLAN.md §9's symmetry
  invariant holds *by construction*. Re-gemming only the package arm breaks that:
  package and single swaps would then be measured under different gem policies,
  and the singles the reader sees beside the package figure would no longer be
  commensurable with it. ADR-0024's "Alternatives considered" rejects this
  explicitly, and ticket 103's own recommendation is option 1 (disclosure).
- **Does the engine support it?** `equipmentForCandidateSwap` runs
  `migrateGemsToItem` → `fillEmptyCandidateGems` → `repairMeta`, with
  `fillOptsForSwap` computing a `usedUnique` exclusion over the rest of the
  equipment (`rank.ts:1376-1452`). A whole-equipment re-solve is therefore *not*
  a parameter flip — the helper is per-slot and sequential by design. **Untested:**
  no experiment has isolated the sequential-unique-exclusion contribution from the
  socket-count differences ticket 103 also names (legs 28741 has 3 sockets vs T6
  31044's 1), so even the direction of a re-solve's benefit on *this* package is
  inference from source reading, not measurement.
- **The symmetric fix, if this is ever revisited: re-gem both arms, not one.** That
  restores the invariant and is the only version that is coherent — but it changes
  every single-swap `deltaDps` in the report, i.e. it is a change to the default
  ranking, which spec §7 puts out of scope. Big rework, not a cheap sim change.
- **Verdict: no, keep as disclosure.** Ship-blocking only if a user comparing our
  panel to their own wowsims run is a real failure mode; ADR-0024 already discloses
  it on every package-member row and in the control note. The remaining hole is the
  Set potential panel's own `formatPackageDelta` line (ticket 103 open update) —
  a *text* fix, still not a sim fix.

### C3 — Emit worn equipment into the artifact (ticket 90's audit gap)

- **What it buys the display: nothing directly** — and that is fine, because it is
  not a display change. It buys **auditability**: ticket 90's audit had to
  reconstruct `k` (the break multiplier) from three indirect signals
  (`piecesAfterSwap` arithmetic, a `setBonusNote` census, delta-structure shape)
  because `ranking` has no equipment key. They agreed *this time*; the audit's own
  note says nothing guarantees that on another character or set configuration.
- **Sim budget: zero.** No new sims. `equipment` is already in hand at the call
  site (`buildSetBonuses` takes it as a parameter, `rank.ts:981`).
- **Complexity: small.** An additive `Ranking` field plus an `engineVersion` bump
  (the output shape changes, so cached rankings must invalidate — same rule spec §3
  applied to `setBonuses`). Golden artifacts under `.scratch/rank-reports/` and any
  document-diff test would need repinning.
- **UI simplification: none.** This is for us, not the reader.
- **Verdict: yes — the one item worth ticketing.** Every future set-bonus
  investigation on this branch spent effort reconstructing baseline state that the
  producer already had. It is the cheapest defect-prevention item available and it
  is orthogonal to the UI/sim question.

### C4 — Measure a per-set 0/2/4 ladder on the character's own gear

*(so per-threshold increments are direct measurements rather than derived splits)*

- **What it buys the display: nothing it does not already have.** The 2pc and 4pc
  *packages* are already each measured directly today — `buildSetBonuses` loops
  `SET_THRESHOLDS` and sims `P(S,2)` and `P(S,4)` separately (`rank.ts:1024-1149`),
  so `packageDeltaDps` at each threshold is already a direct reading, not a split.
  What is derived is only the *increment attributable to the bonus itself*
  (`bonusDps`), which the display does not consume (see §1).
- Note the subtlety: on the character's own gear a 0/2/4 ladder cannot be run
  without either (a) removing gear the character wears, which is a different
  character, or (b) the threshold-safe reference arms of C1, which is C1.
  "On the character's own gear" and "de-confounded" are in tension — that tension
  is the whole content of ticket 99's scope limit.
- **Sim budget: additional arms per set for a quantity nobody reads.**
- **Verdict: no.** Largely already true where it matters; the remainder is C1.

### C5 (added) — Suppress or skip packages whose `breaks` are non-empty at the sim stage

Considered and rejected. `packageDeltaDps` is *net of the break by construction*
(ADR-0023 decision 3's own words: it is "the only one that is genuinely net of any
break"). A package that breaks a worn set and still measures positive is a true
statement — it is precisely the T6-shoulders case the owner wants surfaced.
Skipping those packages would delete the feature.

### C6 (added) — Reduce the count of derived quantities the display must police

Worth stating as the general form of the brief's last bullet, because the audit
of it comes out favourable. Derived quantities currently in `SetBonusValue`:
`bonusDps` and its `se`. Both are disclosure-only. The display's "policing" is two
small predicates (`setPotentialIsConfounded`, `rankableSetPotential`) that zero a
confounded figure out of the sort key. That is ~two functions guarding one
disclosure figure — a modest tax, and cheaper than any measurement change that
would remove it. **No action.**

---

## 3. What would change this verdict

Recorded so a future session does not re-litigate from scratch:

1. **If `bonusDps` ever re-enters a sort key or a cutoff comparison**, C1 becomes
   mandatory before that ships. ADR-0023 decision 3 is currently the only thing
   holding the confound out of the ranking, and it is a policy, not a structural
   guarantee.
2. **If users routinely cross-check our package figure against their own wowsims
   run**, C2's ~30 DPS gap stops being an acceptable conservatism and the
   symmetric re-gem (both arms) needs costing as a real project.
3. **If a set-bonus investigation ever draws a wrong conclusion from a
   mis-reconstructed `k`**, C3 was under-prioritised. *Hypothesis:* the three
   reconstruction routes agreeing on this character was luck of configuration, not
   a property of the signals.

---

## 4. Recommendation

**UI-alone is right for the set-bonus display problem.** ADR-0024's re-sort
addresses a unit mismatch (single swap vs package) that no measurement change can
address, and it does so consuming only direct oracle readings. Add exactly one
sim-stage change, and it is not a display fix:

### Ticket-able item — the only one

**Emit the baseline worn equipment into the `Ranking` artifact.**

- *Why:* `k`, the break multiplier every set-bonus figure depends on, is currently
  reconstructible only from indirect signals (ticket 90 audit note). Two separate
  investigations on this branch paid that cost.
- *Shape:* additive `Ranking.equipment` (or `baseline.equipment`) field carrying the
  same `readonly SimItemSpec[]` `buildSetBonuses` already receives; bump
  `engineVersion` in `content-hash.ts` per spec §3's rule for output-shape changes;
  **no** new `contentHash` input (nothing about a number moves).
- *Cost:* zero sims. Repin golden artifacts and any rendered-document test.
- *Not urgent, not blocking.* File it; do not hold the branch for it.

### Explicitly not doing

- **Not** de-confounding `bonusDps` in-pipeline (C1) — costs ~5× the set-bonus sim
  budget to improve a figure the display does not read, and would substitute a
  reference-gear figure for a per-character one (ticket 99's scope limit).
- **Not** re-gemming the package arm (C2) — breaks spec §2.2's symmetry invariant;
  the coherent version re-gems both arms, which changes the default ranking and is
  out of scope per spec §7. Ticket 103's own recommendation is disclosure, and the
  one gap left is a text line on the Set potential panel.
- **Not** adding threshold ladders on the character's own gear (C4) — the package
  figures at each threshold are already directly measured; the rest is C1.

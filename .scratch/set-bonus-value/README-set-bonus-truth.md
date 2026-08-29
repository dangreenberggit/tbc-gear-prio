# Set bonuses — read this first

Consolidated 2026-08-28 after a long, churny session kept re-deriving the same
facts one confused question at a time. This is the **index and the settled
truths**. It does not replace the authoritative records — it points at them so a
future agent (or the owner) does not reassemble this from ~40 dated files again.

## Authoritative sources (read these before touching set-bonus code)

- **ADR-0023** (`docs/adr/0023-...md`) — threshold selection is *nearest
  measurable*; a break-confounded `bonusDps` is disclosed, never ranked on.
  Amended by tickets 119 (self-set case) and 131.
- **ADR-0024** (`docs/adr/0024-the-opt-in-view-may-score-a-set-piece-by-the-package-it-completes.md`)
  — **the opt-in set-potential view MAY score a member row by the package's own
  `packageDeltaDps`.** This is load-bearing: it means "the ranked number moves
  when set-potential is on" is (at least partly) a *decision*, not automatically
  a bug. Check this before calling ranked-contribution behavior a defect.
- `.scratch/set-bonus-value/verification.md` — the measured effect bodies and the
  settled "negative = noise around zero" ruling (see below).
- `.scratch/set-bonus-value/spec.md` — the original spec (§2.3 threshold rule, §4
  scoring).

## Settled truths (each with a source; do not re-derive)

1. **What `bonusDps` measures.** `computeSynergy` (`set-value.ts:366-379`):
   `bonusDps = packageDeltaDps − Σsingles − twoPieceBonus`. Each single's
   `deltaDps` already charges the cost of vacating its slot, so **the swap cost
   is already subtracted out of `bonusDps`.** `bonusDps` is the *isolated
   marginal synergy* of that threshold's effect. `packageDeltaDps` (=
   `D(package) − D(baseline)`) is the "is wearing the set worth it vs current
   gear" number, and it legitimately *can* be negative.

2. **A negative `bonusDps` is noise, not a real loss.** A set *bonus* (the
   proc/stat Blizzard grants) is ≥0 by nature. When our measured `bonusDps` is
   slightly negative (Lightbringer 4pc ≈ −9.3, Crystalforge 4pc ≈ −9.26, Justicar
   4pc ≈ −4.6), the true effect is ≈0 and the negative is **sim noise around
   zero** — per-run SE is ~1.7 DPS single-item and ≥~4.4 DPS for a folded
   set-bonus figure, so these sit ~1–2 SE from zero. `verification.md` states
   this explicitly: "A slightly negative figure is noise around a true zero, not
   a claim that the bonus costs DPS." **Never display a negative as "the bonus."**

3. **Why ret shows ~nothing.** The ret-relevant tier bonuses are DPS-irrelevant
   for the sim's APL (Lightbringer 4pc = +10% Hammer-of-Wrath, execute-only;
   Crystalforge 2pc/4pc = mana/heal; Justicar 4pc masks a Judgement the Seal-of-
   Blood APL never casts). So for ret, no set bonus clears the noise — correctly.
   The feature's value shows on specs where a bonus is real (e.g. feral Malorne
   4pc +20.89 at 7.8σ, `verification.md` V0c).

4. **Thresholds vs piece count.** `SET_THRESHOLDS = [2, 4]` (`set-value.ts:14`).
   Tier sets have **5 pieces (T5) or 8 (T6, with crafted)** but bonuses fire only
   at 2 and 4. Display progress against the **threshold** (`/2`, `/4`), **never**
   against total pieces (`/5`, `/8`) — that denominator is not tracked and would
   confuse. `piecesAfterSwap` / `nextThreshold` are the right quantities.

5. **The confounded (broken-set) case is different.** When a package breaks
   another set's bonus, `bonusDps` nets in the lost bonus and can inflate by
   `(k−1)·B` (`set-value.ts:227-256`); ADR-0023 forbids ranking on it. The
   "separate the bonus from the cost" framing below applies to **unbroken**
   packages only; confounded rows stay flagged, not split.

## The display noise floor we shipped (ticket 315)

`SET_BONUS_MIN_DISPLAY_DPS = 10` in the fork's `upgrades_tab.tsx` gates the
**displayed set-bonus line** — a bonus at or below noise shows no line. Owner
ruling: "at or below noise, don't show it." This is correct and in place.

## The OPEN question (do not treat as settled — this is where the session stopped)

With set-potential ON, the **ranked number** is `deltaDps +
rankableSetPotential(item)` (`view.ts:317-341`), and `rankableSetPotential`
returns the raw `prospectiveBonusDps` (zeroing only the *confounded* case) — it
is **not** gated on the `SET_BONUS_MIN_DISPLAY_DPS` noise floor. So a below-noise
`bonusDps` (e.g. −9.3) is added into the sort key and the cutoff math even though
the visible line correctly hides it.

**Whether that is a bug or intended is UNRESOLVED.** ADR-0024 says the opt-in
view MAY score a member by the package it completes — so moving the ranked number
is a recorded decision, but ADR-0024 predates the ticket-315 noise floor and does
not say whether a *noise-level* contribution should still move the ranking. The
owner's design intent (2026-08-28): **net effect is the main/ranked number; the
set bonus is gated extra info shown only above noise.** Reconciling that intent
with ADR-0024 is the next step — it may amend ADR-0024, or confirm current
behavior. **Do not implement a "fix" here without settling the ADR-0024
question first.**

## Owner's confirmed display design (2026-08-28)

- Main/ranked number = **net effect** (what happens to your DPS).
- Set bonus = **secondary annotation**, shown **only when it clears the noise
  floor** (a real, ≥0, above-noise bonus). Below noise → no bonus shown anywhere,
  and (open question above) it should not silently move the ranking either.
- Readable and succinct; show progress against the threshold, not piece count.

## Ticket map

- **315** — display noise floor (shipped, validated). Closed pending owner sign-off.
- **330** — the set-bonus *line wording* (downstream of what 331 decides to show).
- **331** — originally "surface the 4pc by summing increments"; that plan
  (`.scratch/stage-gate/upgrades-4pc-visibility/plan.md`) **solved the wrong
  problem** and is superseded. The corrected scope is the open question above:
  reconcile the owner's "net effect ranks, bonus is gated extra" intent with
  ADR-0024, then gate the ranked contribution (or confirm it) accordingly.
  **No execution taken 2026-08-28 — owner directed stop-and-consolidate.**

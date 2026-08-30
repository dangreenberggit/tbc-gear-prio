# SME rank judgment — ticket 330: single-nearest-threshold set-bonus display

**Verdict: trust-with-caveats.**

The tab's ranked NUMBER is defensible and is not a ranking bug. But the tab
has a real, game-facing DISCLOSURE gap: a player advancing toward a set whose
2-piece bonus is implemented sees nothing about a reachable 4-piece bonus, and
for some specs (feral druid, below) that hidden 4-piece is a large, real
upgrade. This gap is bigger than a wording fix but is NOT the "the row's number
is wrong" defect the owner feared.

---

## The question, answered for engineers

When a swap advances a player toward a set with both a 2pc and a 4pc bonus, the
tab's `setBonusLine` shows ONE figure — the nearest measurable threshold's
bonus — and never a combined or 4pc-reachable figure. Is that correct, a bug,
or an acceptable-but-incomplete gap?

**It is an acceptable-but-incomplete gap, split into two very different halves:**

1. The ranked/displayed NUMBER on the row is correct behavior. Do not "fix" it
   by smearing 4pc credit onto the row — that was deliberately rejected and is
   game-wrong for these ret sets.
2. The tab discloses nothing about a reachable 4pc. For sets where the 4pc is a
   real upgrade (feral druid Thunderheart, below), that silence hides a genuine
   in-game gain from the player. That is the part worth a ticket.

---

## What was reviewed

- Fixture `.scratch/rank-reports/slamaltman-p3.json` (ret, "slamaltman", P3).
- Fixture `.scratch/rank-reports/shredzepelin-p3.json` (feral druid,
  "shredzepelin", P3) and sibling shredzepelin/stage2/ticket257 fixtures.
- Tab display: `vendor/tbc-new-fork/ui/core/components/individual_sim_ui/upgrades_tab.tsx`
  `setBonusLine` (lines 2046–2100).
- Engine (ported fork twin):
  `vendor/tbc-new-fork/ui/core/components/individual_sim_ui/upgrades/engine/rank.ts`
  `applySetContext` (1420–1444) and `set-value.ts` `nextMeasurableThreshold`
  (80–89).
- Tickets 330, 331, 118, and closed ticket 91.

Ground truth stated in the task was re-verified against repo data; all points
hold (evidence below).

---

## Findings

| # | Finding | Severity | Evidence |
|---|---------|----------|----------|
| 1 | The tab shows one figure = nearest implemented threshold's bonus, and stops. | confirmed, by design | `nextMeasurableThreshold` returns the first implemented threshold `> piecesAfterSwap` and returns (set-value.ts:84–89). `setBonusLine` reads only `ctx.prospectiveBonusDps` + `ctx.nextThreshold` (upgrades_tab.tsx:2082–2097). |
| 2 | `packages[]` carries both 2pc and 4pc per row but the tab never reads it — dead data in the tab. | confirmed | rank.ts:1441–1442 populates `setContext.packages`; `setBonusLine` (2046–2100) references only `prospectiveBonusDps`/`nextThreshold`/`crossesThreshold`/`prospectiveBonusBreaks`. Fixture rows carry populated `packages[]` (below). |
| 3 | For ret, the 4pc figures are noise-around-zero, so hiding them is CORRECT game behavior. | confirmed for ret | slamaltman-p3 Lightbringer 0→1: `prospectiveBonusDps=+0.545` (2pc isolated), `packages[]` = 2pc deltaDps +11.31, 4pc deltaDps −6.83. A set bonus is ≥0 by nature (game fact), so a negative measured 4pc is sim noise, not a real loss (ticket 331 / verification.md). The noise floor of 10 correctly suppresses these. |
| 4 | **Generalizes beyond ret — a real, large, positive 4pc IS hidden for feral druid.** | REAL GAP (game-facing) | shredzepelin-p3 Thunderheart Harness (setId 676, 2pc implemented) at 0→1 piece: `nextThreshold=2`, tab shows the 2pc figure only; the row's own `packages[]` carries a **4pc deltaDps of +64.09** (a large positive upgrade) that never reaches the tab. Thunderheart's 4pc is a well-known feral upgrade (ticket 91 direct sim ≈73.5 DPS). |
| 5 | Whether the big 4pc surfaces depends on an implementation accident, not a DPS fact. | confirmed | Same shredzepelin-p3: Nordrassil (2pc NOT implemented) → walk skips to 4 → its +185/+114-119 4pc DOES surface as "nearest". Malorne likewise surfaces its 4pc when 4 is nearest. Thunderheart (2pc implemented) → walk stops at 2 → its +64 4pc is hidden. Two sets of equal 4pc importance get opposite treatment purely by whether the 2pc is implemented. |
| 6 | Ticket 91 (closed) deliberately rejected smearing multi-threshold numeric credit onto member rows; chose a "package-as-card" disclosure panel instead. | confirmed | Ticket 91 Disposition: option (d) shipped (commit 915e3a3); options (a)/(c) "not implemented"; "Per-row numeric credit for an unreached threshold is deliberately not restored." |
| 7 | Ticket 91's replacement disclosure panel was NEVER ported into the tab. So the tab has NEITHER multi-threshold credit NOR the disclosure card. | confirmed | The panel lives in `packages/core/src/rank-report.ts`, which the tab explicitly cannot import — upgrades_tab.tsx:262–263 states nothing in `packages/core` is reachable from the fork's `ui/`, and `rank-report.ts`/`rank-report-rules.ts` are not among the ported engine twins. Grep of the tab for `setPotentialDisclosure`/`packageItemIds`/`Set potential` returns only comment references. |
| 8 | The ranked SORT number is already correctly noise-gated in the tab, so the number is not "wrong". | confirmed | `rankableSetPotential` (view.ts, ported twin) returns 0 unless `prospectiveBonusDps > SET_BONUS_NOISE_FLOOR_DPS (10)`; display and ranking share the one floor (ticket 331, 2026-08-29). |

---

## Answers to the four sub-questions

**1. Is single-nearest-threshold display CORRECT for the tab?**
For the number itself, yes. (a) For ret the 4pc is noise-around-zero and a set
bonus cannot be negative in-game, so showing it would be misleading; (b) ticket
91 deliberately rejected per-row multi-threshold credit as "right rows, wrong
reason"; (c) the noise floor of 10 already suppresses sub-noise figures. The
owner's "it's failing to account for the 4pc" concern, as a claim that the
displayed NUMBER is wrong, is NOT a real defect for the tab.

**2. If there's a gap, is it the missing DISCLOSURE or the numeric credit?**
It is the missing DISCLOSURE, not the numeric credit. The row's number is fine;
ticket 91 says NOT to add per-row 4pc credit. What is missing is any signal that
a 4pc exists and is reachable — the "package-as-card" panel that ticket 91 built
to carry exactly this, which was never ported into the tab. So distinguish
plainly: the row's ranked number is NOT wrong; the row (and the tab as a whole)
fails to DISCLOSE a reachable 4pc.

**3. Does this generalize beyond ret?**
Yes, and this is the case that turns it from a ret non-issue into a real gap.
For feral druid, Thunderheart Harness (2pc implemented) hides a +64 DPS 4pc
package from any player below 3 pieces (finding 4). This is measurable from
committed data (shredzepelin-p3.json), so it is not a "would need more data"
hypothesis — it is present today. The ret negatives are ret-specific noise; the
feral positives are real.

**4. Bottom line for ticket 330.**
Option (b): a wording fix PLUS a disclosure gap worth its own ticket. It is NOT
a ranking bug (the number is correctly noise-gated), and it is NOT purely a
wording fix (the tab genuinely hides real feral 4pc upgrades with no disclosure
surface at all).

---

## contested

`contested:` Ticket 330's framing treats the item as "the set-bonus line's
wording." That is correct as far as it goes, but it understates the scope: the
same underlying behavior hides a real, positive feral-druid 4pc upgrade
(Thunderheart 4pc +64 DPS in committed data) with no disclosure surface in the
tab. Ticket 331 concluded the residual defect is "out-of-scope for the tab (not
tab-blocking)" — that conclusion is about the `weighted`/`full` REPORT path,
which is genuinely not ported into the tab, and I do not contest it. But the
tab-facing disclosure gap (ticket 91's package-card never reached the tab) is a
distinct, tab-present issue that neither 330 (scoped to wording) nor 331 (scoped
to the report path) currently owns. If the orchestrator reads 330+331 as "tab
work is just wording," that reading is contested by finding 4.

---

## Confidence caveats

- Findings 1–7 are read from repo code and committed fixture data; commands and
  file:line are cited inline and re-runnable.
- "Thunderheart 4pc ≈73.5 DPS by direct sim" is **recalled from ticket 91's
  Disposition text, unverified** by me here; the +64.09 package deltaDps IS read
  from the committed fixture.
- "Nordrassil/Malorne 2pc unimplemented, Thunderheart/Lightbringer/Crystalforge
  2pc implemented" is drawn from ticket 91's citation of `IMPLEMENTED_IN_SIM`
  and corroborated by the fixture behavior (which threshold is "nearest"); I did
  not re-read the `IMPLEMENTED_IN_SIM` table itself. Treat the exact membership
  as **recalled/derived, spot-checked against fixtures**.
- Whether the feral disclosure gap is worth building now is an engineering
  priority call, not an SME call — I am asserting only that the gap is real and
  game-facing, and that fixing it must be disclosure (a card/line naming the
  reachable 4pc and its pieces), never per-row numeric smearing.

---

## Input judged and how it was produced

- `.scratch/rank-reports/slamaltman-p3.json` and
  `.scratch/rank-reports/shredzepelin-p3.json` — committed rank-report fixtures,
  read directly (Python `json.load` walking `setContext`/`packages`).
- Tab and engine source under
  `vendor/tbc-new-fork/ui/core/components/individual_sim_ui/` — read at the
  file:line ranges cited above.

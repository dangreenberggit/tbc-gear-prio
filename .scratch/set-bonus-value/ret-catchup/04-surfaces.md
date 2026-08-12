# W4 — surface check: first ret HTML rank report

Subject: `.scratch/set-bonus-value/ret-catchup/artifacts/slamaltman-p3.html` (+ sibling `.json`),
generated 2026-08-11 via `pnpm rank --offline … --spec ret --max-phase 3 --with-set-potential --show-below-cutoff --report`.

Methods used: (a) static analysis — regex/python over the HTML and the sibling JSON, cross-read
against `packages/core/src/rank-report.ts`, `rank-report-rules.ts`, and `rank.ts` (package-selection
comment at rank.ts:1225-1243); (b) live browser — the file loaded in the browser pane via file://,
with the report's own script exercised through JS (toggle each set-weight mode, BiS-only, source
filter, export). Every check below names which method(s) it used.

## Check 1 — Set potential panel: PASS

Method: static + browser (panel `open` confirmed in live DOM).

- Present with no toggle: `<details class="panel" open>` — renders expanded by default (ticket 100 honored).
- Exactly 10 entries (`Set potential (10)`), matching `ranking.setBonuses`.
- 5 entries read "not implemented in the pinned sim": Gladiator's Vindication 2/4pc, Burning Rage
  2/4pc, Justicar 2pc. Unmeasured entries correctly carry **no** package line, no contents, no gem
  qualifier (formatPackageContents/setBonusEntry suppression works).
- Measured entries name added pieces, including "add Crystalforge War-Helm" (CF 2pc) and the full
  Lightbringer/Justicar piece lists.
- Gem-model qualifier text present on all 5 measured entries, verbatim `GEM_POLICY_QUALIFIER`.
- Data oddity, not a rendering bug: Justicar **2pc** is unmeasured ("not implemented") while
  Justicar **4pc** is measured (−3.88 bonus / −80.56 package). Plausible sim-side (only one bonus
  implemented) but worth a raised eyebrow in the SME pass.

## Check 2 — Toggle states: PASS mechanically; package mode is a complete no-op for ret (finding)

Method: browser (drove the radios and read recomputed labels/order/classes), confirmed by static
sort simulation over `data-weighted`/`data-full`/`data-package` attributes.

Toggles that exist (all four expected ones, nothing else): set-weight radios (off / weighted /
full / package), BiS-only checkbox, 14 source checkboxes + All/None, export panel. No other controls.

Ret rows with any prospective value: 19 rows carry `setContext`; the only positive prospective bonus
is Lightbringer 2pc (+0.55), the only other row-visible bonus is Justicar 4pc (−3.88, negative).

- **off**: chips show plain delta, document order (rank order). Baseline.
- **weighted** (×0.5 on 2pc): LB Greaves chip +7.66 → +7.93, LB Breastplate +3.11 → +3.38.
  Re-sort observed live: Breastplate climbs from last (pos 43) past Ring of Deceitful Intent /
  Softstep Boots. Justicar rows sort *down* (delta + 0.5×(−3.88)) — negative bonus handled, no clamp.
- **full** (×1): Greaves +8.20 (passes Cloak of the Pit Stalker), Breastplate +3.65. Same mechanics.
- **package**: `body.package` set; rows' nums column swaps to `.delta-package`
  (`.delta-plain` display:none, `.delta-package` block — verified live). Ticket 112 chip contract
  verified: chip `.d` keeps the plain delta in package mode (Greaves stayed +7.66). **But**:
  - Zero chips carry a `.pkg` span anywhere in the document (`class="pkg"` count: 0).
  - Zero package-only chips exist (`packageOnlyShortlist` admitted nothing).
  - Zero `package-line` row annotations.
  - `data-package === data-delta` on all 393 rows and 44 chips, so the package re-sort changes
    nothing. Package mode is visually identical to off except the nums-column swap to the same numbers.

  Why: `rank.ts` attaches each member row's package as the **largest measured threshold's**
  (rank.ts:1227 "Largest threshold first"), and every ret 4pc package is negative (LB −6.83,
  CF −26.77, Justicar −80.56). `packageSetPotentialDps` credits only positive packages, so no row
  carries one. Meanwhile the one **positive** package on the whole report — Lightbringer **2pc**
  at **+11.31** (add Breastplate + Greaves) — is attached to no row, because its two members are
  claimed by the negative 4pc package first. It is visible only in the panel. This is ticket 91's
  shadow, inverted: the largest-threshold-wins rule that made the 4pc reachable makes a positive
  2pc package unreachable by every row-level surface whenever the 4pc measures negative. The mode
  the toggle's long note sells ("whether starting the set is worth it") answers nothing on this
  report while offering the control anyway (`anyWeighted` gates on weighted/full deltas too, so
  the radio renders).

- Justicar/Crystalforge/Lightbringer below-cutoff pieces under package mode: unchanged — muted rows,
  own negative deltas in the (package) column, no admission to the curated strip. Correct per the
  positive-only rule; just nothing for a reader to see.

## Check 3 — Ticket 96 curated-package pointer: PASS with a wording oddity

Method: static (all `curated-pointer` divs extracted; BiS rows cross-read from JSON).

- Ret's 15 BiS-tagged rows are all `bisSets: ["p2"]` (degraded list, as expected — no p3 curated set).
  12 are below cutoff: 11 are **owned/worn items at delta 0.00** plus Cobra-Lash Boots (−0.24).
- Exactly one pointer renders, on Crystalforge Breastplate (30129): "BiS as part of Crystalforge
  Battlegear, not as this swap alone — see Set potential". Correct per the rule (only BiS +
  belowCutoff + setContext row). No pointer references an "not implemented" panel entry — CF 2pc/4pc
  are both measured, so the pointer does not dangle.
- Oddities, both low-severity:
  1. The pointer's only ret instance is on the piece the character **already wears** (it is below
     cutoff because its swap is a no-op, not because the swap forfeits anything). "not as this swap
     alone" reads strangely on a 0.00 self-swap.
  2. The panel entries it points at say the Crystalforge packages are **negative** (−0.47 / −26.77),
     so the pointer's implied "the package redeems this row" story is contradicted at the
     destination. Both facts are true (p2 BiS list, p3 pool); it is the degraded-tag framing, not a bug.

## Check 4 — Plausibility warnings panel: PASS

Method: static + browser. `ranking.plausibilityWarnings` is absent in the JSON; the HTML contains no
`details.panel.plausibility` element (the single "plausibility" string in the file is the CSS rule).
Live DOM query for `.plausibility` returns 0 nodes. Correctly absent, no empty shell.

## Check 5 — Source filter: PASS

Method: browser (exercised None → Hyjal-only → All) + static (labels/counts).

- 14 buckets, raids first by row count: Karazhan 100, Black Temple 82, SSC 49, **Hyjal Summit 36**,
  Tempest Keep 32, Gruul's 16, World Bosses 13, Magtheridon's 8; then Badge 3, Crafted 29, PvP 5,
  Reputation 20, Source not recorded 2, World drop 2. Hyjal and BT both present.
- Hyjal-only live: 6 chips, 36 rows, export drops to 6, first visible row Lightbringer War-Helm
  (a token piece surfacing under its raid — the two-hop token routing works). All/None buttons work.
- The dropped hunter item 30892 does not render as a row or filter bucket anywhere — it lives only
  in the Substitutions drawer (see check 8). No oddity.

## Check 6 — wowsims JSON export: PASS

Method: browser (read the live textarea) + static (script + `wowsimsItemIdsJson` shape).

- Present and populated on load: `{"items":[{"id":30106},{"id":32332},…]}` — 44 ids (43 raid chips +
  1 PvP chip, strips concatenated raid-first, deduped). Well-formed JSON, wowsims item-envelope shape.
- Spot check: 30106 Belt of One-Hundred Deaths, 32332 Torch of the Damned — ret paladin items,
  matching the visible chip order. Ids only — no gems/enchants, by design (a ranked candidate list,
  not a 17-slot gear set), and the caption says exactly that. Structurally importable as an id list;
  it will not reconstruct a character, as documented.
- Composes with filters as promised: BiS-only → 3 ids; Hyjal-only → 6 ids (verified live).

## Check 7 — BiS-only filter with the p2-degraded list: PASS

Method: browser (toggled it) + static (wording).

- Filter shows: 3 chips (Belt of One-Hundred Deaths, Razor-Scale Battlecloak, Ancestral Ring of
  Conquest), 15 rows across 13 slot sections (ranged section correctly hidden — no ranged BiS row),
  export 3. The 11 owned delta-0 rows and Cobra-Lash Boots stay visible and muted, per the note.
- ad44ad9's wording renders for ret, verbatim: label "BiS only — the 15 items on upstream's ret gear
  set (p2)" and the bold warning "**No curated set is pinned for P3**, so these are the newest that
  is — an older phase's list, not a P3 recommendation." Nothing on the page claims a P3 curated list.
  Not misleading.

## Check 8 — General ret sanity: PASS with one cosmetic finding

Method: static (texts) + browser (screenshot).

- Hit-cap banner: "~23 rating under the hit cap — Heroic Presence … Assumes 3/3 Precision — your
  logged build is not read for talents yet." Present, matches `caps.hit` (gap 22.6).
- Baseline 2003.5 DPS, stdev ±118.9 with the noise note; 44 above cutoff; 393/394 simmed.
- Fight provenance: "gear read from Hydross the Unstable (VGjFb3mtX9xHgyav fight 8, ranked route),
  spec confidence 100%". Present.
- Substitutions (1) drawer: Beast-tamer's Shoulders (30892) dropped, with the full **2,383-char Go
  panic** ("RetributionPaladin is not hunter.HunterAgent … Stack Trace: goroutine 54 …") embedded
  raw in the `<li>`. It is HTML-escaped (no injection) and collapsed by default, but expanding the
  drawer dumps ~2.4KB of goroutine frames with literal `\n\t` sequences into the page. Cosmetic:
  the first clause ("the sim failed on this swap") is the useful part; the stack trace belongs
  behind a trim or a nested disclosure.
- Below-cutoff rows: all 349 render (muted), `--show-below-cutoff` honored.
- Observation, data-side: "Band of Eternity" appears twice in the curated strip (#22 +9.12,
  #33 +6.51) — 12 distinct ids share that name in the pool (Scale of the Sands rep-rank versions).
  Two above cutoff is legitimate but reads as a duplicate to a player; name-disambiguation is a
  pool/label question, not a report bug.

## Ranked findings

1. **Medium — package mode is a total no-op on this report while the control advertises it.**
   All row-attached packages are the (negative) 4pc ones, `packageSetPotentialDps` credits only
   positive packages, so under Package mode nothing re-sorts, no pkg badge, no package-only chip,
   no membership line — and the one positive package (Lightbringer 2pc, +11.31) is attached to no
   row because largest-threshold-wins hands its members to the negative 4pc package
   (rank.ts:1227-1235). Ticket 91 inverted: a positive 2pc is now the invisible threshold.
2. **Low — the substitutions drawer embeds a raw 2.4KB Go panic + goroutine stack** (escaped,
   collapsed, but ugly when opened); trim to the first line of the sim error.
3. **Low — the sole ticket-96 pointer sits on an already-worn item** (Crystalforge Breastplate,
   0.00 self-swap), where "not as this swap alone" misdescribes why the row is below cutoff, and it
   points at panel entries whose packages are negative — internally consistent but rhetorically
   backwards for the degraded-p2-tag case.
4. **Info — Justicar 2pc "not implemented" while Justicar 4pc is measured** in the panel; plausible
   sim reality, flag for the SME pass rather than the renderer.
5. **Info — "Band of Eternity" renders twice in the curated strip** (two rep-rank ids above cutoff);
   correct data, confusing label.

Everything else — panel gating, 10 entries with unmeasured reasons, gem qualifier, weighted/full
re-sort and re-label, ticket 112's chip `.d` contract in package mode, BiS filter + ad44ad9 wording,
source filter incl. token two-hop, export composition, cap banner/provenance/noise, below-cutoff
visibility, plausibility-panel absence — verified working, methods stated per check above.

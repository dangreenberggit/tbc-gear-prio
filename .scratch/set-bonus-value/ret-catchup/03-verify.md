# W3 verify — first ret setContext artifact (slamaltman-p3)

Date: 2026-08-11. Input:
`.scratch/set-bonus-value/ret-catchup/artifacts/slamaltman-p3.json` (+ `.console.log`),
generated offline, wowsimcli v0.0.101, ret-p3 universe 394 entries, maxPhase 3,
baseline 2003.51 DPS (stdev 118.93). Re-run any figure:

```
pnpm rank --offline --region US --realm dreamscythe --character slamaltman --spec ret --max-phase 3 --with-set-potential --show-below-cutoff --report
```

Console-vs-JSON cross-check: every headline figure matches the JSON
(`setBonuses`: LB 2pc +0.5452 / pkg +11.3141; LB 4pc −9.3098 / pkg −6.8346;
CF 2pc 0 exactly / pkg −0.4696; CF 4pc −9.9247 / pkg −26.7718; Justicar 4pc
−3.8760 / pkg −80.5568; Justicar 2pc, Gladiator's Vindication 2/4, Burning Rage
2/4 all `unmeasured: "not-implemented-in-sim"`). 10 setBonuses entries, 19
`setContext`-bearing items, both counts confirmed.

## Task 1 — package construction (ADR-0023 / ticket 91): PASS, with two first-exercised cases flagged

Extracted (names resolved via `data/items/index.json`; `breaks` absent on all
four measured entries — see below):

| set | thr | worn | bonusDps | packageDeltaDps | se | packageItemIds |
|---|---|---|---|---|---|---|
| Lightbringer 680 | 2 | 0 | +0.545 | +11.314 | 4.44 | 30990 Breastplate, 30993 Greaves |
| Lightbringer 680 | 4 | 0 | −9.310 | −6.835 | 5.41 | 30989 War-Helm, 30997 Shoulderbraces, 30990 Breastplate, 30993 Greaves |
| Crystalforge 629 | 2 | 1 | 0 (exact) | −0.470 | 3.80 | 30131 War-Helm |
| Crystalforge 629 | 4 | 1 | −9.925 | −26.772 | 4.96 | 30131 War-Helm, 30133 Shoulderbraces, 30132 Greaves |
| Justicar 626 | 4 | 0 | −3.876 | −80.557 | 5.37 | 29073 Crown, 29075 Shoulderplates, 29071 Breastplate, 29074 Greaves |

- **Composition rule verified.** `selectPackage` (set-value.ts:138-208) counts
  the worn 30129 Crystalforge Breastplate as-is toward `t` and never re-selects
  its slot; `packageItemIds` lists **added pieces only** — exactly ADR-0023
  decision 2's "names the completing items". CF 4pc = worn chest + 3 added
  (helm/shoulder/legs, the 3 best CF singles: −0.47/−10.77/−5.61, gauntlets
  −18.53 correctly excluded; Justicar 4pc likewise excludes Gauntlets −25.43,
  the worst of 5).
- **Selection ranking verified.** LB 2pc picked legs +7.66 and chest +3.11, the
  two best LB singles per open slot — correct highest-`deltaDps`-first.
- **Per-row threshold walk verified** against every setContext row: LB rows
  (0 worn → after 1) get `nextThreshold: 2`, prospective +0.545; Justicar rows
  get `nextThreshold: 4` (2pc unimplemented, walk skips — the spec §2.3
  Nordrassil-symmetric case) with prospective −3.876; CF candidate rows
  (after 2) get `nextThreshold: 4`, `crossesThreshold: true`; worn CF
  breastplate row (owned, after == before == 1) gets `nextThreshold: 2` and no
  prospective (ticket 95's rule, rank.ts:1212-1215). All per rule.
- **`breaks` empty is correct, not a serialization gap.** rank.ts:1148 emits
  `breaks` only when non-empty. The LB and Justicar 4pc packages each displace
  the worn CF breastplate, but CF at 1 piece meets no implemented threshold, so
  `brokenSetBonuses` correctly finds nothing to lose (set-value.ts:266-271).
  Feral never exercised "displaces a below-threshold set piece"; ret does, and
  it behaves.
- **Cases feral never exercised** (feral wore 0 or 2 of a set, never
  threshold−1): the two anomalies below (Task 2), plus a cosmetic one — CF
  rows with `crossesThreshold: true` show `nextThreshold: 4` with **no**
  prospective figure (suppressed by the `!crossesThreshold` guard at
  rank.ts:1216). 30130 CF Gauntlets ends up with neither a prospective figure
  nor a `package` (not a member), so its row says "next threshold 4" and
  nothing else. Design-consistent but a new pairing; cosmetic.

## Task 2 — negative bonus figures: ANOMALY (two structural findings), figures themselves plausible

Definitions first (set-value.ts:337-350): `packageDeltaDps` = one sim of the
completed package vs baseline — net of everything, the only ADR-0024-scoreable
figure. `bonusDps` = `packageDelta − Σ singles − bonus(2pc)` — a derived
residual meant to isolate the set bonus, actually equal to
*bonus + cross-item interaction + noise*.

Arithmetic re-verified from the artifact's own rows: LB 4pc
−6.835 − (−1.34 −7.50 +3.11 +7.66) − 0.545 = −9.310 ✓; CF 4pc
−26.772 − (−0.47 −10.77 −5.61) − 0 = −9.925 ✓; Justicar
−80.557 − (−76.67) = −3.876 ✓ (no 2pc term passed — correctly absent, not 0,
since Justicar 2pc is unimplemented).

**Implied SE.** Per-sim SE = stdev/√3000 ≈ 2.17; `combineSe` (independence
assumption, documented "conservative") gives √3·2.17=3.76 (CF 2pc, reported
3.80), √5→4.96 (CF 4pc ✓), √6→5.41/5.37 (LB/Justicar 4pc ✓). So −9.31 is
−1.7σ and −9.92 is −2.0σ *under the conservative SE*; paired seeds make the
true SE smaller, i.e. more significant, not less.

**Are the negatives legitimate?** Expected true bonuses on this APL are ≈0:
verification.md's V1 table records CF 2pc/4pc as mana-cost/heal effects and
Justicar 4pc as masking Judgement of Command, which the Seal-of-Blood APL never
casts; LB 4pc is +10% Hammer of Wrath only (execute-phase sliver). And
verification.md §8.4's earlier **max-phase-2** run already produced CF 4pc
−9.26 and Justicar −4.57 and called them "noise around a true zero". Today's
−9.92/−3.88 reproduce those, but with shared fixed seeds the repetition is not
independent evidence — **hypothesis, untested:** the ~−9 to −10 residual is a
deterministic cross-item interaction term of the method (four simultaneous
swaps vs four singles is not additive: cumulative hit/stat loss, gem/enchant
carry differences), not sampling noise. Either way −9.9 does not indicate a
break confound (breaks are genuinely empty) and is consistent with T≈0.

**ANOMALY A — self-set multi-charge at threshold−1 worn (first exercised by
ret, unrecorded anywhere).** With 1 CF piece worn, *every* CF single
individually crosses the 2pc threshold (worn chest + candidate = 2), so each
of the 3 singles in `Σ singles` contains the 2pc bonus, while the package
contains it once and the subtracted `twoPieceBonus` is 0 (see Anomaly B).
Net: **reported bonus(4) = 4pcB − 2·2pcB + interactions** — the same
`(k−1)·B` arithmetic ADR-0023 documents for *cross-set* breaks, happening
*inside the completing set*, with no `breaks` entry and no suppression,
because `brokenSetBonuses` only looks at other sets. Numerically immaterial
here (CF 2pc is a mana effect, ≈0 DPS), but a set with a strong 2pc at exactly
1 worn piece would be badly wrong — on the feral numbers, Malorne-at-1-worn
would subtract ~2×131 ≈ 262 DPS from its 4pc figure. Needs an owner
decision/ticket; ADR-0023's confound analysis does not cover it.

**ANOMALY B — CF 2pc "0.00 DPS" is zero by construction, not a measurement.**
At 1 worn, the 2pc completion package is one added piece, so the package sim
*is* the single-swap sim (identical equipment; bonusDps is exactly 0, and the
reported se 3.80 counts three sims where only two distinct ones exist). The
console/panel prints "Crystalforge Battlegear 2pc (1 worn) — 0.00 DPS" as if
measured; the 2pc's real value is unmeasurable by this method at threshold−1
worn (it is confounded into the helm's own −0.47 single). A reader (and the
next calibration exercise) can mistake "0.00" for "this bonus is worth
nothing". Suggest reporting this case as unmeasurable-at-this-worn-count
rather than 0. Owner decision.

## Task 3 — ticket 94 setId join re-derived: benign CONFIRMED where classifiable, but ret exposes two classifier blind spots

Where it lives: `dead-slots.ts` is engine-side and consumed **only** by
`plausibility.ts:deadSlotWarnings` — there is no `deadSlots` key in the JSON
and none was expected; classifications reach the artifact only as fired
warnings.

The five causes (dead-slots.ts:39-55, the ticket's four plus a later
`unknown-item`): `set-break-toll` ("Every candidate displaces a worn set piece
and pays that set's lost bonus"), `unique-effect` ("The worn item's effect has
no equivalent in the pool; no set involved"), `thin-pool` ("Too few candidates
for 'worn item is best' to mean anything"), `unknown-item` (worn item absent
from the index — a data gap, not a finding), `benign-nothing-better` ("A real
pool, no set, nothing better — not a defect").

Re-derivation over the artifact (script logic mirrors classifyDeadSlots;
per-slot best/worn/gap computed from `ranking.items`):

- **12 of 14 slots are alive** (best > 0): back +15.82, chest +15.25, feet
  +13.92, finger +22.63, hands +5.28, head +19.73, legs +13.45, neck +0.43,
  shoulder +1.80, waist +47.75, weapon +43.61, wrist +9.02. Ticket 94's old
  ret dead zones (shoulder/head/hands/wrist, gaps −0.2…−16 on the old
  artifact) are simply **not dead** in this run, so the "benign" question is
  moot for them. The setId join on all 15 worn items finds exactly one set
  piece — 30129 CF Breastplate (629) at count 1, below any implemented
  threshold (`thresholdLostByDroppingOnePiece` → null) — so **no ret slot can
  be a set-break toll; nothing reclassifies. Benign confirmed by the join, not
  just by gap magnitude.**
- **Two slots ARE dead and both are silently dropped before classification:**
  - `ranged`: n=4, best −13.81 (Tome of the Lightbringer). The worn Libram of
    Avengement 27484 is **not in the ret-p3 universe** (verified: absent from
    `entries`; the 4 ranged rows are 23203/28592/30063/32368), so no row has
    `deltaDps === 0` and `wornRowOf` returns null → slot skipped (documented
    "honest" outcome; ticket 41's known worn-item-uncomparable case). Would
    have been `thin-pool` (n=4 = THIN_POOL_CANDIDATES... n=3 candidates after
    excluding a worn row it can't find, so actually below the 4-candidate
    bar) if classifiable.
  - `trinket`: n=21, best 0.00 — no positive candidate. Both worn trinkets
    (28830 DST, 29383 Bloodlust Brooch) rank at exactly 0, so
    `wornRowOf` finds two zeroed owned rows → ambiguous → null → skipped.
    **Structural: the merged two-slot trinket (and finger) bucket always has
    two owned rows at 0, so those slots can never be classified for any
    character.** Feral never hit this (its trinket slot had positive
    candidates).

Verdict: the ticket-94 join confirms benign; no toll. But ret's artifact shows
the dead-slot gate is blind to *both* of ret's genuinely dead slots, for two
different unrecorded reasons. FINDING, needs owner decision (probably a
ticket: dual-slot buckets and unrankable-worn-item slots fall out of the gate
silently).

## Task 4 — plausibility gates: PASS (no-warnings is correct per implementation), one deliberate gap noted

- **Magnitude gate** (plausibility.ts:108-139): fires only on `bonusDps > 0`
  exceeding 7.5% of baseline = **150.3 DPS** here. Largest positive ret bonus
  is +0.545. No fire — correct.
- **Negative bonuses are exempt by design**: `if (b.bonusDps === undefined ||
  b.bonusDps <= 0) continue;` with a comment conceding "a strongly negative
  bonus is suspect too… reporting it as 'too large' would misdescribe it".
  So −9.92 at ~2σ negative passes silently, per implementation. Given Anomaly
  A (a self-set confound produces exactly negative distortions), the missing
  negative-side gate is now a live gap, not a theoretical one. No ticket
  covers it as far as I can find. FINDING (small).
- **Dead-slot gate**: warns on `set-break-toll` / `unique-effect` /
  `unknown-item` only. Ret produced zero classifications at all (Task 3), so
  zero warnings is what the code must produce — but note the silence rests on
  the two blind spots above, and plausibility.ts:60-63's own comment already
  warns "treat a missing warning as weak evidence".
- **Serialization**: NOT a finding. `plausibilityWarnings` is attached to the
  `Ranking` only when non-empty (rank.ts:859), the JSON export writes the
  ranking object verbatim (cli.ts:543-547), the console prints warnings
  unconditionally (cli.ts:440-447), and the HTML renders a dedicated open
  `<details>` panel (rank-report.ts:482-488). A fired warning reaches all
  three surfaces; absence from this JSON means **empty, not unserialized**.

## Task 5 — ticket 117 record: 13 meta-socket heads, bypass NOT exercised on this artifact (0 epic fills)

The JSON carries **no gem-fill data at all**: `ranking.items` rows have no
gems/fill field, and top-level `substitutions` holds only the 30892 drop
disclosure. So the table below was produced by replaying the engine's exact
swap path (`equipmentForCandidateSwap`, exported at rank.ts:1424) on the
fixture gear with ret p2 EP weights and `gemsForPhase(3)` — pure functions, no
sims (probe: scratchpad `probe_ret_head_fills.mts`; fillPalette 106 gems, max
quality 3 = rare cap honoured; full palette 201 for repairMeta).

Worn head 32461 Furious Gizmatic Goggles carries [32409 meta, 24054 Nightseye]
— **both sockets gemmed**, and baseline `repairMeta` is a no-op
(`metaAdjusted: false`, no swaps: the worn outfit already satisfies the meta).

| itemId | head | rank / Δ | final head gems after fill+repairMeta | epic in coloured socket? |
|---|---|---|---|---|
| 32235 | Cursed Vision of Sargeras | #6 / +19.73 | 32409(q3), 24054(q3) | no |
| 32373 | Helm of the Illidari Shatterer | — / +2.85 | 32409, 24054 | no |
| 32376 | Forest Prowler's Helm | #31 / +7.50 | 24054, 32409 | no |
| 30989 | Lightbringer War-Helm | — / −1.34 | 24054, 32409 | no |
| 32241 | Helm of Soothing Currents | — / −60.25 | 24054, 32409 | no |
| 32354 | Crown of Empowered Fate | — / −63.14 | 32409, 24054 | no |
| 32240 | Guise of the Tidal Lurker | — / −61.13 | 32409, 24054 | no |
| 32521 | Faceplate of the Impenetrable | — / −68.29 | 32409, 24054 | no |
| 32461 | Furious Gizmatic Goggles (worn) | — / 0.00 | 32409, 24054 | no |
| 30131 | Crystalforge War-Helm | — / −0.47 | 24054, 32409 | no |
| 32041 | Merciless Gladiator's Scaled Helm | — / −13.14 | 32409, 24054 | no |
| 32087 | Mask of the Deceiver | — / −25.76 | 24054, 32409 | no |
| 29073 | Justicar Crown | — / −18.08 | 24054, 32409 | no |

(Gem order = the item's socket order; the meta socket position varies. Fill
pre-repair equals final in every row.)

**Why the bypass didn't fire:** `migrateGemsToItem` carries both worn gems onto
every candidate (all 13 heads have exactly 2 sockets), so
`fillEmptyCandidateGems` finds no empty socket and `repairMeta` has nothing to
repair. Ticket 117's defect needs an *empty* coloured socket or an unsatisfied
meta condition; slamaltman's fully-gemmed worn head masks it. **The defect
remains latent for ret** — any character whose worn head has fewer gems (or no
head sockets, like feral's Wolfshead) puts all 13 of these rows, including the
T6 Lightbringer War-Helm inside the LB 4pc package, back in the blast radius —
survey §5's point that 117's "no T6 piece has a meta socket" escape does not
hold for ret stands. RECORD ONLY; no fix here.

## Task 6 — hunter item 30892 (for a W5 ticket)

Beast-tamer's Shoulders entered `data/universes/ret-p3.json` as an ordinary
epic **mail** (armorType 3) shoulder from Hyjal/Kaz'rogal (phase 3, quality 4,
curationHint 61.23) — paladins wear mail, so armor-type eligibility passes.
Ticket 25's now-enforced `classAllowlist` filter cannot catch it because the
pinned `vendor/wowsims/db.json` entry carries `classAllowlist: null` (and no
set fields); the item's hunter-only nature exists *only* as a Go-side
`itemEffects` registration in `sim/hunter/item_sets.go:244`, whose
`hunter.HunterAgent` type assertion panics when the effect is applied to a
`RetributionPaladin`. The engine handled it correctly at run time: the swap's
sim failed, the candidate was dropped from the ranking, and the drop is
disclosed in `ranking.substitutions[0]` with the full panic. So this is a
data-side eligibility gap (upstream db has no class restriction recorded for
effect-bearing items) with a working engine-side backstop; a W5 ticket should
decide between a local denylist/effect-class map and accepting drop+disclose
as the durable behaviour.

## Ranked findings

1. **ANOMALY (owner decision) — self-set 2pc multi-charge at threshold−1
   worn:** reported bonus(4) = 4pcB − 2·2pcB when 1 piece is worn, because
   every single crosses the 2pc; same `(k−1)·B` arithmetic as ticket 90 but
   inside the completing set, invisible to `breaks`. ≈0 impact for
   Crystalforge (mana 2pc), ~−262 DPS if it had been Malorne. Unrecorded in
   ADR-0023/spec. (set-value.ts:337-350 + rank.ts singles path.)
2. **ANOMALY (owner decision) — CF 2pc "0.00 DPS" is zero by construction:**
   at 1 worn the 2pc package is the single swap itself; the printed figure is
   not a measurement and the bonus is unmeasurable by this method at
   threshold−1 worn. Presentation invites "worth nothing" misreads and could
   poison future calibration.
3. **FINDING — dead-slot gate blind to both actually-dead ret slots:** ranged
   (worn libram not in universe → no zero row) and trinket (two owned rows at
   0 → `wornRowOf` ambiguity; dual-slot buckets are permanently
   unclassifiable). classifyDeadSlots drops both silently; no warning fired.
   (dead-slots.ts:140-145, 172-173.)
4. **FINDING (small) — no negative-magnitude plausibility gate:** deliberate
   (plausibility.ts:104-107 comment) but now live given finding 1 produces
   specifically negative distortions; ret's −9.9 at ~2σ passes silently and no
   ticket tracks the gap.
5. **PASS — package construction per ADR-0023:** compositions, best-per-slot
   selection, worn-piece counting, added-only `packageItemIds`, threshold
   walks, and correctly-empty `breaks` (displaced CF piece is below
   threshold) all verified against the artifact.
6. **PASS — plausibility serialization:** fired warnings reach console, JSON
   and HTML; this artifact's absence means genuinely empty.
7. **RECORD (ticket 117) — 0 of 13 meta-socket heads show epic fills:** worn
   head is fully gemmed so migration leaves nothing to fill and repairMeta is
   a no-op; the bypass is latent for ret, not disproven, and the T6 LB
   War-Helm keeps ret inside 117's blast radius on other characters.
8. **RECORD (W5) — 30892:** admitted because db.json has `classAllowlist:
   null` for it (ticket 25's filter can't see Go-only effect restrictions);
   engine dropped + disclosed correctly.
9. **Cosmetic — `crossesThreshold` rows show `nextThreshold: 4` with no
   figure** (prospective suppressed by design); 30130 CF Gauntlets carries
   neither a figure nor a package.

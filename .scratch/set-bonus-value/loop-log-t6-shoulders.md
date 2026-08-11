# Loop log — why don't T6 shoulders surface as an upgrade?

Brief: `.scratch/set-bonus-value/loop-brief-t6-shoulder-upgrade-invisible.md`
Branch: `feat/set-bonus-value`. Started 2026-08-10.

Artifact under study (regenerated today at the current tip):
`.scratch/rank-reports/shredzepelin-p3.json` / `shredzepelin-p3-default.html`.

---

## Iteration 1 — read the package figure the artifact already carries

**Hypothesis.** The report has no figure resembling the user's +97, which is why
no surface can show it.

**Command.**

```
python -c "import json; d=json.load(open('.scratch/rank-reports/shredzepelin-p3.json')); \
print(json.dumps([b for b in d['ranking']['setBonuses'] if b['setId']==676], indent=1))"
```

**Result.** It does carry one, and it is not +97:

| field | Thunderheart 2pc | Thunderheart 4pc |
|---|---|---|
| `packageItemIds` | 31034, 31044 | 31048, 31042, 31034, 31044 |
| `packageDeltaDps` | **+76.50** | **+64.07** |
| `bonusDps` | 31.46 | 193.89 |
| `se` | 4.02 | 6.32 |
| `breaks` | — | Malorne 2pc, 2→0 |

**Verdict.** Two facts, not one. (a) The pipeline *does* compute a whole-package
number for exactly the swap the user measured. (b) That number is **+64.07**,
vs the user's **+97** — a 33 DPS gap that Phase 1 must explain before any
display change is justified, because option (a)/(b) of the brief both propose
putting `packageDelta` in front of the reader.

---

## Iteration 2 — does the arithmetic of the −74 close?

**Hypothesis.** The shoulder row's displayed −74 under full set-potential
weighting is exactly `deltaDps + prospectiveBonusDps`, with the 4pc suppressed
per ticket 90.

**Command.**

```
python -c "
sing={'shoulder':-106.15923272950226,'chest':-100.15749732337008,
      'hands':21.750410060580634,'legs':23.290563089163243}
print('sum singles', sum(sing.values()))
print('pkg4 - sum singles =', 64.07344025189468 - sum(sing.values()))
print('minus 2pc          =', 64.07344025189468 - sum(sing.values()) - 31.459750845162944)
print('shoulder weighted  =', sing['shoulder'] + 31.459750845162944)
"
```

**Result.**

```
sum singles        = -161.2758
pkg4 - sum singles =  225.3492      (= bonus(4pc total))
minus 2pc          =  193.8894      (= stored bonusDps for threshold 4)  EXACT
shoulder weighted  =  -74.6995      (= the -74 the user sees)            EXACT
```

The stored `bonusDps` reproduces to 10 significant figures from the artifact's
own singles and `packageDeltaDps`, so the spec §2.2 formulas are implemented as
written and no rounding or stale-cache story is involved.

**Verdict.** Confirmed. −74.70 = −106.16 (single swap, which forfeits the whole
Malorne 2pc) + 31.46 (the 2pc credit, the only threshold the row can reach at
`piecesAfterSwap = 1`). The 4pc's 193.89 is suppressed from the sort key by
ticket 90 because its `breaks` array is non-empty. Every component is behaving
to spec; the display is the failure, not the arithmetic. This matches the
brief's own framing and is now verified against the **regenerated** artifact
rather than the stale one.

Also confirmed against ADR-0023 decision 3: `193.89 − B(131.1) = 62.79`, which
is the de-confounded 4pc and sits within 1.7 SE of the isolated measurement
**73.5 ± 6.3**. The confound model `reported = T + (k−1)·B` at k=2 holds.

---

## Iteration 3 — reproduce the user's +97 on the pinned binary (Phase 1.1)

**Hypothesis.** Simming shredzepelin's actual gear against the same gear with all
four T6 pieces substituted reproduces the user's +97, and the artifact's +64.07
is the same quantity.

**Command.** New script mirroring `measure_set_bonus.py`'s conventions
(seeds `[11,22,33,44,55]`, 3000 iterations, wowsimcli v0.0.101, socket-parity
filler gem 32194):

```
python .scratch/set-bonus-value/measure_shredzepelin_t6.py
```

Gear sourced from `test/fixtures/shredzepelin-cat.raw.json` (the fixture
`cli.ts:340` loads for this character), mapped WCL→sim via
`packages/core/src/slots-table.json`.

**Result.** Guard passed decisively: BASE mean **2152.13** vs the artifact's
`ranking.baseline.dps` **2152.0998** — a 0.03 DPS difference, so the gear
reconstruction is the same character the artifact ranked.

| arm | mean DPS | delta vs BASE | per-seed spread |
|---|---|---|---|
| BASE | 2152.13 | — | 0.3 |
| **T6_ALL** | 2232.93 | **+80.80** | 0.7 |
| T6_shoulder | 2051.90 | −100.23 | 1.0 |
| T6_chest | 2056.32 | −95.81 | 0.4 |
| T6_hands | 2173.37 | +21.24 | 0.9 |
| T6_legs | 2178.60 | +26.47 | 0.1 |

Worn pieces displaced: shoulder 29100 and chest 29096 are **both Malorne**
(hence k=2), hands 29947, legs 28741.

Empirical threshold check via the player's `resources` array length:
**BASE = 19, T6_ALL = 18.** The extra stream is present on the gear that wears
2 Malorne and absent once the package displaces both — the same empirical
signature the earlier campaign used to confirm the Malorne 2pc energy proc is
live. The break is real and measured, not inferred.

**Verdict.** The package is a **genuine, large upgrade — reproduced at +80.80 on
our own pinned binary**, against a per-seed spread under 1 DPS. The user's
direction and rough magnitude are confirmed. Three figures now exist for one
swap and they must be reconciled: **+64.07** (artifact), **+80.80** (this
repro), **+97** (user's wowsims web UI).

Note the singles reproduce closely (artifact vs repro: shoulder −106.16/−100.23,
chest −100.16/−95.81, hands 21.75/21.24, legs 23.29/26.47 — all within a few
DPS), but the **package diverges by 16.72 DPS**, an order of magnitude more than
the per-seed noise. That asymmetry says the gap is structural in how package
equipment is gemmed, not statistical.

---

## Iteration 4 — why does the artifact's package (+64.07) sit *below* a naive-gem repro (+80.80)?

**Hypothesis.** The divergence is gem policy. This repro gems each substituted
piece with flat filler 32194 (+8 agi) to its own socket count. Production builds
the package by applying `equipmentForCandidateSwap` **sequentially, one piece at
a time** (`rank.ts:1037-1045`), and that helper runs a real gem solver:
`migrateGemsToItem` → `fillEmptyCandidateGems` → `repairMeta`
(`rank.ts:1376-1430`).

**Command.** Read the helper and its options builder.

```
grep -n "equipmentForCandidateSwap" packages/core/src/rank.ts
sed -n '1376,1455p' packages/core/src/rank.ts
```

**Result.** `fillOptsForSwap` (`rank.ts:1432-1452`) computes `usedUnique` — the
set of **unique** gem ids already socketed *elsewhere in the equipment* — and
passes it as an exclusion, plus a meta-gem context. Applied **sequentially**,
each successive package piece therefore sees the previous pieces' gems already
placed and is denied any unique gem they consumed. Socket counts differ per
slot (legs 28741 has 3 sockets vs T6 31044's 1; hands 29947 has 0 vs 31034's 1),
so the package also loses net socket capacity.

**Verdict.** Mechanism identified and directionally correct: sequential
unique-gem exclusion and meta repair make production's package **strictly more
constrained** than a repro that hands every piece the same non-unique filler,
which is why the pipeline's +64.07 is the most conservative of the three
figures. This is a *real property of the gemming the pipeline commits to*, not a
bug — spec §2.2 step 1 deliberately requires byte-identical gem policy between
package and single swaps so PLAN.md §9's symmetry invariant holds.

**Consequence for the display question — this is the important part.** All three
figures agree on **sign and rough magnitude**; they disagree by ~30 DPS on
exactly how large the win is, for well-understood gemming reasons. So
`packageDeltaDps` is **fit to disclose** (it is our own pipeline's honest,
conservative, symmetry-preserving figure for the package) and the user's ground
truth is **reproduced, not explained away**. Nothing here justifies changing a
ranked number; it justifies surfacing a number the reader currently cannot see.

---

## Iteration 5 — where does the display lose the package truth? (Phase 2.3)

**Hypothesis.** The shoulder row and the Set potential panel between them show
every figure except the one that answers the user's question.

**Command.**

```
python -c "h=open('.scratch/rank-reports/shredzepelin-p3-default.html',encoding='utf-8').read(); \
print('64.07 present?', '64.07' in h); print('76.50 present?', '76.50' in h); \
print('193.89 present?', '193.89' in h)"
```

**Result.**

```
64.07 present?  False
76.50 present?  False
193.89 present? True
```

The rendered panel line is:

```
Thunderheart Harness 4pc (0 worn) — [breaks Malorne Harness 2pc (2->0); nets this in]
  +193.89 DPS — add Thunderheart Pauldrons, Thunderheart Chestguard,
  Thunderheart Gauntlets, Thunderheart Leggings
```

**Verdict — this is the root cause, and it has two distinct defects.**

**Defect A — the honest figure is computed and then discarded.**
`packageDeltaDps` (+64.07 for the 4pc, +76.50 for the 2pc) is measured by a real
sim, stored in `Ranking.setBonuses`, present in the JSON artifact — and rendered
by **no surface at all**. `formatSetBonusLine` (`rank-report-rules.ts:143-151`)
reads only `b.bonusDps` and `b.unmeasured`. The one quantity that directly
answers "what happens if I equip all four?" — the quantity the user measured on
wowsims, reproduced here at +80.80 — is the only one the reader cannot see.

**Defect B — `formatBreaksPrefix` states something false.** Its text is
`[breaks X; nets this in]` (`rank-report-rules.ts:164`), attached to
**`bonusDps`**. But `bonusDps = packageDelta − Σ singles` does **not** net the
break in — it is precisely the quantity ADR-0023 decision 3 describes as
inflated by `(k−1)·B`, here `+193.89` against a de-confounded `62.79`. The
figure that genuinely nets the break in is `packageDeltaDps` (+64.07), which is
exactly the one not shown. So the qualifier promising honesty is bolted onto the
inflated number, ~3x the truth, while the honest number is dropped.

This is a stronger finding than the brief anticipated. The brief framed the task
as "add a disclosure so the shoulder row can reach the package truth". It is
also a **correctness defect in existing disclosure text**: a reader who trusts
"nets this in" reads 193.89 as a net-of-break package value and concludes the
package is worth ~194 DPS, when our own pipeline says ~64 and the sim says ~81.

**Why the shoulder row reads −74 while the package is a real win** — the full
chain, every link verified above:

1. Row is a **single swap**. `piecesWornBefore=0 → piecesAfterSwap=1`.
2. `nextMeasurableThreshold` stops at the first implemented threshold strictly
   above 1, i.e. **2** (ADR-0023 decision 1). The 4pc is unreachable from any
   row — structurally, in every view mode.
3. So `prospectiveBonusDps = 31.46` (the 2pc), never the 4pc.
4. `deltaDps = −106.16`, correct: the swap displaces a Malorne piece and
   forfeits the whole **131.1 DPS** Malorne 2pc, measured, and confirmed here by
   the `resources` 19→18 signature.
5. Full-credit view: `−106.16 + 31.46 = −74.70`. Weighted: `−106.16 + 0.5·31.46
   = −90.43`.
6. The 4pc's figure is `setPotentialIsConfounded` (non-empty `breaks`), so it is
   suppressed from sort key and cutoff (ticket 90 / ADR-0023 decision 3) — it
   could not rescue the row even if a row could reach it.

Every one of those six steps is individually correct and defensible. The row is
**−74 because it is being asked a different question than the user asked.** The
user asked "what do all four do together" (+97 / +80.80 / +64.07, all positive);
the row answers "what does this one piece do tonight" (−106, correctly negative
because it half-breaks Malorne for no compensating threshold). Both are true.
Only one is displayed with a number, and the other's honest number is
computed-then-dropped.

---

## Iteration 6 — evaluate the candidate fixes against the constraints (Phase 2.4)

**Hypothesis.** Some option surfaces the package truth without relitigating a
settled decision.

The brief's options, judged against spec §2.1/§4/§7, ADR-0020, ADR-0023,
PLAN.md:272, and ticket 90's no-confounded-figure-in-a-sort-key rule:

| option | verdict |
|---|---|
| (a) full-credit view puts `packageDelta` on member rows | **Rejected — needs a spec amendment.** Even though `packageDelta` is *not* the confounded quantity (the brief is right about that), putting it in the sort key credits one package figure to each of four rows, which is spec §2.1's per-piece split by another name and quadruple-counts against ADR-0020's absolute cutoff. Also collides with ADR-0023 decision 2. Not implementable here. |
| (b) per-row phrasing "as part of the package: +X" | **Viable but weaker.** Restates a package figure on a row, which ADR-0023 decision 5 explicitly forecloses ("a row may point at the panel, but never restate its figure"). The existing `formatCuratedPackagePointer` already does the compliant, numberless version of this. |
| (c) dedicated ranked packages section | **Rejected — spec §7.** "Ranking whole packages as recommendations" is named out of scope. |
| **(d) state `packageDeltaDps` in the panel** *(not in the brief's list; found in iteration 5)* | **Chosen.** Pure disclosure on a surface that already exists and is already default-on (ADR-0023 decision 4). Moves no sort key, no cutoff, no `deltaDps`. Adds no new figure — it renders a number the pipeline already measures, stores, and ships in the JSON. |

Option (d) was not in the brief because the brief assumed the honest package
figure had to be *introduced*. It did not — it only had to be *rendered*.

**Verdict.** (d) is disclosure-only and therefore inside the brief's Phase 3(a)
"already-decided design space" test. Implement. Options (a)/(c) would each need a
spec amendment and are **not** implemented here; (b) is already served in its
ADR-compliant form.

---

## Iteration 7 — implement and verify against the real artifact (Phase 3)

**Hypothesis.** Rendering `packageDeltaDps` and correcting the false "nets this
in" claim makes the panel tell a truth a wowsims user would recognise.

**Commands.** Red first, three new tests in
`packages/core/test/rank-report.test.ts`, confirmed failing for the right
reasons; then green:

```
npx vitest run packages/core/test/rank-report.test.ts   # 3 failed -> 87 passed
pnpm verify                                             # exit 0
```

Changes (commit `ed58c79`), both in `packages/core/src/rank-report-rules.ts`:

- new `formatPackageDelta` — renders `packageDeltaDps`, omitted when
  `unmeasured` (a structural zero, not a simmed one);
- `formatBreaksPrefix` — `"nets this in"` → `"figure inflated by it"`.

Three pre-existing exact-match assertions were updated (two in
`rank-report.test.ts`, one in `cli-shortlist.test.ts`); each change is the new
clause inserted into an otherwise identical string.

**Result.** Rendering the real artifact's `setBonuses` through the shipped
function:

```
Thunderheart Harness 2pc (0 worn) — +31.46 DPS — whole package +76.50 DPS vs current gear — add Thunderheart Gauntlets, Thunderheart Leggings
Thunderheart Harness 4pc (0 worn) — [breaks Malorne Harness 2pc (2→0); figure inflated by it] +193.89 DPS — whole package +64.07 DPS vs current gear — add Thunderheart Pauldrons, Thunderheart Chestguard, Thunderheart Gauntlets, Thunderheart Leggings
Nordrassil Harness 4pc (0 worn) — [breaks Malorne Harness 2pc (2→0); figure inflated by it] +185.10 DPS — whole package -21.18 DPS vs current gear — add Nordrassil Feral-Mantle, Nordrassil Chestplate, Nordrassil Handgrips, Nordrassil Feral-Kilt
```

**Verdict — passes, and the Nordrassil line is the proof it discriminates.**

A reader on the shoulder row now has a positive package figure to read the −106
against, naming the four items and the Malorne break. `+64.07` is the same
quantity the user measured at +97 and this loop reproduced at +80.80 — same sign,
same order of magnitude, differing by known gemming policy (iteration 4).

The **Nordrassil** line is the sharper evidence. On `bonusDps` alone,
Thunderheart (193.89) and Nordrassil (185.10) look like near-equivalent prizes.
On the package figures they are **+64.07 vs −21.18** — one is a real upgrade,
the other a net loss once its Malorne break is paid for. That distinction was
previously invisible in every view mode, and it is exactly the distinction
upstream's BiS list encodes by carrying T6 and not Nordrassil.

Sort-key audit: `weightedSetPotentialDps` is unchanged and still reads only
`deltaDps` + `prospectiveBonusDps` with `setPotentialIsConfounded` suppression,
so no confounded figure entered a sort key. Default view honesty is unchanged —
the panel was already default-on per ADR-0023 decision 4.

---

## Outcome

**Settled.** The report now communicates the package truth on the surface ADR-0023
designated for it, without moving a ranked number.

What is **not** done, deliberately: the shoulder *row* still reads −74 under full
set-potential weighting, and that number is correct — it is the honest value of
that swap tonight, which really does forfeit the measured 131.1 DPS Malorne 2pc.
Making the row itself positive requires crediting a package figure to a single
swap, which is spec §2.1 / §4 and ADR-0020 territory and would need a spec
amendment. This loop did not take that step and recommends against it: the four
member rows summing to −161 while their package is +64 is not an error to be
papered over, it is the real shape of a set transition, and the panel now states
both halves.

**Follow-up worth a ticket (not filed here):** our `packageDeltaDps` (+64.07)
is systematically more conservative than a naive-gem repro (+80.80) and the
user's web-UI run (+97), because sequential `equipmentForCandidateSwap`
application applies unique-gem exclusion and meta repair across the package
(iteration 4). That is defensible and spec-mandated, but it means package
figures read low against what a player will see in wowsims after re-gemming, and
nothing currently discloses that.

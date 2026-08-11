# Handoff: set-bonus tickets 90–99 resolved

Written 2026-08-10 by the orchestrating session, on `feat/set-bonus-value`.
**Nothing was landed, merged, or pushed.** The branch sits ready for review.

Supersedes the open questions in
`.scratch/handoffs/set-bonus-4pc-invisible-investigation.md`, which carried a
standing caveat that **no sims had ever been run**. Sims have now been run.

---

## The headline: every disputed number is now measured

The prior investigation left one live disagreement — the value of `B`, the
Malorne Harness (T4) 2pc bonus — with regression evidence saying 100–133 and SME
domain reasoning saying 15–40, and neither side having run a simulation. Four
measurement campaigns settled it and everything downstream of it.

| quantity | measured | prior belief | verdict |
|---|---|---|---|
| Thunderheart (T6) 4pc | **73.5 ± 6.3 DPS** | engine reported 193.89 | engine figure inflated ~2.6x |
| Thunderheart (T6) 2pc | **30.5 ± 5.5 DPS** | engine reported 31.46 | agrees — engine is right at k=0 |
| **Malorne (T4) 2pc = `B`** | **131.1 ± 6.6 DPS** | disputed 100–133 vs 15–40 | **regression camp right, SME wrong** |
| Malorne (T4) 4pc | **21.7 DPS** (Strength pricing) | engine reported 18.04 | agrees — engine was fine |

All runs: wowsimcli **v0.0.101**, seeds `[11,22,33,44,55]`, **3000 iterations**.

```
pnpm fetch:wowsimcli
python .scratch/set-bonus-value/measure_set_bonus.py    # Thunderheart, feral_p3_9p
python .scratch/set-bonus-value/measure_malorne.py      # Malorne 2pc (B), feral_p2_9p
python .scratch/set-bonus-value/measure_malorne_4pc.py  # Malorne 4pc, feral_p2_9p
python .scratch/set-bonus-value/price_strength.py       # DPS per Strength, feral_p2_9p
```

Raw output under `.scratch/set-bonus-value/sims/`, `sims-malorne/`,
`sims-malorne-4pc/`. Full write-up with per-seed tables:
`.scratch/set-bonus-value/measurements-2026-08-10.md`.

### How the B disagreement resolved

**By direct measurement, in favour of the regression camp.** The deciding run put
two Malorne pieces against matched non-set melee items on the phase-appropriate
`feral_p2_9p` reference set (which already wears exactly those two pieces,
mirroring the live configuration), and priced the stat difference using arms that
cross **no** bonus threshold:

```
stat price   shoulder 23.09   chest 23.98        (0->1 piece, no threshold crossed)
B = (M2 - M0) - (stat_shoulder + stat_chest) = 178.16 - 47.07 = 131.10 DPS
```

131.1 lands at the top of the regression's 100–133 band and ~3.5x above the SME's
15–40. It also matches the independent slot-intercept estimates (chest −133.4,
shoulder −131.0) to within 0.2 DPS.

**The corroborating mechanism**, from the sim's own output: the 2pc yields
**18,472 extra Shred casts (+11.3%)**. A cat rotation is energy-limited, so a
no-ICD proc that adds energy income converts almost entirely into extra casts.

**A caution that survived scrutiny:** the proc-mask detail (`ProcMaskMelee` =
white **and** specials, no ICD — `sim/druid/item_sets.go:83-102`,
`sim/core/flags.go:78`) points the right way but does **not** account for the
magnitude. Measured proc rate is only **3.66/min**, close to the SME's own ~2.5
assumption. Why the bonus is quite this large is explained by energy-starvation,
not by proc frequency.

### The surprise worth carrying forward

Malorne's **2pc is worth ~6x its own 4pc** (131.1 vs 21.7). The "4-piece is the
marquee bonus" intuition is **empirically false** for this set as the sim
implements it, and the Malorne hands are even a *negative* stat swap (−6.57)
against their non-set replacement. Two separate plausibility arguments in the
original tickets rested on that intuition; both were wrong.

**The measured mechanism:** the 0-piece rotation wastes **5.31%** of its energy
income to the cap, and the 2pc's extra energy is **98.8% absorbed**, converting
into **+11.3% Shred casts**. An energy proc on a rotation with headroom and a
flat +30 Strength stat stick are not comparable currencies — which is why piece
count predicts nothing. A gate asserting `4pc > 2pc` would reject a correct
measurement; bands should key on **mechanism**, not threshold. Ticket 98's gate
is calibrated on measured magnitudes only.

**Untested:** energy waste falls as gear improves (5.31% → 3.21% across the arms
measured), so the 2pc's value plausibly shrinks on later-phase gear.

---

## Commits (all on `feat/set-bonus-value`, none landed)

| SHA | ticket | what |
|---|---|---|
| `d1c2c87` | 95 | Stop worn set pieces advertising a bonus their swap cannot deliver |
| `283dd0b` | 90 | Keep break-confounded set bonuses out of ranking, but keep disclosing them |
| `2e0b499` | 93 | State the set-break confound as `(k-1)*B`, not "charged twice" |
| `426a82e` | 94 | Classify why a slot is dead, instead of counting dead slots |
| `915e3a3` | 91 | Make the Set potential panel carry the bonuses no row can |
| `ccf38be` + follow-up | 98 | Warn when a set bonus is implausibly large or a slot is dead for a reason |

Every code ticket was done red→green with tests confirmed failing first.

---

## Ticket dispositions

- **90 — closed.** Suppression, not numeric correction: a figure with non-empty
  `breaks` is zeroed out of the sort key and cutoff comparison while still being
  disclosed. Measurement now confirms the confound is ~120 DPS at k=2.
- **91 — closed** via design option **(d) package-as-card**, as the design review
  recommended. The panel names package contents from `packageItemIds` and leads
  with the `breaks` qualifier. Option (a) was rejected *because* of the
  measurement: smearing a fraction of the inflated 193.89 onto rows would have
  put an authoritative-looking wrong number into the sort.
- **92 — closed.** `B` = 131.1 ± 6.6. Dispute resolved; anomaly investigated and
  explained (see above).
- **93 — closed.** Docstring now states `reported = T + (k-1)*B` and that k=0 and
  k=1 both inflate by exactly zero. V0b re-diagnosed as the k=1 case.
- **94 — closed.** `packages/core/src/dead-slots.ts` classifies four causes via a
  `setId` join in the engine.
- **95 — closed.** Owned rows no longer advertise a threshold their swap cannot
  advance.
- **96 — OPEN, deliberately.** It did **not** dissolve, and the measurement
  explains why: the −100/−106 deltas are *correct* (a single swap really does
  forfeit the 131 DPS Malorne 2pc) and the BiS tag is *correct* (the completed
  package is genuinely best). It is a package-vs-single-swap framing mismatch,
  not a wrong number. Expected to be answered by ticket 91's panel; the remaining
  task is to confirm a reader on a BiS-tagged negative row can reach that
  explanation, and add a pointer if not.
- **97 — closed.** Falsification test **passed**: measured 73.5 lands inside the
  independently-derived 60–120 band. Both sourcing gaps closed — V1's
  transcription verified against the pin, and the recalled "~30% damage share"
  confirmed by measurement at **30.16%**.
- **98 — closed.** Two warning-only gates, calibrated from measured figures.
- **99 — closed.** Produced the measurement, and found that **its own specified
  formula was wrong** (see below).

---

## Methodological finding worth more than the numbers

**Ticket 99's specified ladder was confounded, and would have produced confident
garbage.** Its `Σ singles` prices each replacement by removing one tier piece
from the full 4-piece set — but that drops the set 4→3 and **destroys the 4pc**,
so every single already contains the whole bonus. Summing four of them subtracts
it roughly four times, returning a **negative** 4pc (−84.7, about 13 SE below
zero).

The fix, used in all subsequent runs: price stats only with arms that cross **no
bonus threshold** (restore one piece onto a zero-piece base, 0→1). Threshold
state was then verified *empirically* rather than assumed, by reading the
player's `resources` array length — 18 streams without the Malorne 2pc energy
proc, 19 with it.

**Generalisable rule: never price a stat swap across a configuration where the
number of active set bonuses changes.** Three separate runs in this work would
have been wrong without it.

---

## Corrections made during this session — do not re-cite the earlier versions

1. **`B = 193.89 − 73.54 = 120.35` — RETRACTED.** An orchestrator inference that
   differenced a Thunderheart 4pc measured on the P3 reference (~2442 DPS, no
   Malorne) against one measured on shredzepelin (~2152 DPS, 2 Malorne). The 4pc
   is a *multiplicative* modifier whose value differs between those characters,
   so the residual is not a Malorne 2pc. It landed near the right answer by luck.
   Caught by adversarial review; superseded by the direct measurement.
2. **"The proc mask explains the magnitude" — OVERSTATED.** Measured proc rate is
   3.66/min, close to the SME's assumption. Corrected in tickets 92 and 97.
3. **Ticket 99's legs B-side (32271 Kilt of Immortal Nature) is a healer item** —
   Int/HealingPower/MP5, losing Str/Agi/hit. It made that slot's stat price only
   4.19 DPS and is why legs is the outlier in the cross-slot check. The selection
   step checked `setName is None` but never "is this a melee item". The later
   Malorne runs verified melee-appropriateness explicitly.
4. **db.json stat id 31 is Armor, not attack power** (17=AP, 18=RAP, 20=hit,
   21=crit, per `data/proto/common.proto`). Reading 31 as AP badly misjudges item
   quality.

---

## Open questions and known limits

- **Ticket 96 remains open** — see its disposition for the one confirmation step.
- **No ADR on set bonuses.** `docs/adr/` still contains nothing on the subject,
  though the threshold-selection rule has now been decided once and
  mis-remembered once. Ticket 93 flags it; no ticket filed.
- **Ret is still unexercised.** There is no committed ret artifact with
  `setContext`, so ticket 94's "benign" classification for ret dead zones remains
  inference. Costs one `pnpm rank` on `ret-p3` with `--with-set-potential`;
  **not run here.**
- **All figures are reference-gear figures.** A bonus measured on a fixed gear set
  is not its value for a given character — an energy-throughput bonus scales with
  how energy-starved the rotation is. Do **not** write 73.5 or 131.1 into
  `set-value.ts` as a constant, and do not start subtracting 131.1 from reported
  figures; ticket 90's fix is deliberately a suppression, not a correction.
- **The p2 skeleton is used for P3 gear** (matching production, `cli.ts:282`), so
  the Thunderheart run is not phase-matched. Constant across arms, so it cancels
  in differences, but it sets the level at which the bonus is measured. The
  Malorne runs *are* phase-matched.
- **`THIN_POOL_CANDIDATES = 4` and `UNIQUE_EFFECT_GAP_DPS = -50`** (ticket 94) are
  calibrated on one artifact, not measured.

---

## The pre-merge review found two more silent failures — both fixed

Four fresh-context axes reviewed the branch (`docs/reviews/feat-set-bonus-value.md`,
second round). The adversarial axis found **two high-severity silent-failure
modes in the dead-slot classifier**, both of which survived the entire 615-test
suite green:

1. A tie at `deltaDps === 0` made the classifier pick the wrong worn row and
   then compute the runner-up gap over a set that still contained the other
   zero — so `[worn 0, clone 0, −300]` classified `benign-nothing-better` with a
   gap of 0, and since benign is not a warned cause, **the warning silently
   vanished**.
2. An item missing from `data/items/index.json` produced a confident
   `unique-effect` verdict, because the null set id skipped the toll branch. The
   report asserted "nothing matches this item's effect" when the truth was "we
   could not look it up".

Both fixed in `cfc77c9`: the worn row is identified from `owned` (actually
"is equipped") rather than a zero-delta proxy, ambiguity resolves to `null`
instead of an arbitrary pick, the gap is taken over strictly worse rows, and
an unresolvable item gets its own `unknown-item` cause that warns in its own
words.

**Carry this lesson forward:** those bugs were in the component added *this
round to catch silent confounds*. A safety net that fabricates a verdict when
its input is missing is worse than no net — the team then reads a missing
warning as evidence of health.

The domain axis independently confirmed all four claim-groups against the
pinned Go source and **accepted the 131 DPS Malorne 2pc**, showing the
arithmetic closes (Shred is 35.3% of damage; +11.3% Shred casts against a 2226
baseline is ~88 DPS from Shred alone, the rest from combo points feeding
Rip/Bite). Its verdict on the old estimate: "a proc-rate argument that never
priced the energy — wrong at the conversion step, not the rate step."

Three tickets filed from the review:

- **100** — ticket 91's Set potential panel is the only surface an unreachable
  bonus can reach, but it is gated on `withSetPotential`, which the spec defines
  as **default off**. The figure that reaches no row reaches no default reader
  either. **Resolve this before ticket 96**, whose contradiction that panel is
  supposed to explain.
- **101** — no ADR records the set-bonus threshold-selection rule (ticket 93's
  own closing ask).
- **102** — `CURATED_SET_PHASE` in `rank-report-rules.ts` is a hand-copied
  mirror of `assemble_universe.py` that stops at `p2` where the Python has `p3`;
  latent until p4 is pinned, then it silently suppresses a staleness warning.
  The wrong behaviour is test-locked.

## State of the branch

`pnpm verify` green at `cfc77c9` — 36 test files, 622 tests, 2 todo.
`pnpm land --check-only` green: **merge-ready: ok**, all 30 disposition rows
validated, every `defer` row resolving to an open ticket.

Review: `docs/reviews/feat-set-bonus-value.md`.

**Not landed. Not merged. Not pushed.** `pnpm land` was never run and
`TBC_ALLOW_DEV_MERGE` was never set.

---

## Follow-up round

Written 2026-08-10 by a second session, on `feat/set-bonus-value`. Resolves the
three tickets the pre-merge review filed (100, 101, 102) plus the one this
handoff left deliberately open (96). **Still not landed, merged, or pushed.**

| SHA | ticket | what |
|---|---|---|
| `b51f08c` | 100 | Show the Set potential panel to every reader, not just flagged ones |
| `e3eceb3` | 96 | Point a below-cutoff curated row at the panel that explains its BiS tag |
| `c2d3897` | 102 | Gate the `CURATED_SET_PHASE` mirror against the Python that produces it |
| `610d6db` | 101 | Record the set-bonus threshold and package-as-card decisions as ADR-0023 |

All three code tickets done red→green with the failing test confirmed first.

### Dispositions

- **100 — closed** via option 1 (decouple the panel from the toggle). The Set
  potential panel now renders whenever `ranking.setBonuses` is non-empty; the
  per-row credit and the sort key stay behind default-off `withSetPotential`.
  **No spec amendment was needed** — spec.md §4 states its default-off rule in
  terms of what moves the ranking, and the panel moves no number, so the spec
  text still describes the flag accurately.
- **96 — closed.** The confirmation step it was held open for came back **no**:
  a default reader on the 31042 row got the `BiS` tag, `-100.16`, and an ungated
  `setBonusNote` naming what the swap breaks — but nothing saying what the BiS
  tag was claiming, since the per-row set annotation is toggle-gated and nothing
  linked the row to the panel. Added `formatCuratedPackagePointer`
  (`rank-report-rules.ts`), which renders a text pointer on any curated-BiS row
  below cutoff carrying a `setContext`. **No figure is restated** and the
  `-100.16` / `-106.16` deltas are untouched, per this ticket's own constraint
  and ticket 90's suppression rule.
- **102 — closed** with a corrected mirror **plus** a drift gate, not codegen.
  `generate_json_literal_types.py` reads a JSON *string list*; `CURATED_SET_PHASE`
  is a Python dict of label→phase, so routing it through that machinery would
  have meant a new JSON export step and a new generator mode. Instead
  `scripts/check_curated_set_phase.py` re-derives the TS map from the file and
  compares it to the Python, wired into `pnpm verify`. The test-locked wrong
  expectation (`curatedSetPhase("p3") → null`) was inverted.
- **101 — closed.** `docs/adr/0023-set-bonus-thresholds-are-selected-nearest-measurable-and-packages-are-disclosed-not-scored.md`.

### Worth carrying forward

**The `102` gate was proved to fail, not just to pass.** Deleting the `p3: 3`
line and re-running exits 1 naming the drifted key; restored before commit. This
handoff's own earlier lesson — "a safety net that fabricates a verdict when its
input is missing is worse than no net" — applies equally to a net that never
fires, so the negative case was exercised deliberately.

**The golden-document repin in `e3eceb3` was diffed, not assumed.** The rendered
document was dumped on both sides and diffed: the whole delta is five CSS lines
and two empty interpolation slots, no visible markup. Instrumentation removed
before commit.

### State of the branch

`pnpm verify` green at `610d6db` — 36 test files, 624 tests, 2 todo, and the new
`curated-set-phase:check` gate passing.

`pnpm issues:open` no longer lists 90–102; all are closed.

**Not landed. Not merged. Not pushed.** `pnpm land` was never run and
`TBC_ALLOW_DEV_MERGE` was never set.

### Note for the concurrent session

This round touched `packages/core/src/rank-report-rules.ts` twice — a new
`formatCuratedPackagePointer` function and the `CURATED_SET_PHASE` map plus its
docstring. **Neither diff goes near `formatBreaksSuffix` or its doc comment**,
which another session was fixing a stale V0b citation in. `git status` was clean
of foreign modifications before each commit.

---

## Third round — tickets 111 and 112 (gem fill rarity cap, package-chip display)

Written 2026-08-11 by the orchestrating session, on `feat/set-bonus-value`.
**Still not landed, merged, or pushed.**

| SHA | ticket | what |
|---|---|---|
| `c57b034` | 111 | Carry gem `quality` into `data/gems/palette.json` (data prerequisite, data-pipeline-work rules; generator also fixed to write LF) |
| `97e07b4` | 111 | Cap candidate auto-fill at rare via `GemContext.fillPalette`; repair keeps the full palette. **Its message misstates meta quality — see ticket 111's CLOSED section** |
| `9c35e48` | 111 | `GEM_POLICY_QUALIFIER` restated as the gem model ("may read low" removed) |
| `03cd0d1` | 112 | Package-mode chips: own delta in `.d`, subordinate `pkg +X` span visible only under `body.package`; sort unchanged |
| `95ad7fc` | review | Correct the false metas-are-quality-4 claim (all 18 metas are quality 3); de-vacuate the meta-seating test |
| `a237501` | review | End-to-end proof maxPhase reaches the fill (phase-5 rares differ 2-vs-5), sensitivity shown by mutation |
| `be5fdf1` | review | Post-fix package arm rebuilt through the current engine: 24028 in 31034's socket, **delta +111.72** vs OWNER2_BASE (seeds [11,22,33,44,55] @ 3000, CLI v0.0.101; `sim_postfix_111.py`) |

Before/after ladder for the T6 4pc package arm (TypeSimple, from ticket 111):
**+113.42** pre-fix (epic 32194 invented) → **+111.72** post-fix (rare 24028)
→ +102.99 pure UI empty-socket reference → +98.17 owner's own web run.

`.scratch/rank-reports/shredzepelin-p3.html` regenerated (not committed):
package figure 64.07 → 64.09, Gauntlets own delta 21.75 → 18.57 (the capped
fill), and the 31048 chip now reads `-106.16` + `pkg +64.09` under package
mode instead of `+64.07` alone.

Fresh-context review (adversarial + spec axes over `81d2ef4..HEAD`): both axes
pass-with-findings, no runtime defect. A1/A2/S1/S2 fixed in the three review
commits above; A3, A4, and the uncapped exported `fillCandidateGems` filed as
tickets **114**, **115**, **116** rather than fixed (none was an honest
one-liner).

`pnpm verify` green at `be5fdf1`. Tickets 111 and 112 closed; 114–116 opened.

---

## Ret catch-up round

Written 2026-08-11 by the W5 docs worker of a serial orchestration
(director log: `.scratch/set-bonus-value/ret-catchup/DIRECTOR.md`; plan:
`.scratch/set-bonus-value/ret-catchup-plan-2026-08-11.md`; worker logs
`01-survey.md` … `05-docs.md` in the same dir). **Docs and artifacts only —
no code changed this round. Still not landed, merged, or pushed.**

The round closed this handoff's own standing gap: "Ret is still unexercised…
Costs one `pnpm rank` on `ret-p3` with `--with-set-potential`; not run here."
It has now been run.

### The first ret setContext artifact

`.scratch/set-bonus-value/ret-catchup/artifacts/slamaltman-p3.{html,json,console.log}`
(~65 min wall, 431 sims, wowsimcli v0.0.101, ret-p3 universe 394 entries).
Re-run:

```
pnpm rank --offline --region US --realm dreamscythe --character slamaltman --spec ret --max-phase 3 --with-set-potential --show-below-cutoff --report
```

Baseline **2003.51 ± 118.93** DPS. Set potential, 10 entries:

| set | threshold (worn) | bonus DPS | package DPS |
|---|---|---|---|
| Lightbringer 680 | 2pc (0 worn) | +0.55 | +11.31 |
| Lightbringer 680 | 4pc (0 worn) | −9.31 | −6.83 |
| Crystalforge 629 | 2pc (1 worn) | 0.00 | −0.47 |
| Crystalforge 629 | 4pc (1 worn) | −9.92 | −26.77 |
| Justicar 626 | 4pc (0 worn) | −3.88 | −80.56 |
| Justicar 2pc; Gladiator's Vindication 2/4pc; Burning Rage 2/4pc | — | unmeasured | "not implemented in the pinned sim" |

### Verifications (03-verify.md, 04-surfaces.md)

- **ADR-0023 package construction PASS**, including the worn-1 case feral
  never exercised: the worn CF Breastplate counts toward `t`, its slot is
  never re-selected, `packageItemIds` names added pieces only, and `breaks`
  is correctly empty (the displaced CF piece is below any implemented
  threshold).
- **Ticket 94's ret "benign" call VERIFIED** via the setId join this handoff
  asked for — 12/14 slots alive, the only worn set piece is CF chest at
  count 1, no toll possible. Verification note appended to the closed
  ticket; two classifier blind spots filed as ticket 124.
- **Ticket 117 is latent on ret, not escaped**: 13 meta-socket heads in
  ret-p3 including the T6 Lightbringer War-Helm (the "no T6 piece has a meta
  socket" escape does not hold), but 0/13 show epic fills on this artifact
  because the fully-gemmed worn head leaves repairMeta nothing to do. Second
  data set appended to ticket 117.
- **All report surfaces pass mechanically** (panel, toggles, ticket-96
  pointer, source filter, BiS-only wording, wowsims export, plausibility
  panel absence) — with one headline finding: **package display mode is a
  total no-op on this report** while its control still renders. Every
  row-attached package is a negative 4pc, the positive Lightbringer 2pc
  package (+11.31) attaches to no row under largest-threshold-wins, and
  nothing re-sorts. Ticket 91's intent inverted; ticket 118.

### Tickets filed this round

118 (package mode no-op / positive package unreachable), 119 (self-set 2pc
multi-charge at threshold−1 worn + zero-by-construction 2pc figure), 120
(negative-bonus plausibility exemption now a live gap), 121 (no upstream ret
p3 curated set to pin — W2b cancelled after gh api verification), 122
(effect-only class restriction admitted hunter item 30892; drop+disclose
worked), 123 (substitutions drawer embeds the raw 2.4KB Go panic), 124
(dead-slot classifier blind to dual-slot buckets and unrankable worn items),
125 (`--spec` missing from the usage string).

### INFO items, not ticketed

- **Justicar 2pc is "not implemented" while Justicar 4pc is measured** —
  plausible sim reality (only one bonus implemented), but flag for the next
  SME pass rather than assuming.
- **"Band of Eternity" appears twice in the curated strip** (#22 +9.12,
  #33 +6.51) — two of the 12 Scale of the Sands rep-rank ids above cutoff.
  Correct data, confusing label; a pool/label question, not a report bug.

### Lessons and caveats

- **W2 monitoring failure**: the generate worker backgrounded the ~65 min
  run and ended its turn without a disk handoff; the director's monitor sat
  on an untracked side-channel and only surfaced after intervention. The run
  itself succeeded. Lesson (DIRECTOR.md): verify worker liveness / prefer
  synchronous workers; the harness notifies on tracked children, a monitor
  on a side-channel can wait forever.
- **Fixture freshness unverified**: the slamaltman capture is 2026-07-26
  (Hydross kill, VGjFb3mtX9xHgyav fight 8) and, unlike shredzepelin, there
  is no current owner settings export to confirm against. "Snapshot = current
  gear" is unverified; the gear reads as early-P2 (1/5 Crystalforge).

**Not landed. Not merged. Not pushed.**

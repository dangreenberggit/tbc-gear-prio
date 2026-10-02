Status: closed
Type: bug
Origin: docs/reviews/feat-tab-signoff-followups.md (targeted engine review 2026-09-25, finding D1)
Blocks: none
Blocked by: none
Related: 467, 490, 502

# Ret set credit counts bonuses that cannot add ret DPS

## Evidence

From the domain axis of the targeted engine review
(`.scratch/stage-gate/upgrades-tab-closeout/engine-review/domain.md`, D1):

- The Crystalforge 4pc is a 6% party heal (fork `sim/paladin/item_sets.go`
  lines 30–75).
- The Justicar 4pc changes only Judgement of Command.
  `.scratch/set-bonus-value/verification.md` V0 found that the default ret
  rotation never casts it: 0 casts, measured 1.27 ± 5.24 DPS.
  `ui/paladin/retribution/apls/default.apl.json` judges only while Seal of
  Blood is active.
- Even so, `.scratch/stage-gate/upgrades-tab-closeout/set-rule-scenarios/report.md`
  scenario H credits the Crystalforge 4pc +9.5 on 5 rows and moves
  Crystalforge Breastplate from rank 12 to rank 6. Scenario I credits the
  Crystalforge 4pc +21.1 on 4 rows and the Justicar 4pc +15.3 on 5 rows.
- Both SME handoffs for the net credit were feral only. No SME has judged
  the credit rule for ret.

Likely cause (hypothesis, untested): the rankable floor (≈4.81 DPS for ret)
is √2 times a single-sim cutoff, but a net set value is a difference of five
or more sims at 3000 iterations, so its noise is larger than the floor
allows for.

## What would close this

1. Pick one of: (a) require each credited set value to clear its own
   standard error, not the single-sim floor; or (b) exclude bonuses that
   cannot change DPS for the spec (heal, mana, or a judgement the rotation
   never casts). Record the choice and why.
2. A fixture in `packages/core/test/fork-set-net.test.ts` that pins the
   chosen rule, with its literals derived by hand in
   `docs/set-bonus-fixture-derivations.md`.
3. An SME check on ret (the `sme-rank-review` skill) of a live ret run with
   "Set potential" on, before ON is trusted for ret. Record the verdict here.

## Comments

2026-09-25 (round 2e-1 measurements): the credit is not noise. At 10000
iterations on the fork sim, ret P2 gear at phase 3, the Justicar 4pc reads
+17.82 ± 4.46 and the Crystalforge 4pc +17.32 ± 3.40. On the ret pre-raid
gear at phase 2 both read about 0. More iterations or a `B > 2·se` gate
would still credit both, so options (a) and (b) above do not close this
ticket on their own. The redesign is handed to a future session:
`.scratch/handoffs/511-512-set-credit-redesign.md`, with all sources in
`.scratch/handoffs/511-512-set-credit-redesign/`. New tickets: 514 (set
bonus value carries a gear-dependent residue), 515 (no phase-1 universe),
516 (Burning Rage 2pc break reads about 0). The owner decided on
2026-09-25 that this ticket is fixed before the merge. It stays open.

2026-10-02 (stage-gate 511-512-set-credit, chunk K7): closed. The stage
folder `.scratch/stage-gate/511-512-set-credit/` (below, `S/`) is
gitignored; the design is in `docs/adr/0035-set-rows-valued-by-simmed-gear.md`.

**Item 1.** Item 1 is met by option (a) applied to the same-gear
measurement: a bonus counts only when its same-gear value, measured with
set-less copies on identical gear, clears max(floor, 2·se); this is why
Justicar 4pc and Crystalforge 4pc, which read about 0 on identical gear, no
longer earn credit.

**The method** (ADR-0035). With Set potential on, a set row is credited at
the bonus with the best total. The total is one sim of the current gear
plus the row's item plus one partner set, chosen by the "close-calls"
rule, minus the sim of the current gear. Each bonus is gated first by its
same-gear value (set-kept against set-less copies on the same gear), with
no list of implemented bonuses and no cap on the piece count. Worn-set
breaks come from a ladder of the same copies on the current gear. A set
screen of cheap paired sims drops sets that cannot be worth collecting.

**Justicar 626 and Crystalforge 629 on ret P2 gear at phase 3.**

| Set | K1, same gear, 10,000 iterations | Committed fixture, 3000 iterations, screen on |
| --- | --- | --- |
| Justicar 4pc | +0.0000 | Set dropped by the screen: "below-zero" (M2 −56.92; pair −0.494, paired se 0.309) |
| Crystalforge 4pc | +1.5851 (se 1.725) | Set kept (top-k, M2 −19.53); 4pc gate +0.204 (se 3.164), at or below the gate (floor 4.81) |

K1: `S/k1-measurements.md` lines 88-111. Fixture: `data/tab-fixtures/ret-p3-p2.json`,
read by `S/k7/ana.py` into `S/k7/ana-ret.out`.

**Item 2, the fixtures.** The rule is pinned in
`packages/core/test/fork-set-net.test.ts`, with every literal derived in
`docs/set-bonus-fixture-derivations.md`. At main `0fb1b1e8` and fork
`f09d218e` (= the lock's `commit`), under node v22.17.1,
`npx vitest run packages/core/test/fork-set-net.test.ts packages/core/test/fork-set-fixtures.test.ts packages/core/test/fork-sim-database.test.ts packages/core/test/wowsims-fork-parity.test.ts --reporter=verbose; echo rc=$?`
printed `rc=0` (89 passed, 1 skipped). It has one passing line each for
511-C, 511-I, 511-G, 511-G2, 511-H, 511-M, 511-R, 511-S2, 511-P4, 511-O,
511-U, 511-K, 511-T, 511-X, 511-E, 511-PS, 511-PB, 511-PR, 511-PN, 511-CB,
511-A3R, 476-D, 522-G, 511-SR, 511-SZ, 511-SF, 511-SU, 511-SN, 511-SB,
511-SD, 511-SA, 511-SL, 511-SH, 511-LS, 511-LN, 511-LR, 511-L2, 511-LF and
511-LV, three for 511-PC, and the E-W3 parity line. CI skips these files,
because the fork clone is gitignored.

**The `ret-p3-p2` re-record** (main `4f19a468`, fork `04de6a46`, screen
on). Baseline 2084.163576929428, the same as before. No ret row gets set
credit. The screen dropped Justicar 626 (below-zero), Burning Rage 566 and
Gladiator's Vindication 583 (exact-zero). It kept Crystalforge 629 and
Lightbringer 680, and every gated entry of both is at or below the gate.
The ON top 16 is unchanged. `feral-p3-p2bis` was re-recorded after the
split (main `5251fb23`, fork `f09d218e`). Every row's figure and rank equal
the `4f19a468` recording's (`S/k7/compare-feral.out`, "RESULT PASS").

**Item 3, the SME verdicts.**

- First verdict, on both re-recorded fixtures: **trust-with-caveats**
  (`.scratch/handoffs/sme-rank-judgment-511-set-credit-k7.md`). Ret gets no
  set credit, which is right for this gear. The feral Thunderheart rows are
  valued by the sim of the pieces worn together. Every screened-out set is
  one a player of the spec would not collect on this gear. **F1 stands**
  (see below).
- Follow-up after the split: **trust-with-caveats**
  (`.scratch/handoffs/sme-rank-judgment-511-set-credit-k7-followup.md`).
  The split Breaks lines (Malorne Harness 2pc −59.17 on the Gauntlets and
  Leggings rows, −57.46 on the Cover row, against 96.26 on current gear)
  read right: they repeat on a second character (61.63 and 58.47 at 10,000
  iterations), and the drop matches the opposite measurement (Thunderheart
  2pc with and without Malorne 2pc, −35.9 against −37.1). Caveat: the same
  lost bonus shows −96.3 on rows that break it from current gear and −59.1
  on a step, and the popover does not say which gear each is measured on.
  **F1 stands, narrowed.**
- **F1** (Burning Rage 2pc reads exactly 0 on `ret-p3-p2`): the first
  verdict's evidence, the tab's "58.6 below the hit cap", is withdrawn,
  because that readout omits Improved Faerie Fire and enchant hit (ticket
  521), and the sim puts the base gear 4.7 hit rating over the cap
  (`S/diag/report.md`). But the screen's pair is measured on the Burning
  Rage package gear, which loses 14 hit rating net and is about 9.3 below
  the cap before gems. The exact 0 is right only if that package's gems
  add at least 9.3 hit, and the fixture does not record them. No row
  changes: the screen's rule 2 drops the set either way. What closes F1:
  read the hit rating of that package request (one `/computeStats` call or
  a dump of the composed request, no DPS sim).

**K5ON's result** (the set screen's "on" mode; ADR-0035, "The set
screen").

- **The rule:** M2, N = 300, K = 2, c = 1, rule 1 on,
  σ = 1.0 × √2·stdev/√N (the runner-up of the two best rules, by the Gate C
  ruling).
- **Item swap on (33.1):** pass. On enhancement P5 gear with a swap of
  non-set items only, a real bonus read 37.709 and two no-bonus pairs read
  exactly 0 on the server, on one WASM worker and on the 4-worker runner.
- **Enhancement ranking (33.2):** only Skyshatter Harness 682 was worth
  collecting (+131.35 at 4 pieces); the rule kept 530 (readings absent,
  ticket 532), 636 and 682. Pass.
- **Parity:** the engine's rule keeps the scorer's sets on 22 of 22
  offline cases; four live runs keep exactly the scorer's sets and reasons.
- **Cost on C1** (phase-5 warrior), estimates: the set phase drops from 239
  to 29 full sims plus 66 screen sims, about 96.9 s → 17.8 s on the desktop
  server and about 59.8 → 9.0 min in one browser worker. Measured wall
  times, screen on against record mode: C6 36.2 s against 53.9 s, C5 42.2
  against 118.4, C1 108.2 against 330.9, the enhancement character 120.3
  against 372.3.

**The popover** shows "steps that add up", and a step that newly breaks a
worn set bonus is split into "Breaks {set} {n}pc" −Y and the pieces line +X,
which add up to the old step exactly (chunk K6B; fork `f09d218e`, main
`7921a69a`; live checks `S/k6b/compare-FX-A.out` and
`S/k6b/compare-HUN-C3.out`, both "RESULT PASS"). The split is built, not
an open option.

2026-10-02 (F1 hit-cap check): **F1 closed.** The Burning Rage package
gear is over the sim's melee hit cap before the bonus, so the +20 hit is
wasted and the exact-0 pair is right. In the SME's words, "exact-zero" here
means a bonus in reach that this gear cannot use, not "no bonus in reach".
The ranking is unchanged.

The screen's own request for set 566's pair was rebuilt on the tab's code
path (main `d119fc82`, fork `f09d218e` = the lock's `commit`). The tab
loaded the `ret-p3-p2` fixture gear at phase 3 with `setScreen: "on"`,
under a fake `run()` that sends no sim. Readings from the :3333 backend's
`/computeStats`, the same with and without the consumables warm-up:

| Request | Melee hit rating | Melee hit % (Precision included) | Active sets |
| --- | --- | --- | --- |
| Base gear | 52 | 6.2976 | none |
| Package, set-less copies (pair low side) | 54 | 6.4244 | none |
| Package, set-kept copies (pair high side) | 74 | 7.6927 | Burning Rage (2pc) |

- **The cap.** Against the level-73 target, miss = 8% − (melee hit % + 3%
  Improved Faerie Fire − 1% hit suppression), floored at 0 (fork
  `sim/core/target.go:394,401`, `debuffs.go:44,365`,
  `spell_result.go:179-187`, `spell_outcome.go:570-577`). The request
  sends `faerieFire: TristateEffectImproved`. So misses reach 0 at 6.0%
  melee hit, which is 47.31 rating at 15.77 rating per 1%. The base gear is
  4.69 rating over the cap. The package gear is **6.69 rating over** before
  the bonus.
- **The gems.** The package puts two Rigid Dawnstone (24051, +8 hit each)
  in the Ragesteel Shoulders' two yellow sockets. The Ragesteel Breastplate
  has no sockets. The gems that leave with the Crystalforge Breastplate
  (24027, 30584, 28363) and the Shoulderpads of the Stranger (24027) have
  no hit. No other slot changes. Item hit (`data/items/index.json`
  `stats[20]`): 30129 = 23, 30055 = 0, 23522 = 0, 33173 = 9. So
  52 − 23 + 9 + 16 = 54, which matches `/computeStats`. The SME's "about 9.3
  below the cap" assumed no hit gems in the package. Why the engine picked
  Rigid Dawnstone for these sockets was not checked.
- **The profession check.** Burning Rage needs Blacksmithing (fork
  `sim/common/tbc/items_sets.go`, `ItemSetBurningRage`). Both pair requests
  send `profession2: Blacksmithing`, and `/computeStats` lists "Burning Rage
  (2pc)" as active on the set-kept side. So the bonus is on and simply
  does nothing at the cap. The bonus adds melee hit only: spell hit reads
  3% on all three requests.
- **The pair reproduces.** Simming the two captured requests at the
  screen's options (seed 11, 300 iterations) gives 2024.1456 on both sides,
  a pair of exactly 0, as in the fixture's `setScreen.sets` entry for 566.
  The fixture was recorded at fork `04de6a46`. The 04de6a46..f09d218e diff
  does not touch `packageAt` or `candidateSwapWithRepairs` in `rank.ts`.

Commands. Tools are in `S/f1/` (gitignored), run from that folder under
node v22.17.1, with the launch.json `wowsims-backend` (:3333) and
`wowsims-fork` (:5173) entries running:

- `node capture566.mjs ret-p3-p2.json cap-run.json requests/base.json`
  (dry run, 0 sims; it writes the base request and
  `requests/base.json.566-0.json` / `566-1.json`).
- `tsx stats.mts` and `tsx stats.mts --warm`, which write
  `stats-cold.json` and `stats-warm.json`.
- `tsx pairsim.mts`, which runs two 300-iteration sims and writes
  `pairsim.json`.

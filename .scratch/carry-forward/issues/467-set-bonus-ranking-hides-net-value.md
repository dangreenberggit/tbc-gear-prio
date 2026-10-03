Status: open
Type: bug
Origin: owner walkthrough follow-up to 464, 2026-09-20
Blocks: none
Blocked by: none
Related: 464 (the copy + the "closest reachable threshold" report), 90 (confounded/(k-1)*B broken-set inflation), 91 (per-item smearing rejected), 336/443 (disclosure-not-credit decision this ticket overturns), 441 (Set-potential toggle), 419/431 (set-bonus total on the DPS cell)

# Set-bonus ranking is wildly misleading: it hides sets, set bonuses, and net value

Owner report, 2026-09-20. The Upgrades tab's set-bonus display shows only the
NEAREST reachable threshold's bonus (a "2pc bonus" figure for a 0/1-piece
wearer), never the higher one, and the ranking sort key includes at most that
nearest-threshold value — and only when "Set potential" is on (off by default).
Investigation (Opus, read-only, 2026-09-20) confirmed the displayed number equals
the sort key (`upgrades_tab.tsx:2828-2831` display, `:2447` sort key), so this is
a real RANKING property, not cosmetic: multi-piece set items are ranked as if
their 4pc value does not exist. The owner's verdict: this is misleading and hides
sets and set bonuses.

The earlier design (336/443/91) deliberately kept the higher threshold OUT of the
inline number and the sort — disclosure in the tooltip only. This ticket OVERTURNS
that decision: the owner wants the net value (gains and the currently-hidden
losses) shown and ranked. Tickets 90/91 are context for WHY the old design was
cautious, not a mandate to re-import their estimation machinery — see the
corrected framing below.

## What the owner wants (the model to build)

The row's number must be a true NET TOTAL — DPS gained AND lost — in both modes:

- **"Set potential" ON**: the row shows the full realizable value of committing to
  the piece's set — the item's own DPS delta PLUS every set bonus that would be
  activated (2pc, and the 4pc when relevant) MINUS any set bonus broken to get
  there. I.e. the total DPS effect of going for that set with this piece.
- **"Set potential" OFF**: the row shows what THIS ONE PIECE actually changes right
  now — its own DPS delta PLUS/MINUS any set bonus that this single piece
  activates or breaks by itself. No crediting a 4pc a lone piece cannot turn on.

Display:
- The non-tooltip (inline) figure is the net TOTAL for the active mode, with a
  short "hover for details" instruction line under it.
- The tooltip breaks the total down, and MUST include set-bonus value LOST when a
  set is broken (currently hidden). Gains and losses both itemised.

Framing (do NOT over-engineer this — corrected 2026-09-20 after a prior plan
mis-scoped it into new sim machinery):
- **"Set potential" is a VIEW toggle, not a sim mode.** Its `onChange` is
  `() => this.render()` (`upgrades_tab.tsx:1024`) — it re-ranks and re-displays,
  it does not re-sim. This ticket is a DISPLAY + RANKING change over numbers the
  tab already computes, NOT new sim infrastructure. The owner did not ask to
  change simming and there is no evidence simming is wrong.
- **Start from what is already simmed.** The tab already sims candidate
  configurations (including set-completion packages, `setContext.packages[]`).
  The plan's FIRST job is to establish, from the code, which numbers the two
  modes need and which are already present. Only if a genuinely required number
  is provably absent from existing sim output does new simming enter scope — and
  then it is flagged for the owner, not assumed. Do NOT build an event-measurement
  / de-confound apparatus by default.
- **Broken-set loss, plainly.** The net total must subtract the value of any set
  bonus broken to reach the shown state. If the completed-set state is already
  simmed, that loss is already inside that sim's number — differencing the right
  states captures it without special "(k-1)*B" bookkeeping. Ticket 90's confound
  was an artifact of estimating a whole-package figure; check whether the
  net-total approach even has that problem before importing its machinery.
- **Attribution when ON.** Each set member row shows: this item's own net delta +
  the set bonuses committing to the set would activate − any bonus broken, and
  NOT other items' stats. The owner has ruled: full credit on each contributing
  row by default, with a secondary "split share" view = the shared set-bonus
  credit divided evenly by piece count (plain arithmetic, no sims). State the
  per-row rule and why it isn't ticket 91's rejected smearing.
- **Logical in both modes.** Define each precisely; the ON total is never less
  honest than the OFF total for the same piece.

## Owner decision (2026-09-20): measure the broken-bonus value

Investigation established every number the model needs is already in the tab's sim
output EXCEPT the standalone DPS value (B) of a worn set bonus that gets broken
when completing another set. No differencing of existing sims isolates B, and the
owner's own acceptance case (Thunderheart candidates over worn Malorne 2pc) needs
it on the non-breaking rows and in the OFF tooltip. Owner chose to MEASURE it: add
one contained sim per broken worn set (ticket 92's secondary method — vacate the
worn pieces to non-set candidates, difference against the measured singles) to get
B in context. This is not fixing broken simming; it is measuring a number that was
never measured. It also fixes ticket 90's (k−1)·B inflation, so the correction is
just `bonusDps − (k−1)·B` — NO de-confound recursion, NO per-event primitive, NO
new set-effects module. Everything else is the display/ranking/division change over
numbers already present.

## Where the logic lives (from the investigation)

- Display / inline vs tooltip: `upgrades_tab.tsx` `setBonusPresentation`
  (~:3001-3096), inline/total_inline selection (~:3061-3065), package tooltip
  disclosure (~:3044-3090). In-scope tab display.
- Sort key + what set value it adds: `upgrades/engine/view.ts`
  `rankableSetPotential` (:184-191), `sortKeyFor` (:193-200), `compareRows`
  (:202-219). ENGINE (byte-gated).
- Which threshold becomes `prospectiveBonusDps`: `applySetContext`
  (`rank.ts:1786-1826`, nearest-threshold at :1802,:1815-1817). ENGINE.
- Threshold table / nextMeasurableThreshold: `set-value.ts:31-41,80-89`. ENGINE.
- 4pc measurement, packages, synergy, broken-set B: `buildSetBonuses`
  (`rank.ts:1520-1752`), `computeSynergy`/`selectPackage`/`memberPackages`
  (`set-value.ts`, `rank.ts:1754-1771`). ENGINE.

This is engine + view + display work (touches the byte-gated `upgrades/engine/`
directory), so it goes through the PROVENANCE re-pin cycle and the desktop gate,
not just a locale change. Verify live on the Go backend with a set that has both
2pc and 4pc implemented (Thunderheart 676 / Lightbringer 680), across worn counts
0/1/2/3 and across a broken-set case, in both toggle states.

## Comments

2026-09-22 (review round 6): the engine/display work shipped on
feat/tab-signoff-followups (fork a30920410, 994d5a7b9; main 1543971c,
ef23b82f) but this ticket has no closing check recorded. Round 6 found two
material gaps in that math, filed as 476 and 477, plus 478/479. Leave open
until those are dispositioned; the owner's live check (Thunderheart 676 /
Lightbringer 680 across worn counts) is still unrecorded.

2026-09-24 — Owner answer (Phase 2): "fix now. I see no reason to defer."

2026-09-24 — SME verdict (round 2, Step 5): **do-not-trust** for the "Set
potential" ON view; the OFF view is trusted. Handoff:
`.scratch/handoffs/sme-rank-judgment-467-net-set-bonus.md`. Input: live
feralcat run on fork `371da7dce` (main re-pin `7f4b98af`), worn Thunderheart
2 (hands + legs; shoulders swapped to Shoulderpads of the Stranger and chest to
Bloodsea Brigand's Vest with the gear picker), 3000 iterations, backend, "Took
165s" (the pane run of the same state took 185s), baseline 2603.6 DPS, both
toggle states from one run. Every ON figure equals OFF plus the shown future
lines minus the shown commit-break lines. The SME's major finding (F1–F3): a
Malorne or Nordrassil piece for head, shoulder or chest gets the Thunderheart
2pc loss (−108.6) subtracted in ON, although the Malorne 2pc can be completed
in the free slots with the Thunderheart 2pc kept. The loss comes from
`commitBreaks`, which completes the TOP implemented package (the Malorne 4pc,
or the Nordrassil 4pc), and that 4pc's net is at or below the noise floor, so
the row pays for a break its credited gain does not need. This is the 467
top-package commit rule, not a 476–478 change, and the SME notes this run does
not trigger the 476, 477 or 478 A4 cases (F5). Needs an orchestrator/owner
decision; not changed in this round (the plan puts 467's design out of scope).
Measured price for 477 (b) (N2): the only worn implemented bonus in this state
is Thunderheart 2pc, so `brokenSetValues` has exactly one possible key
(676:2), measured (−108.6 shown); by the case-8 invariant the flag adds one
sim. The tab does not expose the `Ranking` object, so the count is derived
from the worn state, not read.

2026-09-24 — Round-2 captures for the owner's live check (Step 7; this ticket
stays open until the owner answers). 38 PNGs at 1280px in
`.scratch/stage-gate/upgrades-tab-closeout/round-2/` (gitignored), one sentence
each in its `index.json`, full row lists per state in `feral-worn{0..4}.json`
and `ret-default.json`. Fork `371da7dce`, backend :3333, 3000 iterations, each
state a fresh settled run (159–185s). Feral Thunderheart at worn 4 (default),
3, 2, 1, 0, each OFF and ON with the top Thunderheart row's tooltip (worn 4
has no Thunderheart set line). Broken-set case: Malorne and Nordrassil rows at
worn 2, 3 and 4. Ret: default gear wears 0 Lightbringer; Lightbringer,
Justicar and Crystalforge tooltips. Gear was set with the picker in the
browser pane; the captures load the pane's Export -> Link URL in a headless
Chrome, because the pane cannot write PNG files. Visual verdict: **pass** on
all six states (handoff `.scratch/handoffs/visual-review-467-round-2.md`); all
86 set rows satisfy ON = OFF + shown futures − shown commit breaks within
±0.2, and the tooltip is the same in both states. Findings for the owner /
Gate C, not fixed here: (1) the "hover for set detail" sub-line prints over
the Source column (`feral-worn1-table-on.png` rows 1–10 and 12); (2) no
capture shows the "set bonus not counted" line; (3) at worn 1 the
Thunderheart 4pc future is not shown and ON equals OFF — its net is at or
below the floor (hypothesis, untested: the 2pc is unmeasurable at worn 1, so
each single in the 4pc package carries the 2pc and the raw 4pc comes out near
B4 − 2·B2); (4) the SME's do-not-trust finding above.
- 2026-09-24 (round 2b, Step 7): SME verdict after the 490 fix:
  **trust-with-caveats** for ON, **trust** for OFF, at worn Thunderheart 2
  (handoff `.scratch/handoffs/sme-rank-judgment-490-per-future-breaks.md`).
  The round-2 do-not-trust finding (Malorne and Nordrassil head, shoulder
  and chest charged the Thunderheart 2pc) is gone. Item (3) above is fixed
  by 492: at worn 1 the Thunderheart 4pc line now shows +108.1.
- 2026-09-24 (round 2b, Step 9): 467 capture set re-taken on fork
  `5e00931759b3ff1b30495f705a81e77381fb95f3` (main pin `cf51f4f4`), 50 PNGs
  at 1280 with `index.json` in
  `.scratch/stage-gate/upgrades-tab-closeout/round-2b/` (gitignored).
  Primary states load the previous phase's preset gear with the page at
  phase 3 (owner rule): feralcat Phase 2 "BiS 6%" and retribution Phase 2
  "P2", each checked item by item against its gear file (16/16).
  Constructed states: feralcat worn Thunderheart 4 (phase-3 default), 3, 2,
  1, 0. gate-visual: **pass on all 7 states**, 101 set rows checked against
  the best-stop sentence, none failing (handoff
  `.scratch/handoffs/visual-review-467-round-2b.md`). Round 2's three
  findings: the sub-line overprint is fixed (493); the DPS figure touching
  Slot is still present (ticket 495); the not-counted case still never
  appears (no row in any state uses "uncounted"). New advisories: 499 (DPS
  figures of 100+ and the focus outline overrun the DPS cell). 467 stays
  open for the owner.
- 2026-09-27 (ticket 502): ticket 502 replaced the "NOT other items' stats"
  part of the attribution ruling above (the "Attribution when ON" bullet
  under "What the owner wants"). With Set potential on, a set-piece row now
  also counts the own stats of the other set pieces the counted bonuses
  need (rule R1, ADR-0034's ticket 502 paragraph; fork `ebd38a6ae` and
  `2117d5271`, main `6e291ed8`). The owner's direction and approvals are
  quoted in ticket 502's closing section. The final check for this ticket
  still waits for tickets 511 and 512 and the fixtures re-recorded after
  them. Status stays open.

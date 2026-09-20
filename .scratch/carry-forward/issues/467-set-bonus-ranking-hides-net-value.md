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

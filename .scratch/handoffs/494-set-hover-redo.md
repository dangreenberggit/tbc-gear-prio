# Handoff: redo the set-bonus hover (494) and the disabled-toggle reason (501)

Written 2026-09-25 at the end of stage-gate round 2c, after the owner rejected
every hover wording drafted in that round. Tickets 494 and 501 stay open and
move to their own session. This file and the folder beside it,
`.scratch/handoffs/494-set-hover-redo/`, hold what that session needs so it
does not start from scratch.

The owner's instruction for this handoff, quoted: "ensure notes and info are
adequately taken and recorded for that ticket so I don't have to start from
scratch and there's ample context of the mistakes made", and "include copies
of the different code approaches for reference".

## 1. What the hover must convey (agree this before writing any wording)

The redo must begin by stating the mechanism in one paragraph and getting the
owner to agree it. Round 2c wrote wording before this was ever stated. That is
why its three 501 messages each describe a different mechanism.

The rule the owner confirmed for ticket 490 (best-stop, recorded on 490 and in
ADR-0034) is in `setPotentialCredit` in the fork's `upgrades/engine/view.ts`.
In plain terms:

A result row's DPS figure is the measured change from swapping that one item
in. It already includes any set bonus the swap completes, and any set bonus
the swap breaks on the gear you wear now. "Set potential" is a separate view
that adds credit for set bonuses you could reach later by collecting more
pieces of the same set. Those future bonuses are taken in piece-count order
(2, then 4). Each one is worth its measured value, minus any bonus of another
set that you would have to give up to reach it. A bonus given up is charged
once, at the first future that needs it. The running total is kept, and the
credit is the largest running total, stopping at the piece count where it
peaks. If no running total is above zero, the credit is zero. Every figure is
first compared with a noise floor (√2 × the ranking's cutoff: about 5.09 DPS
for feral, 4.81 for ret). A figure at or below the floor counts as zero. If any
figure the credit depends on could not be measured, the whole credit is zero.
Bonuses given up only by the set's own top package (the `commitBreaks`) are not
charged.

The disabled toggle (501) follows from the same rule. Set potential is greyed
out when no row has a credit above zero. That can happen for three different
reasons: no row has a future bonus above the floor; rows have one but it never
outweighs what it gives up; or a figure could not be measured. The owner
leans toward the message "None of these upgrades gain a set bonus." if it is
accurate. It is accurate only in the first case, and only when no row
completes a set bonus the moment it is equipped. A bonus completed that way is
already inside the row's DPS figure, so Set potential never counts it, and the
toggle can be greyed out while that row does gain a set bonus.

Correction, 2026-09-25: this paragraph first said the message is accurate in
the whole first case. It left out rows that complete a bonus on equip. The
plan review for the redo found the gap (`.scratch/stage-gate/494-set-hover-redo/plan-review.md`,
finding F6). None of the five recorded fixtures shows it: `ret-p3-p2` has four
rows that complete a bonus
(`node -e "const f=require('./data/tab-fixtures/ret-p3-p2.json');console.log(f.ranking.items.filter(i=>i.setContext&&i.setContext.crossesThreshold).length)"`
prints 4), but its toggle is enabled.

## 2. What exists today (fork `bcbb5e741514701e9229b8e671d5b1736d310901`)

- The hover and the "set detail" / "uncounted" sub-line are built by
  `setBonusPresentation` in
  `vendor/tbc-new-fork/ui/core/components/individual_sim_ui/upgrades_tab.tsx`
  (about line 3190). A copy is in `494-set-hover-redo/code-today-setBonusPresentation.tsx.txt`.
- The credit walk, `setCreditUnmeasured`, `setBonusSubLine` and
  `rankableSetPotential` are in
  `vendor/tbc-new-fork/ui/core/components/individual_sim_ui/upgrades/engine/view.ts`
  (a ported engine file: the PROVENANCE cycle in `docs/agents/known-traps.md`
  applies). A copy is in `494-set-hover-redo/code-today-view-credit.ts.txt`.
- The toggle's disabled reason is `refreshViewControlVisibility` (about tsx:2050)
  with the single string `upgrades_tab.view.set_potential_unavailable`
  ("None of these upgrades gain a set bonus.").
- The data: `SetContext` in `upgrades/engine/rank.ts` (about line 303), built
  per row: `singleBreaks`, `crossesThreshold`, `futureBonuses[].breaks`,
  `commitBreaks`, `commitPackageDeltaDps`. The tab uses the full view only
  (`SET_CREDIT = 'full'`, tsx:269).
- Tests for the pure view functions: `packages/core/test/fork-set-net.test.ts`
  (fork-gated; skipped in CI).
- The hover text is not unit-testable today, because line selection lives in
  the tsx.
- Recorded results to design against, no sim needed:
  `data/tab-fixtures/*.json` (ticket 504; `data/tab-fixtures/README.md`). On
  `:5173`, open a spec page with `?upgrades-dev` and use "Load fixture", or
  call `window.__upgradesFixture(json)`.
  - The five scenario rows used in round 2c: Breastplate of Malorne and
    Nordrassil Chestplate in `feral-p3-th-hands-legs`; Thunderheart Chestguard
    in `feral-p3-nordrassil4`; Lightbringer Breastplate in `ret-p3-p2`;
    Nordrassil Chestplate in `feral-p2-malorne4`.
  - Their `SetContext` literals are in `494-set-hover-redo/measurements.md` §6.

## 3. Every approach tried, and why the owner rejected it

The quotes below are the owner's words as relayed by the round 2c orchestrator.
Text not in quotation marks is the orchestrator's summary.

**Before round 2c (tickets 467, 475, 479, 490, 491): the shipped hover.**
Lines such as `2pc (0/2): +55.8`, `to reach 4pc: breaks Thunderheart Harness
2pc: -106.2` and `Full set end state: -195.2`. Ticket 494 records the owner's
complaints: the lines do not name their set, a break already included in the
row's figure is not marked as included, and "Full set end state" is
unexplained. Investigation (`investigation-494-501.md` §3) found that "Full
set end state" is the same figure on every piece of a set and matches nothing
else on screen.

**Round 2c v1: the grouped and flat drafts** (`owner-checkpoint.md`; pictures
in `mockups-v1/494-*`; code `tools/mockup.mjs`, functions `grouped` and
`flat`). Grouped put lines under "In this DPS now", "Set potential adds +X"
and "Not counted". Flat was a list ending in "Counted with Set potential: +X
(stops at …)". Rejected: "In this DPS now" is misleading, because the item is
not equipped yet. "Too small to count" is too wordy. "Needs breaking X" is
unintelligible, and its indent is odd.

**Round 2c v2, wording A: headings with figures** (`wording-494-v2.md`,
`owner-checkpoint-2.md`; pictures `mockups-v2/494v2-*-A-1280.png`; code
`tools/mockup2.mjs`, function `altA`). "Swap: −34.5 / Item stats: +12.7 /
Loses … / Set potential: +182.6 / …". Long lines such as "Nordrassil Harness
4pc: +50.9, but loses Malorne Harness 2pc −84.3". Rejected: these read as
sentences, "not a tooltip". "Not counted" as plain text is not recognisably a
label.

**Round 2c v2, wording B: the receipt** (pictures
`mockups-v2/494v2-*-B-1280.png`; code `altB`). A right-aligned figure column,
with bold "Set potential off" and "Set potential on" total lines. Rejected as
a "meta tooltip": it combines two states, Set potential off and on, in one
tooltip that nobody would ever see.

**Round 2c: the three 501 messages** (pictures `mockups-v1/501-*`):

- "None of these upgrades lead toward a set bonus big enough to count."
- "Some upgrades lead toward a set bonus, but none is worth more than the
  bonus it breaks. Hover a row's set detail to see the figures."
- "Set bonuses could not be counted: a bonus these upgrades break could not
  be measured."

Rejected: the three describe different mechanisms from each other, which
"shows a lack of clarity of what's even happening". The owner leans toward
message 1 if it is accurate.

The measured numbers behind every picture are in `measurements.md`,
`mockups-v1/mockups.json` and `mockups-v2/results-494.json`.

## 4. Engineering findings that still hold

These are about the data, not the wording, and none was rejected:

- **One walk.** The hover's lines must come from the same walk as
  `setPotentialCredit`, returned as descriptors by a pure function in
  `view.ts`, not re-derived in the tsx. Otherwise the hover and the credit
  drift, as the sub-line and the credit did before ticket 491.
- **The item's own stats.** The row's figure with Set potential off equals
  the item's own stat change minus every single break:
  own = `deltaDps` + Σ `singleBreaks[].dps`. Examples: Thunderheart Chestguard
  −34.5 + 47.2 = +12.7; Nordrassil Chestplate on the Malorne gear
  −17.4 + 22.9 = +5.4.
- **"No gain" is not "too small".** A future can record a negative value
  (Malorne Harness 4pc on Breastplate of Malorne: −31.8; Nordrassil Harness 4pc
  on the Thunderheart gear: −60.5). "Too small" is true only between 0 and the
  floor. "No gain" is true for a value at or below 0.
- **Drop "Full set end state".** See section 3.
- **No hover, no sub-line.** If a row has nothing worth reading (every figure
  at or below the floor, as on Lightbringer Breastplate in `ret-p3-p2`), it
  gets no hover and no "set detail" sub-line. Today's sub-line ignores the
  floor and shows "set detail" over a hover holding only the package total.
- **Floor rule.** A break at or below the floor is charged as 0. Leaving it
  out keeps every sum exact. A below-floor future with no above-floor break
  changes no total.
- **Rounding.** Figures are rounded to one decimal each, so a total can differ
  from the sum of its lines by 0.1 (Thunderheart Chestguard: 103.1 + 79.4 =
  182.5 against a credit of 182.6).
- **501 reasons** can be told apart from the rows' data alone
  (`investigation-494-501.md` §4). Which of them the toggle should say is the
  open question, and it depends on section 1 being agreed.

## 5. The mistakes

- **Accretion.** The hover grew across tickets 467, 475, 479, 490 and 491,
  one line type per ticket, with no design for the whole.
- **No research, and no skill to require it.** Wording was drafted in prose
  and text boxes, not against established conventions for tooltips and data
  tables. No research was done, and no UI skill exists to enforce it (new
  ticket, see below).
- **Coined labels.** Labels were made up that the owner could not read: "In
  this DPS now", "needs breaking", "Set potential adds", "Not counted".
- **Wording before mechanism.** The mechanism was never stated once before
  the wording was written. That is why the 501 drafts contradict each other.
- **Estimated layout.** Pixel layout was estimated before ticket 504's
  fixtures existed (`investigation-495-499.md`, "Browser not used"). The
  estimates were later wrong: widest figure, Slot wrap, placement.
- **Misleading gear.** Early captures used current-phase BiS gear and misled.
  The owner's rule: test gear is the previous phase's preset.

## 6. Recommended start for the redo

1. Research tooltip and data-table conventions from primary sources, such as Nielsen
   Norman Group, Material Design, Apple Human Interface Guidelines and the
   GOV.UK Design System. None of these has been read yet for this work.
   Record findings with links (the `research` skill).
2. Propose a small UI skill that turns those findings into rules for this
   repo's tab work. It needs owner approval before any skill file is edited
   (AGENTS.md § Editing skills).
3. State the mechanism in one paragraph (start from section 1) and get the
   owner's agreement. Only then decide what the hover and the 501 message
   each need to say.
4. Design against the fixtures in `data/tab-fixtures/`, rendered, not in text
   boxes. `tools/mockup*.mjs` show how to inject a hover into a fixture page on
   `:5173`. They import the fork's `test-tab-harness.mjs`, copied here for
   reference. The live copy is in the fork.

## 7. Layout decisions already made (round 2c, owner 2026-09-25)

These are settled and built in round 2c, independent of the hover's content.
The hover opens to the right of the DPS figure when it fits, and above it
otherwise (495). The DPS figure drops " DPS" (499). The Slot column keeps
"Main Hand" on one line (499). Row focus outline (499). Source is 8rem and
item names wrap to two lines (489). All shipped at fork `7ed8c9941`.

## Files in `494-set-hover-redo/`

- `investigation-494-501.md`: the first read of the hover, the data and the
  501 cases.
- `owner-checkpoint.md`, `owner-checkpoint-2.md`: the questions put to the
  owner.
- `wording-494-v2.md`: wordings A and B.
- `measurements.md`: round 2c's measurements; §6 has the `SetContext` literals.
- `code-today-setBonusPresentation.tsx.txt`, `code-today-view-credit.ts.txt`:
  the shipped code.
- `tools/mockup.mjs` (v1 grouped and flat), `tools/mockup2.mjs` (v2 A and B),
  `tools/mockup2b.mjs`, `tools/mockup-plan.json`, `tools/test-tab-harness.mjs`.
- `mockups-v1/` (494-* and 501-* pictures, `mockups.json`), `mockups-v2/`
  (494v2-* pictures, `results-494.json`).

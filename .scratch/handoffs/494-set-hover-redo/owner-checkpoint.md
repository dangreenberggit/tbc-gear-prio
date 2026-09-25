# Upgrades tab: four choices before the build (tickets 494, 495, 499, 501)

Every picture named here is in
`C:\Users\dgree\Code\lulz\tbc-gear-prio\.scratch\stage-gate\upgrades-tab-closeout\round-2c\mockups\`.
The pictures are real tab pages loaded from the recorded results in
`data/tab-fixtures/`, with the proposed text and styles pasted into the page
for the photo. Nothing has been built yet. The numbers behind each option are
in `measurements.md` in the folder above this one.

## 494: how should the set-bonus hover read?

**What you are looking at.** Four rows, each with two versions of the hover
that opens on the DPS figure. The "grouped" version sorts every line under one
of three headings. "In this DPS now" holds what the row's figure already
includes, so its lines add up to the figure you see with Set potential off.
"Set potential adds" holds the bonuses that Set potential counts, and its
heading figure is exactly what the row gains when you turn Set potential on.
"Not counted" holds the rest, each with the reason. The "flat" version gives
the same facts as a plain list that ends with one summary line. Both drop the
old "Full set end state" line, which showed the same number on every piece of
a set and matched nothing else on screen.

Breastplate of Malorne, +9.5 with Set potential off, +65.2 with it on
(`494-F-breastplate-grouped-1280.png`, `494-F-breastplate-flat-1280.png`, and
the same at 768):

```
Grouped                                             Flat
In this DPS now                                     Malorne Harness 2pc (0/2 worn): +55.8
  Breastplate of Malorne itself: +9.5               Malorne Harness 4pc: too small to count
Set potential adds +55.8                              needs breaking Thunderheart Harness 2pc: −106.2
  Malorne Harness 2pc: +55.8                        Counted with Set potential: +55.8 (stops at Malorne Harness 2pc)
Not counted
  Malorne Harness 4pc: too small to count
    needs breaking Thunderheart Harness 2pc: −106.2
```

Thunderheart Chestguard, −34.5 off, +148.1 on
(`494-D-th-chestguard-grouped-1280.png`, `494-D-th-chestguard-flat-1280.png`):

```
Grouped                                             Flat
In this DPS now                                     Breaks Nordrassil Harness 4pc: −47.2 — included in this DPS
  Thunderheart Chestguard itself: +12.7             Thunderheart Harness 2pc (0/2 worn): +103.1
  breaks Nordrassil Harness 4pc: −47.2              Thunderheart Harness 4pc (0/4 worn): +79.4
Set potential adds +182.6                           Counted with Set potential: +182.6 (stops at Thunderheart Harness 4pc)
  Thunderheart Harness 2pc: +103.1
  Thunderheart Harness 4pc: +79.4
```

The two bonus lines add up to 182.5 and the heading says 182.6. Each figure
is rounded to one decimal on its own, so a heading can differ from the sum of
its lines by 0.1.

Nordrassil Chestplate on the Thunderheart hands-and-legs gear, +16.8 either way
(`494-E-nordrassil-chest-F-grouped-1280.png`, `…-flat-1280.png`):

```
Grouped                                             Flat
In this DPS now                                     Nordrassil Harness 4pc: too small to count
  Nordrassil Chestplate itself: +16.8                 needs breaking Thunderheart Harness 2pc: −106.2
Not counted                                         Not counted: no Nordrassil Harness bonus outweighs what it breaks.
  Nordrassil Harness 4pc: too small to count
    needs breaking Thunderheart Harness 2pc: −106.2
    (costs more than it gains)
```

Nordrassil Chestplate on the phase 1 Malorne gear, −17.4 either way
(`494-C-nordrassil-chest-grouped-1280.png`, `…-flat-1280.png`):

```
Grouped                                             Flat
In this DPS now                                     Breaks Malorne Harness 4pc: −22.9 — included in this DPS
  Nordrassil Chestplate itself: +5.4                Nordrassil Harness 4pc (0/4 worn): +50.9
  breaks Malorne Harness 4pc: −22.9                   needs breaking Malorne Harness 2pc: −84.3
Not counted                                         Not counted: no Nordrassil Harness bonus outweighs what it breaks.
  Nordrassil Harness 4pc: +50.9
    needs breaking Malorne Harness 2pc: −84.3
    (costs more than it gains)
```

A fifth row shows what happens when there is nothing worth reading.
Lightbringer Breastplate (ret, +3.9) has two set bonuses ahead of it, but both
are worth less than the noise in the measurement. In both versions it gets no
hover and no small "set detail" line under its figure
(`494-I-lightbringer-1280.png`).

**Options.** The grouped version, or the flat version.

**Recommendation: grouped.** Your complaint about the old hover was that you
could not tie its numbers to the row. In the grouped version you can check
the arithmetic: the first group adds up to the figure with Set potential off,
and the second group's heading is exactly what turning Set potential on adds.
The flat version has the same facts but leaves that sum to the reader. It is
shorter: 4 lines against 6 for Breastplate of Malorne.

Two smaller points, whichever version you pick. First, please change any
heading or reason wording you want changed. Today they are "In this DPS now",
"Set potential adds", "Not counted", "too small to count" and "costs more than
it gains". Second, a future bonus that is too small to count and breaks
nothing else is left out entirely, because it changes no total. My
recommendation is to keep it out. The alternative is to print it as "too small
to count" so the reader sees that the bonus exists.

## 495: where should the hover appear?

**What you are looking at.** The grouped hover for Thunderheart Chestguard,
6 lines tall, in three positions at 1280, 768 and 375 pixels wide. Above the
figure is how it works today (`495-placement-top-*.png`). To the left of the
figure is the second option (`495-placement-left-*.png`). The third option is
not a hover: the same text opens as an extra row under the item, and the rows
below move down (`495-placement-detailrow-*.png`).

**What was measured.** Above the figure, the hover covers the whole row above
it at every width, including that row's DPS figure. To the left, today's
short hovers (2 to 4 lines) cover nothing at 768 and 1280. The new grouped
hover is taller, so to the left it covers the item name and slot of the row
above and the row below, but never their DPS or source. On a phone (375 wide)
there is no room on the left, so it opens below the row and covers the row
underneath. The extra row covers nothing at any width, but it opens on a click
rather than on hover, and it pushes the rest of the table down.

**Options.** To the left of the figure, accepting that tall hovers cover the
neighbouring item names. Or the extra row under the item.

**Recommendation: to the left.** It keeps the hover you already use. When it
does cover something, it is the item names and slots of the rows next to it,
while the DPS figures you compare down the column stay visible. The extra row
is the only option that covers nothing, but it turns a glance into a click,
and it makes the table jump each time a row opens.

## 499: how should the DPS figure fit its column?

**What you are looking at.** The widest figure on the feral phase 3 page,
"−400.8 DPS" (Staff of Infinite Mysteries). Today it runs 12.9 pixels past its
column at 768 and 1280, and on some rows the figure sits 2.4 pixels from the
slot name. Two fixes are shown at Source widths 8rem and 11rem
(`499-dps-cell-bare-src8-1280.png`, `499-dps-cell-widen-src8-1280.png`, and the
same for 11rem and for 768).

**Options.** The first option drops " DPS" from each figure and relies on the
column header, which already says DPS: "−400.8" instead of "−400.8 DPS". It
also adds a small space before the figure. Every figure then fits, with at
least 26 pixels between slot and figure. The second option keeps " DPS" and
widens the column to 7rem (from 5.5rem). Every figure then fits, with at least
12 pixels of space, but the item column gets narrower.

**What each costs**, counting item names cut short with "…" on the feral page
(338 rows) at 1280 pixels:

| Source width | Today | Figure without " DPS", column unchanged | Keep " DPS", widen to 7rem |
| --- | --- | --- | --- |
| 8rem | 37 | 37 | 84 |
| 11rem (what ships today) | 150 | 150 | 209 |

The plan also measured the figure without " DPS" in a 6rem column: 55 and 172.
It is not needed, because the figure fits in today's 5.5rem column.

**Recommendation: drop " DPS" and keep the column at 5.5rem.** It fixes the
overflow and the crowding without cutting a single extra item name. Widening
cuts 47 to 59 more names. The cost is that a figure copied out of the table no
longer carries its unit.

Separately, the Source column: 11rem is what ships, and 8rem is what I
recommend. At 8rem, 37 names are cut short instead of 150. The price is taller
rows where a source name is long: the tallest row grows from 84 to 101.5
pixels (ticket 489's table).

The keyboard focus ring changes too, with no choice needed. Today the
browser's own ring is drawn around the DPS cell and crosses the figure. The
plan draws it around the whole row instead
(`499-focus-rowoutline-1280.png`, `…-768.png`).

## 501: what should the disabled Set potential switch say?

**What you are looking at.** The feral phase 2 page on the phase 1 Malorne
gear, where Set potential is greyed out. Hovering the switch explains why.
Today one sentence covers every case: "None of these upgrades gain a set
bonus." On this page that is wrong, because rows do list set bonuses; none of
them is worth more than the bonus it breaks. The build will pick one of three
reasons. Each is shown in place (`501-toggle-none_listed.png`,
`501-toggle-none_clears.png`, `501-toggle-unmeasured.png`):

When no row has a set bonus big enough to count: "None of these upgrades lead
toward a set bonus big enough to count."

When rows list set bonuses but none beats what it breaks (this page): "Some
upgrades lead toward a set bonus, but none is worth more than the bonus it
breaks. Hover a row's set detail to see the figures."

When a bonus that the upgrades break could not be measured: "Set bonuses could
not be counted: a bonus these upgrades break could not be measured."

**Options.** Accept these three sentences, or change any of them.

**Recommendation: accept them.** Each one says which case the page is in, and
the second tells the reader where to look. If the second is too long, the
last sentence ("Hover a row's set detail to see the figures.") is the one to
cut.

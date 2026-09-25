# Upgrades tab: second round of choices (tickets 494, 495, 499, 489)

The pictures are in
`C:\Users\dgree\Code\lulz\tbc-gear-prio\.scratch\stage-gate\upgrades-tab-closeout\round-2c\mockups-2\`.
As before, they are real tab pages loaded from the recorded results, with the
proposed text and widths pasted into the page for the photo. Nothing has been
built. The raw numbers are in `results.json` and `results-499-tight.json` in
the same folder.

## 494: wording A or wording B?

**What the pictures show.** The four rows from last time, each with both new
wordings, shown above the figure at 1280 pixels wide. The files are
`494v2-F-A-1280.png` and `494v2-F-B-1280.png` (Breastplate of Malorne),
`494v2-D-…` (Thunderheart Chestguard), `494v2-E-…` (Nordrassil Chestplate on
the Thunderheart hands-and-legs gear) and `494v2-C-…` (Nordrassil Chestplate on
the phase 1 Malorne gear).

Every figure comes from the recorded results. One word differs from the
drafts. Two bonuses the drafts called "too small" are in fact losses: Malorne
Harness 4pc on Breastplate of Malorne records −31.8, and Nordrassil Harness
4pc on the Thunderheart gear records −60.5. Both now read "no gain". "Too
small" is kept for a bonus that is a real gain but smaller than the
measurement noise. None of these four rows has one of those.

Wording A puts a figure on each heading. For Thunderheart Chestguard it reads:

```
Swap: −34.5
  Item stats: +12.7
  Loses Nordrassil Harness 4pc: −47.2
Set potential: +182.6
  Thunderheart Harness 2pc: +103.1
  Thunderheart Harness 4pc: +79.4
```

Wording B is a receipt. The figures sit in a right-hand column, and two bold
lines with a rule above them repeat the row's own figures with Set potential
off and on:

```
Item stats                     +12.7
Loses Nordrassil Harness 4pc   −47.2
Set potential off              −34.5
Thunderheart Harness 2pc      +103.1
Thunderheart Harness 4pc       +79.4
Set potential on              +148.1
```

Both are about the same size: 213 to 279 pixels wide on three of the rows. The
fourth row (Nordrassil Chestplate on the Malorne gear) has one long line,
"Nordrassil Harness 4pc: +50.9, but loses Malorne Harness 2pc −84.3". It makes
that hover 420 pixels wide and wraps onto two lines in both wordings.

**Options.** Wording A, or wording B.

**Recommendation: B.** The two bold lines are the exact figures the row shows,
so you can match the hover to the row without adding anything up. That was
the complaint that started ticket 494. The cost is that when the item's stats
are the whole swap, the same figure appears twice (Breastplate of Malorne
shows +9.5 on two lines).

## 495: open the hover to the right when there is room?

**What the picture shows.** `495v2-right-src8-1280.png`: the wording B hover
for Thunderheart Chestguard, opened to the right of its figure, at 1280 pixels
with the new column widths from 499 below.

**What was measured.** At 1280 pixels there are 465 to 507 pixels to the right
of the DPS figure, depending on the Source width. The widest hover is 420
pixels, so every hover fits. At 768 pixels there are only 165 to 207 pixels,
which is less than any hover (270 to 280 pixels). There the hover moves to the
other side of the figure by itself. When it opens to the right, it covers the
row's own Source text and its star and swap buttons, and the same area of the
row above and the row below. It leaves every DPS figure visible.

**Options.** Always above the figure, as you chose. Or to the right when it
fits, and above it otherwise.

**Recommendation: to the right when it fits, and above it otherwise.** At 1280
it keeps the DPS column readable, which the above position cannot do. Below
that width it falls back to your choice. One detail for the build: left alone,
the browser library moves a hover that does not fit to the left side, not to
the top. The build must name "above" as the fallback. If you would rather keep
one rule everywhere, "always above" is the simpler choice, and nothing here
argues strongly against it.

## 499: new column widths

**What the pictures show.** `499v2-table-src8-1280.png` and
`499v2-table-src11-1280.png` show the first version described below.
`499v2-tight-src8-1280.png` and `499v2-tight-src11-1280.png` show the second
version. All four are the feral phase 3 page at 1280 pixels, with " DPS" gone
from every figure.

**What was measured.** The widest slot label is "Main Hand", 69.4 pixels. The
Slot cell also has 14 pixels of padding on its left, so it needs 6.25rem to
keep "Main Hand" on one line. The widest figure without " DPS" is "−400.8",
55.1 pixels. With the small space in front of it, the DPS column needs
4.75rem. Together that is 11rem, exactly what the two columns take today, so
this first version frees nothing for Item. It does fix the problems: no figure
leaves its column, "Main Hand" stays on one line, and there are at least 15.7
pixels between slot and figure.

A second, tighter version frees 0.75rem (10.5 pixels) for Item. It shrinks the
Slot cell's left padding from 1rem to 0.5rem, so Slot is 5.75rem, and it sets
DPS to 4.5rem. Everything still fits, with at least 12.2 pixels between slot
and figure. Names cut short at 1280 pixels:

| Source width | Today | First version | Tighter version |
| --- | --- | --- | --- |
| 8rem | 36 | 36 | 23 |
| 11rem | 147 | 147 | 105 |

The tighter version leaves less than 1 pixel spare for "−400.8". A figure of a
thousand or more would not fit in either version, and no recorded figure is
that large.

**Options.** The first version, which is the same total width as today. Or
the tighter version, which gives Item 10.5 more pixels.

**Recommendation: the tighter version.** It is the only one that does what you
asked, giving freed width to Item. It saves 13 to 42 cut-off names. The cost
is the smaller gap between Item and Slot, which you can judge in the picture,
and the near-zero spare room for figures. The layout gate will catch a figure
that overflows.

## 489: let item names wrap to two lines?

**What the picture shows.** `489-wrap-src8-1280.png`: the feral phase 3 page
at 1280 pixels with Source at 8rem. Item names wrap onto a second line
instead of ending in "…", and the BiS tags sit below them. See Vindicator's
Dragonhide Bracers and Band of the Eternal Champion.

**What was measured** on all 338 rows, each variant compared with today at the
same Source width:

| Source | Variant | Names cut off | Median row | Tallest row | Rows taller than today | Rows shorter |
| --- | --- | --- | --- | --- | --- | --- |
| 8rem | today ("…") | 36 | 66.5px | 101.5px | — | — |
| 8rem | wrap to 2 lines | 0 | 66.5px | 101.5px | 3 | 0 |
| 11rem | today ("…") | 142 | 56px | 84px | — | — |
| 11rem | wrap to 2 lines | 0 | 56px | 84px | 10 | 0 |

**What this means for your suspicion.** Wrapping never made a row shorter,
because a name cut off with "…" was already one line. What you suspected
holds in a weaker form. Most rows with a long name are already two or three
lines tall because of their Source, so the name's second line fits in height
the row already has. Only 3 rows grew at 8rem, and 10 at 11rem. The whole
table grew by 44 pixels at 8rem and 172 pixels at 11rem, and every name is
shown in full.

**Options.** Keep cutting names off with "…". Or let names wrap to at most two
lines, with the tags below.

**Recommendation: wrap, with Source at 8rem.** At 8rem no name is cut off, the
median and tallest rows are unchanged, and only 3 of 338 rows grow. At 11rem
the Source column is wider, so rows are shorter, but more names need the
second line (10 rows grow). Together with the tighter 499 widths, the table
shows every name and every figure in full.

## 501

Still waiting for your answer on the three drafted sentences from the first
checkpoint.

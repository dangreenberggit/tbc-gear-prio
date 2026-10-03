# Replacement wording for the 494 set-bonus hover

Numbers come from section 6 of `measurements.md` and the row figures in `owner-checkpoint.md`. The swap line for Thunderheart Chestguard is −34.5 + 47.2 = +12.7. For Nordrassil Chestplate on the Malorne gear it is −17.4 + 22.9 = +5.4. Both match the checkpoint.

## Alternative A: each heading shows what its part adds

Each heading carries a figure. "Swap" matches the row with Set potential off. "Set potential" is what turning it on adds. The lines under a heading add up to its figure. A loss sits on the same line as the bonus it belongs to, and nothing is indented more than one level.

Breastplate of Malorne (+9.5 off, +65.2 on)
```
Swap: +9.5
  Item stats: +9.5
Set potential: +55.8
  Malorne Harness 2pc: +55.8
Not counted
  Malorne Harness 4pc: too small
```

Thunderheart Chestguard (−34.5 off, +148.1 on)
```
Swap: −34.5
  Item stats: +12.7
  Loses Nordrassil Harness 4pc: −47.2
Set potential: +182.6
  Thunderheart Harness 2pc: +103.1
  Thunderheart Harness 4pc: +79.4
```

Nordrassil Chestplate, Thunderheart hands-and-legs gear (+16.8 either way)
```
Swap: +16.8
  Item stats: +16.8
Not counted
  Nordrassil Harness 4pc: too small
```

Nordrassil Chestplate, phase 1 Malorne gear (−17.4 either way)
```
Swap: −17.4
  Item stats: +5.4
  Loses Malorne Harness 4pc: −22.9
Not counted
  Nordrassil Harness 4pc: +50.9, but loses Malorne Harness 2pc −84.3
```

A counted bonus that needs a loss uses the same form under "Set potential": `Malorne Harness 4pc: +X, loses Thunderheart Harness 2pc −Y`.

**Reasoning:** each heading states the size of its part, so the reader sees at once how much comes from the item and how much from sets.

## Alternative B: a receipt that ends on the row's own figures

There are no headings with figures and no indentation. Numbers sit in a right-aligned column. Two total lines, drawn bold with a thin rule above, repeat the exact figures the row shows with Set potential off and on. "Not counted" is a plain heading at the same level as the other lines.

Breastplate of Malorne
```
Item stats                              +9.5
Set potential off                       +9.5
Malorne Harness 2pc                    +55.8
Set potential on                       +65.2
Not counted
Malorne Harness 4pc: too small
```

Thunderheart Chestguard
```
Item stats                             +12.7
Loses Nordrassil Harness 4pc           −47.2
Set potential off                      −34.5
Thunderheart Harness 2pc              +103.1
Thunderheart Harness 4pc               +79.4
Set potential on                      +148.1
```

Nordrassil Chestplate, Thunderheart hands-and-legs gear
```
Item stats                             +16.8
Set potential off                      +16.8
Not counted
Nordrassil Harness 4pc: too small
```

Nordrassil Chestplate, phase 1 Malorne gear
```
Item stats                              +5.4
Loses Malorne Harness 4pc              −22.9
Set potential off                      −17.4
Not counted
Nordrassil Harness 4pc: +50.9, but loses Malorne Harness 2pc −84.3
```

The "Set potential on" line appears only when Set potential changes the figure.

**Reasoning:** both figures the row can show appear word for word in the hover, so the reader matches them to the row without doing any sums.

## Choices that affect both alternatives

- **The Thunderheart Harness 2pc −106.2 loss no longer appears on Breastplate of Malorne or on Nordrassil Chestplate (Thunderheart gear).** A bonus too small to count is left out whatever it would cost, so each not-counted line gives one reason only. Adding the loss back makes the line about 70 characters: `Malorne Harness 4pc: too small, loses Thunderheart Harness 2pc −106.2`.
- **"too small" is not accurate for these two rows.** The recorded figures for Malorne Harness 4pc (−31.8) and Nordrassil Harness 4pc (−60.5) are losses, not small gains. "no gain" is true both for a small gain and for a loss. I kept "too small" because the brief names that reason, but the owner may want "no gain" instead.
- **Rounding can be 0.1 off.** Each figure is rounded to one decimal on its own. In A, the Thunderheart lines add up to 182.5 against a heading of 182.6. In B, −34.5 + 103.1 + 79.4 = 148.0 against 148.1.
- **Full set names are kept.** The data holds "Nordrassil Harness", and the other sets use other suffixes, for example "Lightbringer Battlegear". Shortening them would need a new rule. The longest line, on the Malorne-gear row, is about 64 characters, so it may wrap at narrow widths.

## Recommendation

**I recommend B.** The owner's first complaint was that he could not tie the hover to the row. B prints the exact figures the row shows, with Set potential off and on, so there is nothing to add up. It has no nested lines, which avoids the indentation he disliked, and it is never longer than A (5 lines against 6 for Breastplate of Malorne). The cost is repetition: when the item's stats are the whole swap, the same figure appears twice (+9.5 and +9.5, +16.8 and +16.8). Choose A if the owner cares more about seeing the size of each part than about seeing the row's own figures.

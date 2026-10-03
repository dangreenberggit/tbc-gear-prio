# Visual gate — ticket 472 (Upgrades row restyle + two trailing action cells)

Seat: gate-visual. Judged from the recorded captures only; no browser was driven
and no git command was run by this seat.

Captures directory (never committed):
`C:/Users/dgree/Code/lulz/tbc-gear-prio/.scratch/stage-gate/upgrades-rowstyle/captures/`

**Round 2.** Round 1 returned `cannot-judge` on the 375 clause and `contested:` on
the provenance. Both were re-captured. This document is the round-2 verdict and
supersedes the round-1 one; the round-1 findings that were fixed are listed at the
bottom under "Round 1 findings, resolved" so the ledger keeps the trail.

## Provenance (from each `index.json`)

| capture dir | forkHead | forkDirty | round |
| --- | --- | --- | --- |
| `before-gear` | `aa9657e5afd6df3baae406f0f695c6502244046d` | `true` | 1 — pre-change control |
| `after-gear` | `218736090fcea1fd43cc952f33037816e0919e65` | `true` | 1 — after step 2 |
| `after-gear-scss` | `4f34884827a9344c1154fb1b020e105a63babd35` | `true` | 1 — after step 3 |
| `before-upgrades` | `aa9657e5afd6df3baae406f0f695c6502244046d` | `true` | 1 — pre-change control |
| **`after-upgrades`** | **`15665779c5f4544176759f49033cc711bcaa0c96`** | **`false`** | **2 — judged** |
| **`after-gear-final`** | **`15665779c5f4544176759f49033cc711bcaa0c96`** | **`false`** | **2 — judged** |

The two directories the verdict rests on are both captured at the merge tip
`15665779c` with a clean tree. The round-1 `contested:` on provenance is
withdrawn: `after-upgrades/index.json` and `after-gear-final/index.json` both
record `"forkDirty": false` and the stated tip SHA.

The four round-1 dirty directories remain as the pre-change and intermediate-step
controls. Their dirtiness is not load-bearing for any verdict below — the only
claim resting on them is "the Gear list rendered this way before the change", and
`before-gear`'s PNG is byte-identical to `after-gear-final`'s, which was taken
clean at the tip.

## Per-ticket verdicts

| ticket / sentence | verdict |
| --- | --- |
| `472-gear` — Gear list unchanged | **pass** |
| `472-pre` — pre-run unchanged | **pass** |
| `472` — Upgrades row look at 1280 | **pass** |
| `472-narrow` — Upgrades row at 375 | **pass** |
| **ticket 472 overall** | **pass** |

---

## 1. `472-gear` — "The Gear item list renders as it did at aa9657e5a: star and compare buttons on every row, zebra rows, hovered row darker." — pass

Evidence:

- **Four byte-identical PNGs**, sha256
  `ec418f7112337d3faad887feefe79579864f70c79ebac9151920d911c018b1d9`, 102187 bytes
  each: `before-gear/`, `after-gear/`, `after-gear-scss/` and now
  `after-gear-final/472-gear-pre-run-1280-0.png`. The fourth is the one that
  matters — it is the Gear control taken clean at the merge tip, so the chain
  "unchanged from `aa9657e5a` through to `15665779c`" is closed by pixels, not by
  inference across the intermediate steps.
- All four `facts.json` identical: `iconW` `42px`, `nameFs` `15.75px`, `rowBg1`
  `rgb(34, 35, 40)`, `hoverBg` `rgb(52, 58, 64)`, `favCount` 31, `cmpCount` 31,
  `listRect` `{top 197.28125, left 129.5, width 1062, height 540}`. `favCount` =
  `cmpCount` = 31 over 31 windowed rows backs "star and compare on every row";
  `rowBg1` ≠ `hoverBg` backs "zebra" and "hovered row darker".
- Read of `after-gear-final/472-gear-pre-run-1280-0.png`: alternating row
  backgrounds, row 2 ("Cursed Vision of Sargeras") lighter than its neighbours,
  star and compare glyphs at the right edge of every row.

**Non-visual difference, kept on the record as the executor asked.**
`before-gear/a11y.json` has a `button-name` violation with **62 critical nodes**;
`after-gear`, `after-gear-scss` and `after-gear-final` have **zero**. The nodes are
the 31 stars + 31 compare buttons, e.g.
`li[data-idx="424"] > .selector-modal-list-item-favorite-container > .selector-modal-list-item-favorite.p-0.btn-link`,
html `<button class="selector-modal-list-item-favorite btn btn-link p-0"><i class="far fa-star fa-xl"></i></button>`.
The shared toggle module now sets an `aria-label` on both buttons. The executor
confirms this was deliberate and predicted. It is an improvement, it is invisible
in the pixels (which is why the PNGs can be byte-identical), and it does not fail a
sentence about rendering. Advisory, not blocking.

## 2. `472-pre` — "Pre-run the tab is unchanged: no results table and no empty action headings on screen." — pass

Evidence:

- `after-upgrades/facts.json` `472-pre`: `tableCount` 0 and `thCount` 0 at both
  1280 and 375, matching `before-upgrades/facts.json` `472-pre`. Zero `th` nodes is
  the direct measurement of "no empty action headings".
- `after-upgrades/472-pre-pre-run-1280-0.png`: the "No ranking yet" empty state,
  the alpha-feature blurb, the right-hand settings panel. No table, no header row.
- `after-upgrades/472-pre-pre-run-375-0.png`: the same empty state stacked for
  mobile. No table, no header row.
- `after-upgrades/a11y.json` `472-pre/1280` and `472-pre/375` both have an empty
  `violations` array.

## 3. `472` — Upgrades row look at 1280 — pass

The four win-condition pairs, `after-upgrades/facts.json` `472/1280` against
`after-gear-final/facts.json` `472-gear/1280` (both clean, both at `15665779c`):

| fact | Upgrades 1280 | Gear 1280 | match |
| --- | --- | --- | --- |
| `iconW` | `42px` | `42px` | yes |
| `nameFs` | `15.75px` | `15.75px` | yes |
| `rowBg1` | `rgb(34, 35, 40)` | `rgb(34, 35, 40)` | yes |
| `hoverBg` | `rgb(52, 58, 64)` | `rgb(52, 58, 64)` | yes |

All four match exactly. `before-upgrades/facts.json` `472/1280` had `iconW` `21px`,
`nameFs` `14px`, and `rowBg1` = `hoverBg` = `rgba(0, 0, 0, 0)` — no zebra and no
hover before the change. The restyle is the measured difference, not a coincidence
of defaults.

The two action cells:

- `after-upgrades/facts.json` `472/1280`: `thCount` 7 (was 5), `thFav`
  `"Favorite"`, `thBatch` `"Batch sim"`, `favCount` 6 and `cmpCount` 6 against
  `rowCount` 6 — a star and a batch button on every landed row — and
  `lastCellIsBatch` `true`.
- `after-upgrades/472-post-run-1280-0.png`: star and double-arrow batch glyph as
  the last two cells of all six rows, zebra alternation, row 2 ("Shadowmoon De…")
  lighter than rows 1 and 3 — the hovered row.
- `before-upgrades/472-post-run-1280-1.png` for contrast: five columns ending at
  Source, small icons, uniform transparent rows, no action cells.

`tdBg1` is `rgba(0, 0, 0, 0)` while `rowBg1` is `rgb(34, 35, 40)` — the zebra is
painted on the `tr`, not the `td`. It renders correctly in the PNG, so this is a
note, not a defect.

State caveat: the harness captures a **running** state.
`after-upgrades/472-post-run-1280-0.png` reads "Simming 7/504… (6 rows landed)"
with a progress bar, and `rowCount` 6 counts those rows. The row look and the two
action cells are proved on real rows. Nothing here speaks to a finished table's
final row count, ordering or totals.

## 4. `472-narrow` — Upgrades row at 375 — pass

Round 1 was `cannot-judge` here. The re-capture resolves it. Taking the sentence
clause by clause:

**"the pre-change mobile row"** — `after-upgrades/facts.json` `472-narrow/375`
gives `iconW` `15.75px` and `nameFs` `14px`, identical to
`before-upgrades/facts.json` `472/375` (`15.75px`, `14px`). The mobile row
metrics did not move.

**"plus the two buttons"** — `thCount` 7 with `thFav` `"Favorite"` and `thBatch`
`"Batch sim"`, `favCount` 6 and `cmpCount` 6 against `rowCount` 6, and
`lastCellIsBatch` `true`.

**zebra at this width** — `rowBg1` `rgb(34, 35, 40)` vs `rowBg2` `rgb(24, 25, 30)`.
Adding `rowBg2` is the right substitution for the hover fact: it proves the
alternation directly at 375 without needing a pointer, and it is visible in
`after-upgrades/472-narrow-post-run-375-1.png` as alternating row bands.

**"scrolling horizontally rather than shattering"** — this is the part I refused to
pass in round 1, so I am explicit about why the arithmetic now carries it:

| fact | value |
| --- | --- |
| `tableRect.width` | 509.984375 |
| `scrollHostRect.width` | 340.0 |
| overflow | 169.98px, table is 1.50× its host |
| `scrollHostOverflowX` | `auto` |

A table 1.5× wider than a host whose `overflow-x` computes to `auto` is a
horizontal scroll — that is what `overflow-x: auto` means when content exceeds the
box. The alternative failure modes the sentence guards against are each excluded
by a different fact: the table did not reflow or collapse into its host (it is
509.98px, not ~340px); the columns did not wrap or stack (`thCount` is still 7 and
the row metrics are unchanged); the content is not clipped and lost (`auto`, not
`hidden`).

What raises this from "arithmetic I have to take on faith" to evidence I can check:
**the two PNGs' pixel dimensions corroborate the two rects independently.**
`472-narrow-post-run-375-1.png` is exactly **340 × 434** and
`472-narrow-post-run-375-2.png` is **509 × 434**. Those are the host clip and the
table clip, and they match `scrollHostRect.width` 340.0 and `tableRect.width`
509.98 to the pixel. The rects are not a number the harness asserted about itself —
the screenshots were cut to those sizes, so two independent paths agree the table
really is ~510px inside a 340px box.

The executor was right that I asked for something the harness cannot do (there is
no scroll op in the facts DSL, and the interaction coordinate is computed before
the width is re-emulated). This substitution is better than what I asked for: a
scrolled screenshot would have shown the right-hand end in one position, whereas
the measurement establishes the overflow relationship itself.

Reading `472-narrow-post-run-375-1.png` (the host, 340px): six rows, zebra
alternating, rank/item/slot/DPS legible, names wrapping to three lines within their
column rather than overlapping, the row clipped mid-"Source" at the host's right
edge — which is exactly what a scroll container at rest looks like.
`472-narrow-post-run-375-2.png` (the table, 509px) shows the same six rows with the
same wrapping. Nothing shatters: no overlap, no collapsed column, no row breaking
its bounds.

**Hover is not measured at 375, and the manifest now says so.** The `472-narrow`
acceptance sentence states the exclusion explicitly and gives the reason (the
harness computes the pointer coordinate before re-emulating the width). The entry
has no hover interaction and no `hoverBg` fact, so there is no misleading number in
`facts.json` any more — round 1's `rgb(24, 25, 30)` is gone. Hover evidence lives
on the 1280 entry, where it is measured correctly. I accept that scoping: the
acceptance sentence no longer claims anything at 375 that the capture does not
show, which is the correct fix for a harness limit — narrow the claim, do not fake
the measurement.

## 5. Judged item — is the restyled row acceptable as rendered, given the contrast it now produces?

**Acceptable as rendered — advisory, not blocking.** Unchanged from round 1; the
executor did not change this and asked me to judge it as it stands.

`before-upgrades/a11y.json` has exactly one serious `color-contrast` node at each
width: `.btn-outline-danger`, `#dc3545` on `#15171e`, ratio 3.95 — the single
accepted entry in `data/wowsims-fork-a11y-baseline.json`. `after-upgrades/a11y.json`
has seven at each width: that one plus six epic-quality item names, `#a335ee` on
the new zebra backgrounds.

| item name node | `472/1280` bg / ratio | `472-narrow/375` bg / ratio |
| --- | --- | --- |
| `span[title="Choker of Endless Nightmares"]` | `#222328` / 3.21 | `#222328` / 3.21 |
| `span[title="Shadowmoon Destroyer's Drape"]` | `#343a40` / 2.35 | `#18191e` / 3.59 |
| `span[title="Madness of the Betrayer"]` | `#222328` / 3.21 | `#222328` / 3.21 |
| `span[title="Legguards of Endless Rage"]` | `#18191e` / 3.59 | `#18191e` / 3.59 |
| `span[title="Romulo's Poison Vial"]` | `#222328` / 3.21 | `#222328` / 3.21 |
| `span[title="Black Featherlight Boots"]` | `#18191e` / 3.59 | `#18191e` / 3.59 |

The one 2.35 is row 2 under the pointer at 1280 — the hover background is the
lightest, so the hovered row is the worst case. At 375 the same row now reads 3.59
because there is no hover at that width any more, which is the expected consequence
of dropping the interaction rather than a change in the styling.

Reasoning for "acceptable as rendered":

1. **Not new defects — the Gear list's own numbers, reproduced faithfully.**
   `after-gear-final/a11y.json` reports 13 `color-contrast` nodes: six at
   `#a335ee`/`#222328` 3.21, three at `#a335ee`/`#18191e` 3.59, one at
   `#a335ee`/`#343a40` 2.35, plus rare-quality `#0070dd` at 3.64 and 3.25. The
   Upgrades table now fails exactly the way the thing it was asked to imitate
   fails. Ticket 472 asked the row to read as a Gear-list row; the contrast is a
   property of that idiom, inherited rather than invented here.
2. **The failing colour is load-bearing game semantics.** `#a335ee` is WoW's epic
   quality colour, and item-name colour is how a player reads rarity at a glance —
   the same value the client and every addon uses. A different purple would break
   the meaning the colour carries. The accessible fix is a second, non-colour
   rarity cue, which is a design change outside 472's scope and outside my remit.
3. **Legible on screen.** In `after-upgrades/472-post-run-1280-0.png` and
   `472-narrow-post-run-375-1.png` the epic names read clearly against both zebra
   shades. At 1280 they are 15.75px, larger than the pre-change 14px, so practical
   legibility improved even as the computed ratio fell — and it fell only because
   the rows now have a background at all. The pre-change rows were
   `rgba(0, 0, 0, 0)`, so axe had nothing to measure and reported nothing. Part of
   the "1 → 7" jump is a measurement becoming possible, not a regression.

Against it, recorded honestly: six serious WCAG AA failures at each width is a real
increase from one, the worst case is 2.35 against the hover background, and "the
list we copied fails the same way" is a consistency argument, not an accessibility
one. Hence advisory rather than a silent pass.

**Explicitly not decided here:** whether a baseline entry should be added to
`data/wowsims-fork-a11y-baseline.json`. Orchestrator's call, already flagged.

Also on the record, outside 472's acceptance: `after-gear-final/a11y.json` has
**31 critical `image-alt` nodes** on the Gear list's item icons. The Upgrades
table's a11y report has no `image-alt` violation, so the restyle did not import
that defect. No action implied for 472.

## Findings

| finding | severity | evidence |
| --- | --- | --- |
| F1. Six new serious `color-contrast` nodes on epic item names, ratios 2.35–3.59, up from one node pre-change | advisory | `after-upgrades/a11y.json` `472/1280` and `472-narrow/375` (7 nodes each) vs `before-upgrades/a11y.json` (1 node each); matched at identical colours and ratios by `after-gear-final/a11y.json` (13 nodes) |
| F2. Gear list gained accessible names on 62 icon-only buttons — deliberate, an improvement, but the Gear list is not unchanged in *behaviour*, only in rendering | advisory | `before-gear/a11y.json` `button-name` 62 critical nodes; `after-gear`, `after-gear-scss`, `after-gear-final` have zero |
| F3. Gear list carries 31 critical `image-alt` nodes on its item icons; the Upgrades table does not, so the restyle did not import it | advisory, out of scope for 472 | `after-gear-final/a11y.json` `image-alt` 31; `after-upgrades/a11y.json` has no `image-alt` rule |
| F4. Hover is unmeasurable at 375 (harness computes the pointer coordinate before re-emulating the width) | advisory — scoped out of the acceptance sentence, not worked around | `manifest-upgrades.json` `472-narrow` acceptance states the exclusion; the entry has no hover interaction and no `hoverBg` fact |
| F5. Captures show a running state (~6 landed rows), not a completed run; nothing here judges final row count, ordering or totals | advisory | `after-upgrades/472-post-run-1280-0.png` reads "Simming 7/504… (6 rows landed)"; `rowCount` 6 |
| F6. The four round-1 control directories were captured with `forkDirty: true` | advisory, no longer load-bearing | `before-gear`, `after-gear`, `after-gear-scss`, `before-upgrades` `index.json`; superseded for verdict purposes by `after-gear-final` and `after-upgrades` at `15665779c` clean |

No blocking findings.

### Round 1 findings, resolved

| round-1 finding | resolution |
| --- | --- |
| V1. 375 clause unjudgeable — action cells off-frame, no overflow measurement | **resolved.** `472-narrow` measures `tableRect.width` 509.98 vs `scrollHostRect.width` 340.0 with `scrollHostOverflowX` `auto`, corroborated by the two PNGs' pixel widths (340 and 509) |
| V2. 375 `hoverBg` did not measure hover | **resolved by scoping.** The fact and the interaction are removed from the 375 entry; the acceptance sentence states the exclusion and its cause |
| V4. `contested:` every capture `forkDirty: true` | **withdrawn.** `after-upgrades` and `after-gear-final` are `forkDirty: false` |
| V5. `after-upgrades` captured at `88773696a`, not the stated tip | **resolved.** Both judged directories are at `15665779c5f4544176759f49033cc711bcaa0c96` |
| V7. `before-upgrades` captured against a scratchpad manifest | **stands, harmless.** `before-upgrades/index.json` still names `...\scratchpad\manifest-upgrades-before.json`. Expected — the pre-change tree has no favorite/batch selectors to measure — so the before/after `facts.json` are not key-for-key comparable. Only the keys that exist on both sides are compared above |

## a11y counts per state

Violation nodes by rule, from each `a11y.json`. Round-2 directories in bold.

| capture dir | state / width | button-name | color-contrast | image-alt |
| --- | --- | --- | --- | --- |
| `before-gear` | `472-gear` / 1280 | 62 (critical) | 13 (serious) | 31 (critical) |
| `after-gear` | `472-gear` / 1280 | 0 | 13 (serious) | 31 (critical) |
| `after-gear-scss` | `472-gear` / 1280 | 0 | 13 (serious) | 31 (critical) |
| **`after-gear-final`** | `472-gear` / 1280 | 0 | 13 (serious) | 31 (critical) |
| `before-upgrades` | `472-pre` / 1280 | 0 | 0 | 0 |
| `before-upgrades` | `472-pre` / 375 | 0 | 0 | 0 |
| `before-upgrades` | `472` / 1280 | 0 | 1 (serious) | 0 |
| `before-upgrades` | `472` / 375 | 0 | 1 (serious) | 0 |
| **`after-upgrades`** | `472-pre` / 1280 | 0 | 0 | 0 |
| **`after-upgrades`** | `472-pre` / 375 | 0 | 0 | 0 |
| **`after-upgrades`** | `472` / 1280 | 0 | 7 (serious) | 0 |
| **`after-upgrades`** | `472-narrow` / 375 | 0 | 7 (serious) | 0 |

No rule other than the three columns above appears in any of the six reports.

## Verdict

**Ticket 472: pass.** All three acceptance sentences are satisfied by captures
taken clean at fork `15665779c5f4544176759f49033cc711bcaa0c96`. No blocking
findings. The contrast increase (F1) is advisory and the baseline decision remains
with the orchestrator.

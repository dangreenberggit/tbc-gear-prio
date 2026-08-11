Status: open
Type: bug
Origin: owner report against the live report, 2026-08-11 (screenshot of the Curated ranked list under package mode)
Blocks: none
Blocked by: none

# Package-mode chips show one shared figure as if it were each piece's own value

Under the **Package** set-weight mode, every chip in the Curated ranked list
swaps its own delta for the package figure and shows nothing else. Four chips
then read identically, and a reader has no way to tell that the number is one
figure shared across all four rather than four separate measurements.

The owner's words:

> the +64.07 is baked into the gear slots but doesn't show the specific piece's
> individual dps effect plus (separately, visually) what it provides from the
> set bonus. that's misleading.

## The live example

From `.scratch/rank-reports/shredzepelin-p3.json`, the four Thunderheart (T6)
pieces that form one 4pc completion package:

| item | id | own delta | chip under package mode |
|---|---|---|---|
| Thunderheart Leggings | 31044 | +23.29 | **+64.07** |
| Thunderheart Gauntlets | 31034 | +21.75 | **+64.07** |
| Thunderheart Chestguard | 31042 | −100.16 | **+64.07** |
| Thunderheart Pauldrons | 31048 | −106.16 | **+64.07** |

Re-derive:

    python -c "import json;r=json.load(open('.scratch/rank-reports/shredzepelin-p3.json'));print([(i['itemId'],i['name'],round(i['deltaDps'],2),round(((i.get('setContext') or {}).get('package') or {}).get('deltaDps',0),2)) for i in r['ranking']['items'] if 'Thunderheart' in i.get('name','')])"

The Pauldrons chip reads +64.07 while that swap on its own is **−106.16**. The
chip is not wrong about the package — it is wrong about whose number it is.

## Why the row is fine and the chip is not

The slot rows already say this correctly. `formatPackageMembershipLine`
(`packages/core/src/rank-report-rules.ts:511`) renders, on every package member
row and in every mode:

> this swap alone: −106.16 — part of 4pc package: +64.07 for the whole package
> (4 Thunderheart pieces vs current gear; …)

That sentence is the shipped answer to exactly this confusion, and the CSS
comment at `rank-report-css.ts:325-327` says why it renders in every mode: under
package mode the row's number column has switched to the package figure, so the
`.package-line` is the one place the row's own delta survives.

**The chips got none of that.** `chipHtml` (`packages/core/src/rank-report.ts:113`)
emits a single `<span class="d">` carrying four alternative labels as attributes:

    data-plain / data-weighted-label / data-full-label / data-package-label

and the client script (`rank-report.ts:662-670`) overwrites `textContent` with
whichever one the mode selects. In three modes that is fine — the figure is a
property of the item. In package mode it is a property of a **group**, and the
markup has no second slot to say so.

## The fix

Every package-mode chip must show **two visually distinct values**: the piece's
own single-swap delta, and the package figure marked as the package's.

Proposed layout, consistent with the row's existing "this swap alone: X — part
of 4pc package: Y" wording:

    −106.16 · pkg +64.07

- The own delta stays in `.d`, styled as it is in every other mode, so the chip
  never loses the number that describes this piece.
- The package figure goes in a **new, separate** span (e.g.
  `<span class="pkg" data-package-label="…">`), visually subordinate — smaller,
  muted, and prefixed with a literal `pkg` marker so the two numbers are never
  read as a range or a before/after.
- That span renders **only** under package mode, reusing the
  `display: none` / `body.package … { display: … }` pattern already in the
  stylesheet for `.chip.package-only` (`rank-report-css.ts:215-216`).

Chips are small and the design must stay legible at chip size, so the chip
carries exactly two numbers and a three-letter marker. The row detail already
carries the full sentence, and the chip's `title` tooltip is where anything
longer belongs — it already carries package wording for admitted chips
(`rank-report.ts:121-122`). Keep the set name, the piece count, and
`GEM_POLICY_QUALIFIER` in those two places.

### What each of the four modes must show

Package-carrying chips only; a chip with no positive `setContext.package` is
unaffected in all four modes and must render byte-identically to today.

| mode | `.d` shows | `.pkg` span |
|---|---|---|
| off | own delta | hidden |
| weighted | weighted potential | hidden |
| full | full potential | hidden |
| package | **own delta** | **visible, `pkg +64.07`** |

Note the change in the package row: `.d` currently shows the package figure and
must switch back to the own delta. The script's label swap
(`rank-report.ts:662-670`) therefore drops its `package` arm for `.d` — under
package mode `.d` falls through to `data-plain`.

### Sorting does not change

`packageSetPotentialDps` (`rank-report-rules.ts:494`) stays the sort key, and
the chip keeps its `data-package` attribute, which is what the sort reads
(`rank-report.ts:636-641`). This ticket moves **display only**. A package member
must keep sorting by its package figure — that is ADR-0024's decision and is not
reopened here.

### No information loss

Nothing currently on a chip may disappear. After the change each chip still
carries `data-plain`, `data-weighted-label`, `data-full-label`,
`data-package-label`, `data-delta`, `data-weighted`, `data-full`,
`data-package`, `data-item-id`, `data-abs-rank`, `data-sources`, its `title`,
and its `.pos` / `.n` / `.abs` spans. The JSON export reads `data-item-id`
(`updateExport`, `rank-report.ts:741-746`) and must be unaffected.

## Where to change it

- `packages/core/src/rank-report.ts:113` — `chipHtml`, the chip markup and its
  `data-*` attributes. Add the `.pkg` span here, emitted only when
  `packageSetPotentialDps(i) !== i.deltaDps` so ordinary chips keep their exact
  current markup.
- `packages/core/src/rank-report.ts:662-670` — the client script's label swap.
  Drop the `package` arm for `.d`.
- `packages/core/src/rank-report-css.ts` — near the `.chip .d` rule at :208 and
  the `.chip.package-only` rules at :215-216. Add `.chip .pkg { display: none }`
  plus a `body.package .chip .pkg` arm.
- Nothing in `rank-report-rules.ts` needs to move. The rules module already
  exposes both figures; this is a rendering bug.

## Tests and goldens that move

- `packages/core/test/rank-report.test.ts:1570` — "curated ranked list chips".
  Add a red test first: a package member's chip contains **both** its own delta
  and the package figure, and the two are in different elements.
- `packages/core/test/rank-report.test.ts:2136` — "renders chips for
  package-positive members that miss the cutoff". The admitted-chip assertions
  live here and will need the new span.
- `packages/core/test/rank-report.test.ts:2168` — "leaves the above-cutoff chip
  list unchanged". Must stay green: order does not move.
- The document digest golden around `rank-report.test.ts:440-530` repins. That
  fixture carries no `setContext.package` on any row, so the expected body delta
  is **CSS only** — dump both documents and diff before repinning, and record
  the diff in a comment the way every previous repin there does. If body markup
  moved in that fixture, the "only when it has a package" guard above is missing.

## Acceptance criteria

- [ ] Under package mode, a chip for a package member shows its own delta and a
      separately-marked package figure in two distinct elements.
- [ ] The Thunderheart Pauldrons chip (31048) shows `−106.16` and a package
      marker, not `+64.07` alone.
- [ ] In `off`, `weighted`, and `full` modes the chip renders exactly as it does
      today — no package span visible.
- [ ] A chip with no positive package is byte-identical to today in all four
      modes.
- [ ] Chip sort order under package mode is unchanged (still on `data-package`).
- [ ] The export panel's item list is unchanged for the same filters.
- [ ] The digest golden's repin comment names the diff that was actually
      inspected.
- [ ] `pnpm verify` green.

## Re-run commands

Exercise the chip markup:

    pnpm vitest run packages/core/test/rank-report.test.ts

The figures quoted above come from the committed artifact
`.scratch/rank-reports/shredzepelin-p3.json` via the `python -c` command in "The
live example". The +64.07 package figure's own provenance and its measurement
caveats are ticket 103; nothing here re-measures it.

## Related

- **ADR-0024** decides that a package figure may score a member row under the
  opt-in view. This ticket does not touch that decision — it fixes how the chip
  *labels* the figure.
- **Ticket 103** covers whether +64.07 is the right number. This ticket is about
  whether the chip says whose number it is. They are independent.

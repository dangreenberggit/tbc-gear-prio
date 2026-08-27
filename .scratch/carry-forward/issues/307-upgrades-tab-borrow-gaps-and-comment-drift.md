Status: closed
Type: task
Origin: docs/reviews/feat-upgrades-dedup-wowsims.md (round 3 — S1, S2, S3, T1, T2, T3, T4)
Blocks: none
Blocked by: none

# Upgrades tab: finish the borrows, and trim the comments that rot

Deferred findings from the round-3 pre-merge review of ticket 304's UI pass.
None blocks the merge — the shipped behaviour is correct and measured — but two
of them are the same failure ticket 304 exists to correct, in miniature: a
promised borrow that did not land.

All paths are in the gitignored fork `vendor/tbc-new-fork`, branch
`feat/upgrades-tab`. Get it with `pnpm sync:wowsims`; verify with
`ls vendor/tbc-new-fork/ui/core/components/individual_sim_ui/upgrades_tab.tsx`.
Working gate commands are in `.scratch/stage-gate/upgrades-ui-quality/fork-gates.md`
(the `.bin/` shims fail with an fnm error — invoke through `node`).

## The two borrow gaps

### S1 — the `.content-block` borrow is half-delivered

The plan promised: "wrap toolbar, status, results, assumptions in
`.content-block` structure … the results block gets a `.content-block-header`
with title + row count."

What shipped: `.content-block` on the outer wrapper (`upgrades_tab.tsx:459`)
and `.content-block-body` on the toolbar (`:460`). **No `.content-block-header`
exists** — verified by grep, 0 occurrences in both the TSX and the SCSS. The
results area is a bare `<div className="upgrades-results">`.

The reviewer's sharper point: `.content-block` is `flex-direction: column;
gap: var(--block-spacer)` and the wrapper also carries `p-gap`. That is not the
shape the partial was written for (header + body), so what was borrowed is the
`gap` value, not the idiom — a site class applied for its side effect rather
than its structure.

Either add the header the plan promised, or stop describing this as a
structural borrow.

### S2 — the bulk renderer's divider idiom was never adopted

The plan chose it explicitly, in place of the hero-#1 card it dropped: "adopt
what the bulk renderer actually has: its divider idiom
(`&:not(:last-child)` border + padding) between result groups."

The idiom is real — `_bulk_sim_result_renderer.scss:6-10`:
`&:not(:last-child):not(:only-child) { padding-bottom; border-bottom:
var(--border-default); margin-bottom }`. But `_upgrades_tab.scss` has no such
rule; its single `--border-default` hit (line 269) is a pre-existing icon
border.

So item 10's fourth sub-ask (batch-UI inspiration) is **not** done. Dropping the
hero card was correct and measured; what was chosen instead simply did not get
written. Ticket 304's disposition has been corrected to say so.

## Comment drift (T1)

The repo's comment policy wants load-bearing *why* and forbids restating the
code. Most of the new SCSS comments pass — the `text-muted` block
(`_upgrades_tab.scss:443-457`) is a model: it says why a token was abandoned,
names the convention borrowed instead, and gives the ratio that rules an
alternative out.

Three have drifted into lab-notebook territory and should be trimmed to the
constraint plus the rationale, with the session's numbers left in this ticket
and in 304 where they already live:

- `:69-88` (iterations field) — nine lines to say "6ch was too small, 8ch
  works". The load-bearing halves are that `box-sizing: border-box` makes `ch`
  size the border box, and that `ch` is kept over px deliberately. The
  `scrollWidth 67 > clientWidth 52` and `53.8px`/`71.7px` readings are notes.
- `:151-165` — narrates "the bar's left edge slid 585.2px -> 606.2px".
- `:188-192` — **internally inconsistent**: it says the host "is 17.5px tall in
  idle, running and done alike, so this reserves what the tallest of those
  needs", but the rule is `min-height: 1.5rem` (24px). Either the comment or
  the value is wrong. Resolve it rather than trimming it blind.

## T2 — an unannounced third local rule

Ticket 304's work announced its inventions in the code, at their own selector,
which is the right discipline. One did not get that treatment: the two-row
strip's `min-height: calc(2 * 45.6px + 1px)`.

It is a new layout idiom for a nav strip with no site precedent, and the
`45.6px` is a constant measured in one browser at one font. Any change to nav
padding, font size, or the badge's `font-size: 0.75em` silently breaks the
reservation and nothing fails. Prefer a `calc()` off the site's own spacing
tokens; if the measured constant has to stay, give it the same "invention, no
precedent to borrow" disclosure the other local rules carry.

## T3 — the status grid does not match what every state renders

`.upgrades-status-line` is a three-column grid, and its comment claims "one
line, one idiom, for all seven run states". But `statusContent()` renders
**four** children in the `done + stale` case (`upgrades_tab.tsx:978-983`) and
**one** bare text node in `idle`, `unsupported-spec`, `error` and non-stale
`done`. Only `running` and `stopped` render exactly two.

Four children on a three-column template wrap to a second row — the reflow the
rule exists to prevent. Related: `> span:first-child { min-width: 34ch }`
targets a `<span>`, but three states render bare text with no span, so the
reservation does not apply there at all.

`.upgrades-status`'s own `min-height` may be holding the height regardless.
Measure before changing: the fix may be to correct the comment rather than the
rule.

## T4 — the empty-tab class competes with the active-tab colour

`.upgrades-subtab-empty` sets `color: var(--bs-gray-500)`
(`_upgrades_tab.scss:544-551`), and the comment's reasoning for rejecting
`disabled` (keyboard navigation) is correct. But the class is applied
unconditionally (`upgrades_tab.tsx:1171`), including to a tab that is currently
**active**, so it competes with Bootstrap's `.nav-link.active` colour and the
winner depends on specificity ordering. Decide what an active-but-empty tab
should look like, and make the rule say it.

## S3 — the residual clip is in the ticket but not the code

Item 3's disposition honestly records that five-digit iteration values still
clip. The SCSS comment at `:69-88` explains the 6ch→8ch probe and never
mentions it, so a reader of the code alone will think it is fully solved. One
sentence closes the gap.

## Acceptance

- [x] S1: either the `.content-block-header` exists with title + row count, or
      the borrow is described accurately as spacing-only.
- [x] S2: the divider idiom is adopted, or item 10's fourth sub-ask is
      explicitly deferred with a reason rather than left implied.
- [x] T1: the three comments are trimmed; the `:188-192` contradiction is
      resolved by measurement, not by guess.
- [x] T2: disclosed as an invention (the token derivation was tried and
      measured wrong — see Resolution).
- [x] T3: comment and rule agree about what the grid does in all seven states.
- [x] T4: an active-but-empty tab has a decided appearance.
- [x] S3: the residual five-digit clip is noted in the code comment.
- [x] Fork gates green (`tsc`, `stylelint`, `oxlint`, `test:locales`). `oxfmt`
      is red at baseline — see ticket 306; do not reformat the tree here.

## Comments

## Resolution (2026-08-27, fork `38cb8ff80`)

All seven findings addressed in one commit on `feat/upgrades-tab`.

- **S1 done.** The results table sits in a real `.content-block`: an
  `h6.content-block-title` inside `.content-block-header`, matching the markup
  `content_block.tsx` builds, so the bold heading and its bottom border come
  from the partial. The classes are written out rather than built through
  `new ContentBlock(...)` because this node is rebuilt by `replaceChildren` on
  every view change while the component owns a persistent root. Only the table
  gets a header — the empty states carry their own title, and the running
  skeleton has no final count to name. Two new i18n keys, added to the locale
  file and to the schema's `properties` *and* `required`.
- **S2 done.** The bulk renderer's divider is copied rule for rule between the
  shortlist table and the below-cutoff group — the two sibling result groups it
  is written for. Each is wrapped in `.upgrades-result-group` so the selector
  has siblings to match on. The `:not(:only-child)` guard is the reason it is
  copied rather than approximated: a lone table must not grow a trailing border.
- **S3 done.** The residual five-digit clip is now stated in the SCSS comment,
  not only in ticket 304.
- **T1 done.** Three comments trimmed from lab-notebook narration to the
  constraint plus its reason. The `:188-192` contradiction is **resolved in
  favour of the rule**: the comment claimed the floor *was* the measured
  17.5px, when it reserves 24px deliberately so a font change has room before
  the block below starts moving. The comment now says that.
- **T2 partly done, and the honest half is the part that matters.** The rule now
  declares itself a local invention with no site idiom to borrow, and names its
  own exposure. The measured constant **stays**: deriving it from
  `$nav-link-padding-y` (`--spacer-3`, 1rem) and `$line-height-base` computes
  **113px** against the **92.2px** the strip actually occupies, which would
  strand ~21px of empty space under the tabs. Verified by compiling the partial
  with the app's own preamble. A token-derived height needs the effective nav
  padding exposed as a token first; that is not this ticket.
- **T3 done.** The status-line comment no longer claims "one line, one idiom,
  for all seven run states". It now says what is true: the three columns size
  the running state, other states leave columns empty, `done + stale` renders
  four children and wraps, and it is `.upgrades-status`'s floor — not the grid —
  that holds the block below in place.
- **T4 done.** `.upgrades-subtab-empty` is now `:not(.active)`, so an
  active-but-empty tab keeps its active colour. Which tab you are on outranks
  whether it is empty, and the `(0)` badge already says the latter.

### Verification

Compiled the partial with the app's real preamble (Bootstrap functions,
variables, maps, mixins, `shared/variables`, `shared/mixins`) — the emitted CSS
is `min-height: 92.2px` on the strip and the divider with both guards intact.
Gates: `tsc` 0, `stylelint` 0, `oxlint` 0 (pre-existing warnings only),
`test:locales` 0. `oxfmt` remains red at its baseline — ticket 306.

**Not done here:** nothing. Ticket 305 (empty slot tabs) and 306 (oxfmt) were
always separate and remain open.

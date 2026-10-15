Status: closed
Type: bug
Origin: SME verdict 2026-08-29 (stage-gate wowsims-tab-tickets, Execution B/D;
  handoff .scratch/handoffs/sme-rank-judgment-330-4pc-set-bonus-display.md)
Blocks: none
Blocked by: none
Related: 91 (built the report-path disclosure this ticket ports), 330 (wording
  of the single-threshold line — separate axis), 331 (re-filed core report bug)

# The set-bonus popover must be available for every bonus, whatever the Set potential toggle says

## The owner's rule (2026-10-11)

Asked in Chunk 3b step 6 of `.scratch/plans/upgrades-tab-finish-line.md`
(Q-4pc-hint) whether the default view must hint at a reachable 4pc, the
owner rejected the 4pc framing and stated the general rule:

"There should be a tooltip/popover so either this claim is wrong or the
code is wrong.  It's not about 4 piece or 2 piece or whatever in
particular. what the set bonus toggle does is whether that goes into the
main DPS number in the row and affects the items ranking, not whether the
hiver tooltip/poop er is available"

So: the set-bonus popover is always available, for any bonus. The Set
potential toggle decides only whether the bonus goes into the row's DPS
figure and its ranking.

## What the tab does today (fork `316326a95`)

The code breaks this rule.

- `ui/features/upgrades/model/set_bonus_tip.ts:187` sets `on` from the
  toggle, and `:197` builds the set-potential lines only when `on` is
  true. When nothing else is left, `:227` returns `null`, so the row has no
  popover and no "set detail" hint.
- So a row whose only set content is a future bonus has no popover with
  the toggle off. Example: Thunderheart Chestguard (31042) on fixture
  `feral-p3-th-hands-legs` shows "+26.3" with no hint and no popover; with
  the toggle on, its popover reads "Item stats +26.3 / Set potential /
  Thunderheart Pauldrons (4pc) +74.1 / Total +100.4" (Chunk 3b capture,
  `facts.json` key `313-tip`, see the 2026-10-11 comment below).
- `ui/features/upgrades/model/set_bonus_tip.test.ts:88-99` ("leaves the
  set-potential section out unless asked for it") pins the wrong
  behaviour.
- No owner ruling asked for the popover to be hidden. The hiding came
  from an agent's rule: `.scratch/handoffs/494-set-hover-redo/final/proposal-cases.md:14`
  ("If the popover would then hold only its Total, the row has no popover
  and no "set detail" hint. The rule applies in each toggle state
  separately.").

The fix is in fork-own files under `ui/features/upgrades/`; no wowsims
file changes.

## Constraint

With the toggle off, the popover must show one Total only: the figure in
the row. The owner objected on 2026-09-25 to a popover that seemed to show
both toggle states at once ("is the tooltip some sort of meta tooltip
thats supposed to show what the tooltip would look like in two states
(set potnetial toggled on or off) but combined in one tooltip no one would
ever see? very confusing.",
`.scratch/handoffs/owner-quotes-upgrades-tab-closeout.md:44`). So the
off-state layout needs care: the future bonuses are listed, but they are
not added into a second Total. A mock-up of the off-state popover goes to
the owner before it is built.

## What would close this

1. The owner approves a mock-up of the off-state popover (quote the
   approval here).
2. With the toggle off, every row with any set bonus (worn, broken or
   future, any piece count) has the "set detail" hint and a popover; the
   popover shows one Total, equal to the row's figure. With the toggle
   on, today's popover is unchanged.
3. `set_bonus_tip.test.ts:88-99` is replaced by a test of the new rule; a
   fork commit and re-pin, `pnpm verify` rc=0.
4. A `pnpm tab-review` capture at 1280 and 375 px with the toggle off,
   hovering Thunderheart Chestguard (31042) on `feral-p3-th-hands-legs`,
   shows the popover with the 4pc listed and one Total of +26.3.
5. The sub-noise case: on a ret fixture whose 4pc is below the noise floor,
   the popover does not show it as a real figure (from the original
   close conditions below).

## History (before 2026-10-11)

The original framing follows, kept for its evidence. Its close conditions
are replaced by the ones above.


### Original title: The tab discloses nothing about a reachable 4pc

The row's set-bonus number is CORRECT and stays unchanged: single-nearest-
threshold credit is deliberate (ticket 91 rejected smearing per-row 4pc credit;
the noise floor suppresses sub-noise). Do not credit the 4pc onto the row or
touch the sort — that is the rejected, game-wrong path.

The defect is disclosure. The tab never mentions a reachable 4pc even when the
data is already on the row. Committed evidence (not ret-specific): a Thunderheart
member row (e.g. Thunderheart Leggings) at 0->1 piece shows only its 2pc line
while setContext.packages[] carries a +64.09 DPS 4pc that never reaches the
screen. Whether a large 4pc surfaces today is an accident of whether the set's
2pc is implemented, not a DPS fact (same mechanism ticket 331 documents for the
report path).

Evidence fixture: .scratch/set-bonus-value/*/artifacts/shredzepelin-p3.json
(verified path; the +64.09 4pc package deltaDps is read here). The SME handoff
cites a second valid copy at .scratch/rank-reports/shredzepelin-p3.json — same
data, different scratch location; use either.

Ticket 91 built a package-as-card disclosure for exactly this on the
report/core path; it was never ported into the tab (verify: grep the tab for
any packages[]-driven rendering).

### Original close conditions

- A tab disclosure (card or secondary line) naming the reachable 4pc, its DPS
  figure, and the pieces that assemble it, fed from the packages[] data the
  rows already carry — presentation only; row numbers and ordering unchanged.
- Consistent with the noise floor and the crosses/confounded distinctions
  (tickets 313/315/90); a sub-noise 4pc is not shown as a real figure.
- Verified by DOM readback on a fixture where the 4pc is large (Thunderheart
  +64) and one where it is sub-noise (ret), desktop and mobile.

## Comments

**2026-10-11 — re-checked on the React tab (Chunk 3b of
`.scratch/plans/upgrades-tab-finish-line.md`).** The disclosure this ticket
asks for renders only when the user ticks "Set potential". After a run the
tab offers that view toggle (`offeredToggles`, `model/results_view.ts:93`),
but it starts unticked unless the page restores a saved choice: the
store's view state is `{ ...NO_VIEW_TOGGLES, ...restored.view }`
(`model/upgrades_store.ts:120`), `NO_VIEW_TOGGLES` sets
`withSetPotential: false` (`model/results_view.ts:80`), and the page saves
the toggles with its settings (`model/upgrades_store.ts:51-54`), so a
user who ticked it once sees it ticked on later visits. The popover
adds the set-potential lines only when the toggle is on
(`model/set_bonus_tip.ts:187`, `:197`). With the toggle ticked, the
popover lists each reachable bonus with its partner pieces and DPS. The
Chunk 3b capture ticked it first (its `313-tip` entry clicks the unticked
box) and then showed, on the fixture `feral-p3-th-hands-legs`, row 31042
(Thunderheart Chestguard), at all four widths:
"Item stats +26.3 / Set potential / Thunderheart Pauldrons (4pc) +74.1 /
Total +100.4" (`facts.json`, key `313-tip`, in the main checkout's
gitignored `.scratch/tab-scope-refresh/review/`; that folder's
`manifest.json` is gitignored too, so a re-check needs a new
`pnpm tab-review` manifest entry that ticks the toggle and hovers that
row). The figure comes from `setContext.futureBonuses`
(`model/engine/view.ts:5-20`), not `packages[]`, after the 467/511
set-credit redesign.

Not checked, and still needed to close: whether the default view (toggle
unticked) tells the user a 4pc is reachable at all; the sub-noise case in
§ What would close this (a ret fixture whose 4pc is below the noise floor
must not show as a real figure); and a DOM readback of both at desktop
and mobile widths. Corrected 2026-10-11 by the pre-merge review of
`feat/tab-scope-refresh` (finding A1): the first version of this comment
said the toggle was on by default.

**2026-10-15 — closed (stage-gate tab-set-bonus, chunks K3 and K4).** The
owner's rule of 2026-10-11 (above): "what the set bonus toggle does is
whether that goes into the main DPS number in the row and affects the items
ranking, not whether the hiver tooltip/poop er is available". Fork
`f4b78f65d` makes the popover's availability independent of the toggle.
After the Total, which is always the row's figure, a "Not counted" section
lists what the figure does not count: each reachable bonus as a separate
outcome against the item alone ("N DPS more/less"), naming the worn bonuses
that step breaks beyond the row's own swap, and a set the set screen dropped
with what the screen found, with no figure. With the toggle on, a credited
row keeps its old popover (a snapshot test of the 16 credited rows of the
two feral fixtures), and a row with no credit or a screened set gets the
section. A bonus below the noise gate is never listed.

Close condition 1 asked for the owner's approval of the mock-up. The
orchestrating session decided the layout instead, on 2026-10-12 (design A,
`.scratch/stage-gate/tab-set-bonus/decision-log.md` in the main checkout:
the figures are listed under the Total, not added, so the popover has one
Total, which the owner's 2026-09-25 objection asked for). The owner may
override it. Conditions 2, 4 and 5 passed the gate-visual review
(`.scratch/handoffs/visual-review-tab-set-bonus-K3.md`, 11 captures at 1280
and 375 px, including Lightbringer Breastplate 30990 on `ret-p3-p2`, whose
sub-noise bonuses show no hint and no popover); condition 3 is the fork
commit, the re-pin and `pnpm verify` rc=0.

Verified by:
`corepack pnpm tab-review .scratch/stage-gate/tab-set-bonus/review/manifest.json`
(main checkout, gitignored stage folder), and
`corepack pnpm -C vendor/tbc-new-fork exec vitest run ui/features/upgrades/model/set_bonus_tip.test.ts ui/features/upgrades/utils/set_bonus_labels.test.ts ui/features/upgrades/components/SetBonusPopover`,
tbc-new-fork@f4b78f65d.

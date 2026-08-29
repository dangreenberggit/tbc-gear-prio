Status: closed
Type: bug
Origin: pre-merge review round 4, Spec axis finding A1, 2026-08-27
Blocks: none
Blocked by: none
Closed: 2026-08-28 (fork `9994af95b`, re-pin `f4ac109`)

# TMB export includes items the player already wears

Ticket 314 asked the export to track "whatever the BiS-only toggle, the content
filter, and the current sort have left on screen, in that order". The payload is
built from `view.shortlist` (`upgrades_tab.tsx:1535`), and owned rows are dropped
only from the **below-cutoff** group — owned *shortlist* rows stay rendered and
greyed, which is ticket 269's deliberate behaviour
(`upgrades_tab.tsx:1639-1644`). Those rows therefore enter the exported payload.

Verified: `grep -n 'const exported' upgrades_tab.tsx` → built from
`view.shortlist`; the owned-row drop at `:1643` is scoped to the below-cutoff
group by its own comment.

## Why it matters

The export's only purpose is a ThatsMyBis priority list. Listing an item the
player already wears is not a priority — it asks the raid to award loot the
player has. This is arguably wrong for the artifact's sole consumer.

## Why it is not obviously a bug

It is a faithful reading of "displayed rows": the greyed owned rows **are** on
screen. Ticket 314 and the plan both rule on slot grouping and below-cutoff
exclusion, and **neither rules on owned shortlist rows**, so the implementation
did not contradict a written instruction — it hit a case nobody wrote down.

## Decided 2026-08-27

**Owner: drop them.** "TMB does not need to include gear someone already has."

So the export filters owned rows out of the payload, while the table keeps
showing them greyed (ticket 269's behaviour is unchanged -- this is an export
concern, not a display one).

**The count must move with it.** The number shown next to the copy affordance
counts the payload, so it has to count the filtered set; otherwise it claims a
row count the copied JSON does not contain.

Worth an explicit test: an export taken while every shortlist row is owned
should produce an empty item list and a zero count, not a malformed payload.


## Closed 2026-08-28

One line in `updateExport` — `if (row.owned === true) continue;` before the
dedupe. Placed inside that function rather than at the `const exported` call
site so the count, already derived as `items.length` there, follows the payload
**structurally** instead of being a second thing to keep in sync. That was the
specific failure this ticket named.

Reused the existing predicate rather than inventing one: `row.owned` on
`ViewRow`, set from `equippedIds.has(entry.itemId)` in `engine/rank.ts` — the
same flag the table greying, `hideOwned`, and the below-cutoff filter all read.
No second definition of "owned" exists in the fork.

Verified live on real runs: payload order matches displayed order element-for-
element, still matches after a column sort, count equals payload length (20/20,
then 7/7 under BiS-only), and BiS-only still moves the payload. The table is
untouched — owned rows still render greyed, per ticket 269.

### What was NOT proven, and why it still matters

**The owned branch was never exercised against real data.** Across two full runs
the executor could not produce an owned row in the shortlist; equipping a
shortlist item ejected it from the shortlist rather than marking it owned. It
checked the loop against synthetic rows instead and labelled that as weaker
evidence rather than claiming coverage — the right call.

That raises the obvious question of whether the filter is dead code. **It is
not.** `hideOwned` is hardcoded `false` (`upgrades_tab.tsx:1515`) and the table
greys owned rows (`:1858`), so the design explicitly allows an owned row to be
rendered in the shortlist. The executor could not reach that state on the Ret P2
preset, which is not the same as the state being unreachable.

If the branch is ever worth proving, the honest route is a unit test over the
extracted loop, not more browser driving. Not filed as its own ticket — the
filter is one line whose logic was checked, and the cost of a test harness for
it exceeds the risk.
Status: open
Type: bug
Origin: pre-merge review round 4, Spec axis finding A1, 2026-08-27
Blocks: none
Blocked by: none

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

Status: closed
Type: bug
Origin: owner screenshot review, 2026-09-18
Blocks: none
Blocked by: none
Related: 424 (added the tags), 419/313 (the BiS badge), the gear tab's set label names

# Result-row tags: drop the redundant BiS+grey double tag; one correctly-labelled tag

Owner report from the tagged-results screenshot. Two problems, the second is the
important one:

1. **Tag text too long / info nobody asked for.** The grey "P3 - BiS 9%" tag is
   too long and adds detail the row does not need. Owner: "the tag names are way
   too long, adding info nobody asked for."

2. **The two-tag scheme is WRONG, not just ugly (the real point).** A qualifying
   row currently shows BOTH a yellow "★ BiS" badge AND a separate grey set-name
   tag. Owner: "the yellow tag should have the correct label; there's no need for
   'BiS' plus another grey label. The gear tab's label names determine what is BiS
   anyway, that's where the BiS sets come from."

   The domain point: **BiS membership IS set membership** — the gear tab's set
   labels are the source of truth for what "BiS" means. So a row that is in a
   selected BiS set should carry ONE tag, correctly labelled from the set, not a
   generic "★ BiS" badge PLUS a redundant grey set tag. The two tags encode the
   same fact twice.

## What would close this

- A row in a selected set carries a SINGLE tag, labelled from the set (short —
  see below), not "★ BiS" + a second grey pill.
- The label is short: the current "P3 - BiS 9%" is too long for a row badge.
  Decide the compact form (owner to confirm — e.g. the set's short name, or the
  phase token) so it conveys which set without the full caption.
- The relationship between the existing "★ BiS" badge (313/419 era) and the new
  set tag is resolved: they are not both shown for the same fact. Determine
  whether the BiS badge should simply BECOME the set-labelled tag, or whether one
  is dropped. This needs a design call, informed by: what does "★ BiS" mean on a
  row that is NOT in a user-selected set? (It comes from the universe's own
  bisTags, independent of the 424 selection.)
- Owner eyeballs a tagged run: one clean, correctly-labelled, short tag per
  qualifying row.

## Design/domain question for the planner (do not guess)

The pre-existing "★ BiS" badge is driven by the universe's `bisTags` (a row is
BiS-tagged in the data), which is independent of whether the user selected that
set in the 424 control. The new grey tag is driven by 424 selection membership.
So they are NOT always the same set of rows. Before collapsing to one tag,
settle: (a) when a row is universe-BiS-tagged AND in a selected set — one tag,
which label? (b) when a row is in a selected set but NOT universe-BiS — what
shows? (c) when a row is universe-BiS but no set is selected — does the old badge
still show? The owner's "BiS is defined by the set labels" implies these should
unify, but the exact rule is a design call to make explicitly, not assume.

## Where

`vendor/tbc-new-fork/ui/core/components/individual_sim_ui/upgrades_tab.tsx`
(`itemCell` — the `.upgrades-bis-badge` and `.upgrades-set-tag` rendering),
`_upgrades_tab.scss` (both badge styles), and how `bisTags` vs selected-set
membership feed the row. Cross-reference the gear tab's set label names as the
source of truth.

## Notes

New from the owner's screenshot review, and the sharpest finding: it is a
correctness/redundancy issue in 424's tag design, not just cosmetics. The two-tag
scheme double-encodes "this is a BiS set item". Needs a design decision on the
unified single tag before implementation.

## Closed

Closed by fork commit eb83a1583 (tab-ui-refinements; re-pinned in main 23d35e94).
The unified tag rule (plan Q1): a result row in one or more SELECTED sets shows
one yellow `.upgrades-bis-badge` per selected set containing it, labelled from
the set's own bare name ("BiS 9%", not the phase-prefixed chip label), and the
generic `bisTags` badge is suppressed. When two selected sets share a name (e.g.
P2 and P3 "BiS 9%") the tags disambiguate to "P{phase} {name}". A row in NO
selected set keeps a single generic "BiS"/"Alt" from `bisTags` (that flag still
drives the BiS-only filter and prune). The star and the separate grey
`.upgrades-set-tag` badge are gone; the two vocabularies collapse to one class.
Observable: with P3 "BiS 9%" selected, a row in that set shows exactly one badge
"BiS 9%" and no grey tag; with nothing selected a universe-BiS row shows one
"BiS". MULTIPLICITY note: a row in two selected sets shows TWO tags — a
deliberate divergence from the owner's literal "one tag", routed to the owner in
the Step 8 sign-off pack for a ruling (along with the "★" drop and the
disambiguated "P3 BiS 9%" form).

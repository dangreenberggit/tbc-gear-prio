Status: resolved (not a defect — decision found and recorded)
Type: documentation (comment did not cite the decision behind it)
Origin: ticket 156 slice C session, 2026-08-16
(`.scratch/carry-forward/plans/ticket-156/handoff-2026-08-16.md` §8 item 1)
Blocks: none
Blocked by: none

# `candidateCap` slices the EP order — deliberate, per two accepted review points

Filed on the handoff's reading that the cap "slices in EP order while its
comment says screening order", implying the sim's own ranking was being
discarded at the step it exists to inform. **That reading is wrong**, and this
ticket is kept as the record so the next reader does not re-file it.

## What the code does

```ts
// packages/core/src/rank.ts (M2 racing branch)
const promotedOrdered = ordered.filter((e) => promotedIds.has(e.itemId));
const promotedCap = input.candidateCap ?? promotedOrdered.length;
simCandidates = promotedOrdered.filter(
  (e, i) => i < promotedCap || equippedIds.has(e.itemId)
);
```

`ordered` is the committed-EP order, so the cap keeps the first N by EP from
**within the promoted set**, plus every owned row.

## Why that is correct

`docs/plans/wowsims-tab/candidate-pool.md` §11's review table carries two
separately accepted points that together describe exactly this:

| Reviewer | Point | Disposition |
| --- | --- | --- |
| Dean · Q2 | "After M2, cap must apply after screening or it is M3 by another name" | **Accept** — "Cap applies to the promoted set post-M2" |
| Beck · Q1/Q2/Q3 | "keep committed EP ordering" | **Accept** — "Q2 note: ordering stays committed EP; Dean's cap-after-screening point is separate and accepted" |

Dean's requirement is about **which population** the cap draws from — the
promoted set, not the raw pool — and the code satisfies it. Beck's is about
**the order within that population**, and it says EP, explicitly noting the two
questions are separate. So screening decides *membership* (via promotion) and
EP decides *rank within the survivors*. Both accepted, both implemented.

§5.1.1 states the same division: "Ordering changes _when_ a row fills and what
a pre-M2 cap keeps; it changes no displayed number."

## What was actually wrong, and is now fixed

Only the disclosure. The tab's assumptions drawer told users M2/racing "was
not shipped" and that a cap is "an EP-order preselection, not a second,
cheaper ranking pass" — false on both counts, since racing is always on in the
browser. Fixed under ticket 209, whose note now says the pool is screened
first and the cap applies to the survivors.

The engine-side comment was accurate but did not cite Dean Q2 / Beck Q2, which
is what let this be re-read as a defect twice. Left as-is beyond that; the
citation now lives here.

## Open question this does *not* settle

Whether committed EP is the *best* order is a live design question, not a bug:
§5a's M1.5 recall data found above-cutoff rows as deep as **rank 114 of 246**
on ret under EP ordering, and a per-slot top-_j_ rule would have recalled
every one at _j_=10. That evidence is recorded as belonging to "whatever
design pass takes up M3", with the caveat that _j_=10 was fit on the same two
fixtures it was evaluated against. Not this ticket.

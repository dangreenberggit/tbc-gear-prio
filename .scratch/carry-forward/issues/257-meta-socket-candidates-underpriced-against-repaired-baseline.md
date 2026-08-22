Status: open
Type: bug (systematic scoring bias against meta-socketed candidates)
Origin: pre-merge domain axis on feat/stage-2-close-shortlist-box, 2026-08-21
Blocks: none
Blocked by: none

# Meta-socketed candidates are priced with an empty meta against a repaired baseline

## The finding

The `gems.meta-preference` substitution leaves meta sockets empty on **candidate**
items for feral. Meanwhile PLAN.md §9 repairs the **worn** item's meta to active
before the baseline sim. So a meta-socketed candidate is scored without its meta
gem against a baseline that has one — a systematic under-pricing of exactly the
items most likely to be upgrades.

The branch that surfaced this treated the substitution as bounded ("does not
touch this shortlist"). The domain axis disagrees: it is not a display caveat,
it is a scoring asymmetry.

## Why it matters, concretely

For feral it lands hardest on **head**, which is the slot carrying a
"no positive candidate" plausibility warning against Wolfshead Helm in
`.scratch/rank-reports/stage2-close-shredzepelin.json`. That warning is currently
attributed entirely to Wolfshead's unique effect. The empty-meta pricing is a
second contributor, and the stated cause is therefore **at best incomplete**.

Head is where meta gems live, so the slot with the bias and the slot with the
unexplained warning are the same slot. That is suggestive, not proven.

## Not established

- Whether correcting the pricing would actually surface a positive head
  candidate, or whether Wolfshead's effect dominates regardless. **Untested** —
  it needs a re-run with the meta filled on candidates.
- Whether other specs are affected. The substitution was read as feral-scoped;
  ret was not checked.

## Acceptance

- [ ] Decide whether candidates should carry a repaired meta, or the baseline
      should be priced without one — the two sides must match, either way.
- [ ] Re-run shredzepelin's feral p2 ranking and report whether the head warning
      survives.
- [ ] If the warning survives, update its stated cause to name both contributors.

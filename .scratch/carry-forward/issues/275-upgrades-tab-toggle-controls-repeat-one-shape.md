Status: closed
Type: refactor
Origin: docs/reviews/feat-finish-the-tab.md
Blocks: none
Blocked by: none
Closed: 2026-08-23, branch feat/upgrades-ui-pass

## Outcome

Folded, as part of the ticket-278 UI pass. One `ToggleControl` class owns
label, input and `setVisible`; the four checkbox controls use it, and the raid
filter — a `<select>`, not a toggle — borrows only the free
`setControlVisible` function and keeps its own populate logic. The two
near-duplicate visibility methods and `setPruneAvailable` are all gone,
replaced by one `refreshViewControlVisibility`. `isBisTagged` replaces the
four hand-written copies of the same tag test.

One behaviour deliberately changed. `setPruneAvailable` forced the prune
checkbox off whenever it hid the control, which threw away the user's choice.
Visibility now only shows and hides, and the safety that force-off provided is
provided instead at the single read site: `pruneEffective()` is
`visible && checked`. Verified on a served page in both directions — visible
and checked prunes the pool to 16 candidates, hidden and checked leaves all
240, with the assumptions drawer recording "every eligible item".

The BiS-only and set-potential reads were deliberately left ungated: they feed
the done-state view's sort key, and gating them would have moved the very
order the ticket-278 measurement was taken against.

# Upgrades tab toggle controls repeat the same field/label/visibility shape

`vendor/tbc-new-fork/ui/core/components/individual_sim_ui/upgrades_tab.tsx`
grew three checkbox controls in quick succession during finish-the-tab: the
set-bonus toggle (fork commit `44c73690b`), the post-sim BiS filter
(`9f327af9a`) and the pre-sim BiS prune (`70a38b51e`). Each was added the same
way, so the file now carries three copies of one shape.

## What repeats

- **Three field pairs**: `setPotentialToggle`/`setPotentialLabel`,
  `bisOnlyToggle`/`bisOnlyLabel`, `bisPruneToggle`/`bisPruneLabel`.
- **Three ref pairs** in `buildTabContent`, each declared, each assigned.
- **Two near-duplicate visibility methods**, `refreshSetPotentialVisibility`
  and `refreshBisOnlyVisibility`, differing only in which predicate decides
  availability and which label they toggle `d-none` on. The prune's equivalent,
  `setPruneAvailable`, is a third variant that also forces the box off while
  hidden.
- **The tag predicate `(bisTags?.length ?? 0) > 0` (or `.length > 0`) in four
  places**: `applyBisFilter`, `refreshBisOnlyVisibility`, `effectivePool`, and
  the availability check inside `refreshCandidatesPlaceholder`.

## Proposed shape

A small local helper rather than a framework:

```ts
type ToggleControl = {
  input: HTMLInputElement;
  label: HTMLElement;
  setAvailable(available: boolean): void;   // toggles d-none, unchecks when hidden
};
```

built once per control, plus a single `isBisTagged(entry)` predicate that the
four sites call. That removes the two duplicate refresh methods and makes the
"forced off while hidden" rule uniform — today only the prune has it, and the
other two rely on their data never disappearing.

## Why it is not urgent

All three controls work and are covered by the browser observations recorded in
`docs/verification-log.md` (2026-08-23). This is legibility, not behaviour.

## When to do it

Tranche 2, alongside the weighted set-bonus variant. That work replaces the
binary set-potential checkbox with a three-state control, which is exactly the
change this shape would otherwise be duplicated a fourth time to accommodate.
Doing the extraction first makes the weighted variant a smaller diff.

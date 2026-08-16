Status: resolved
Type: correctness (user-facing text states the opposite of what runs)
Origin: ticket 156 slice C session, 2026-08-16
(`.scratch/carry-forward/plans/ticket-156/handoff-2026-08-16.md` §8 item 3)
Blocks: none
Blocked by: none

# The Upgrades tab's assumptions drawer tells users racing was not shipped

`vendor/tbc-new-fork/ui/core/components/individual_sim_ui/upgrades_tab.tsx`,
in the candidate-cap branch of `assumptionsContent()`:

```tsx
{/* M2/racing was not shipped (candidate-pool.md §3.3 E-W5 no-go)
    — a cap below "all eligible" is an EP-order preselection, not
    a second, cheaper ranking pass. Said here in the reader's own
    words rather than left implicit in the number alone. */}
<dd className="col-sm-8">{i18n.t('upgrades_tab.assumptions.candidate_cap_note', { cap })}</dd>
```

Both halves are now wrong, and the second half is *rendered to the user*
through `candidate_cap_note`, not just left in a source comment.

**Racing is shipped and on by default in the browser.** The tab never sets
`fullPool`, `screenIterations`, `promoteTopK` or `promoteTopJ`, and
`rank.ts` reads `const racing = input.fullPool !== true`. So every browser run
screens the whole eligible pool at `DEFAULT_SCREEN_ITERATIONS` (1000) and then
full-sims only the promoted set. A cap therefore *is* applied after a second,
cheaper ranking pass — precisely what the note denies.

By contrast `cli.ts` hardcodes `fullPool: true`, so `pnpm rank` never screens.
Racing is browser-only, which is why this text went unchallenged for so long:
anyone checking against a CLI run would find the note accurate for that path.

## Why it matters

The drawer exists to tell a reader what the numbers in front of them assume.
A reader who takes this note at face value will believe the cap picked items by
EP alone with no sim involved, and will not think to ask why an item that
screened well is missing. It is disclosure that actively misleads.

The cap **does** slice the EP order within the promoted set, which ticket 208
establishes is deliberate (Beck Q2, "ordering stays committed EP") rather than
the defect it was first filed as. So the note's error is the mechanism, not
the ordering: it denied that any screening pass happens at all.

## Resolution (2026-08-16)

Both halves fixed in the fork.

- `candidate_cap_note` now reads "top {{cap}} of the candidates that survived
  screening — every eligible item is screened first, then the best are simmed
  in full", replacing "top {{cap}} by EP order — a preselection, not a
  ranking". This is the half users actually see.
- The source comment above it now states that racing is always on here (the
  tab never sets `fullPool`), that the CLI is the surface that never races,
  and that the EP ordering within the promoted set is ticket 208's subject
  rather than an endorsement.

## Acceptance criteria

- [x] The comment and the `candidate_cap_note` string both describe what runs:
      racing is on, the pool is screened at 1000 iterations, promotion happens,
      and the cap applies to the promoted set.
- [x] The note states which order the cap slices, consistent with ticket 208.
- [ ] Checked on a served build that the rendered text changed — this string is
      i18n, so editing the source comment alone changes nothing a user sees.
      **Left for the slice B run**, which rebuilds and serves anyway; the string
      change is verified in source and by `type-check` only.

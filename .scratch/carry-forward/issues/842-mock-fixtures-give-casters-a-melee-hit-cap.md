Status: open
Type: task
Origin: docs/reviews/feat-452-spec-page-scans.md (round 1, finding D2)
Serves: .scratch/carry-forward/issues/452-end-ret-feralcat-tunnel-vision-support-all-dps-specs.md
Blocks: none
Blocked by: none
Related: 452, 801

# Made-up fixtures give caster pages a melee hit cap

## What happens today

`packages/core/test/tab-fixtures/make-mock-fixtures.ts` writes the same
`ranking.caps` block into every fixture (lines 698-707 on
`feat/452-spec-page-scans` after `37a74160`; 650-660 at `e9f771ad`): a
melee hit cap with the talent Precision 3/3, a 15.77 rating
uncertainty, and an expertise cap. The caster fixtures `mock-balance`,
`mock-shadow`, `mock-elemental`, `mock-warlock` and `mock-long-names`
(mage) get it too. Casters have no Precision talent and no expertise,
and their hit cap is a spell hit cap.

Nothing on the page shows this block today. `hitCapBanner` in the
fork's `ui/features/upgrades/model/engine/disclosure.ts:68` has no
caller (`git -C vendor/tbc-new-fork grep -n hitCapBanner` lists only
its definition). If a later change shows the hit cap, a caster page
loaded from a made-up fixture would show a melee cap.

## Done when

Each fixture's `caps` block fits its spec (a spell hit cap with no
expertise for the caster fixtures), made by the generator and checked
by `pnpm tab-fixtures:check`; or the block is dropped from the fixtures
if the tab still reads no `caps` field.

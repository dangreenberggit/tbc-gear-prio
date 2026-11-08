Status: closed
Type: task
Origin: owner, 2026-11-06, answering session F's question about the false "hit rating could not be read" note on branch `feat/452-meta-repair-hit-cap`
Serves: .scratch/carry-forward/issues/452-end-ret-feralcat-tunnel-vision-support-all-dps-specs.md
Blocks: none
Blocked by: none
Related: 705, 535, 746

# A failed hit read makes the tab invent a note instead of showing the sim's error

## What happens today

When the tab cannot read the character's stats from the sim during a run,
three places carry on with a fallback and add a note of their own. Lines
are in the fork's `ui/features/upgrades/model/engine/rank.ts` at fork
commit `707e67f07` (branch `feat/452-meta-repair-hit-cap`, in session D's
worktree clone, not pushed):

- the read of the worn gear before the worn-gear repair (`:875-884`,
  ticket 705) and the baseline read (`:1115-1124`) call
  `hitCapReadFailed`, which repairs at full weight and shows "hit rating
  was treated as always useful, because your hit rating could not be
  read" with the error text (`hitRatingUnreadNote`, `:4386`);
- a set version's read (`:1212-1222`) uses the shared layout and shows
  `setBonusHitUnreadNote` (`:4400`).

Fork commit `707e67f07` already changed a fourth place, the per-candidate
read: its failure is now that candidate's failed sim, reported like any
other failed sim.

The owner, 2026-11-06: "i think maybe that note has been removed
somewhere in this plan since it seems like an existing wowsims error (i
dont know why we need to invent to new error, rather than just normally
bubbling up whatever error we got from existing sim code)".

## What to do

Decide, for each of the three places, how the sim's own error reaches the
player without an invented note: for example, the run fails with the
sim's error, as a failed candidate sim already reports it. This is a fork
change and needs a pair (`docs/agents/paired-worktrees.md`). Start after
`feat/452-meta-repair-hit-cap` merges.

## Done when

No stats-read failure in `rank.ts` adds a note of the tab's own wording;
each one shows the sim's error, and a test covers each place.

## Closing note (2026-11-08)

Fork commit `e1f0a16d8` on `fix/852-810`. All three reads now fail the run
the way a failed baseline sim does: the tab shows "Ranking failed:" and the
sim's own message (`RankError("sim-failed", ...)`, shown by
`describeRunError`). A read that Stop ended is handled as before.

- Worn-gear read: the run ends before any sim. Test `852-W`.
- Baseline read: the run ends after the baseline sim. Test `852-B`.
- Set-version read: the run ends at the first failed read. Reporting it
  as that version's failed sim was not chosen: of the places that read a
  version, only the package sim shows a failed sim's error; the same-gear
  gate shows "the sims that measure it failed." and the others show
  nothing (ticket 863). Tests `852-V` with the set screen on and off; the
  "off" case needed `measureSameGearBonus` to stop catching a rejection
  from `requestsFor`.

The two notes (`hitRatingUnreadNote`, `setBonusHitUnreadNote`), the helper
`hitCapReadFailed` and the no-cache flag `hitCapFailed` are gone; no
locale or schema file held them. The set-version catch also took an error
while rebuilding a version (a gem-repair error, for example) and showed it
as the hit-rating note; such an error now fails the run too, with its own
message. No test makes a rebuild fail.

Verified by: `node --version; pnpm exec vitest run packages/core/test/fork-meta-repair.test.ts packages/core/test/wowsims-fork-parity.test.ts packages/core/test/fork-run-progress.test.ts`
(104 passed), the four `852-` tests red before the fork change and green
after, and `node --version; pnpm verify` (rc 0; its fork tests check ran
818 tests at `tbc-new-fork@e1f0a16d8`).

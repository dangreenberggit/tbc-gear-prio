Status: closed
Type: task
Origin: docs/reviews/feat-tab-settings-persist.md
Blocks: none
Blocked by: none
Related: 466

# Saved tab settings keep the dev link's candidate cap, whose control is hidden

## What is wrong

Fork `56c87e6ed` saves the Upgrades tab's settings, candidateCap included
(`ui/features/upgrades/model/saved_settings.ts`, `FIELD_CHECKS.candidateCap`;
`saved_settings.test.ts` asserts a saved cap of 25 comes back). The cap
picker is hidden unless the page has `?upgrades-dev`
(`components/RunSettingsPanel/RunSettingsPanel.tsx:54-58`, "a cut of the
candidate list the user cannot see drops real upgrades (ticket 466)").
`toRunSettings` (`model/settings_reducer.ts`) passes the cap to every run
whatever the flag, and the eligible count shows the uncapped count.

Trigger: open the tab with `?upgrades-dev&cap=3`, change any setting, the
sort or a view toggle (each writes the whole entry), then reload without the
link. The cap is still 3, its control is hidden, and each run sims only the
top 3 candidates by EP. This also goes against `utils/dev_flags.ts`: "A stray
`cap` or `iterations` on a shared link must not change a run".

`DEV_FLAGS` is `{}` on a production build without `VITE_TBC_TAB_FIXTURES=1`
(`utils/dev_flags.ts`, last line), so the public site cannot set a cap. The
dev server (:5173, used for live verification and SME captures) and the gate
harness build can.

Found by three review axes at once: Adversarial A2, Domain D1, Spec SP3.

## Riders (same files, same fork commit)

- **S2:** the `SettingsSeed` doc comment in `model/upgrades_store.ts` still
  says "the dev link's iterations and cap, or the defaults"; the seed is now
  `{ iterations: DEFAULT_ITERATIONS }` and the link goes through
  `openSavedUpgradesStore`'s `link` argument.
- **S3:** `openSavedUpgradesStore`'s comment says "A run changes neither" about
  three things (settings, sort, view toggles).
- **S4:** the `FIELD_CHECKS` comment compares the per-field read to upstream's
  `ignoreUnknownFields` read (`ui/sim/state/persistence.ts:53`). That option
  skips unknown fields; whether a known field with a wrong type throws there
  is untested. Check it or reword the comparison.
- **S5:** three in-memory `Env['storage']` fakes: the exported `memoryStorage`
  in `testing/fake_tab_host.ts`, a local copy in `saved_settings.test.ts`, and
  an inline one in `hooks/useUpgradesStore.test.ts`. The tests can use the
  exported one.
- **S6:** the `data/wowsims-fork.lock.json` `_comment` re-run command reads
  `git diff --numstat --diff-filter=M 5262ff386bd1 HEAD`. Name the pinned fork
  commit instead of `HEAD`.
- **SP4:** in a real browser only the two view toggles were shown to survive a
  reload (`.scratch/tab-settings-persist/live-view-toggles.log`, gitignored;
  iterations read 3000 both times, which is `DEFAULT_ITERATIONS`). Every other
  field is shown only by unit tests.

## Done when

- A cap that the page cannot show is not restored: either `candidateCap` is
  not saved, or it is restored only on a page with `?upgrades-dev`. A test
  saves a cap, reopens the store without the dev link, and finds no cap.
- The riders S2 to S6 are fixed in the same fork commit and re-pin.
- A live reload check on the dev server changes a selected set, one excluded
  source, iterations and the sort, reloads, and records that each came back,
  with the log path in the lock `_comment`.

## Closing note (2026-10-09, feat/tab-settings-persist, review fix round)

Fork `b2f9293a2` ("Fix saved tab settings: cap, phase, export"), pinned by
this commit's `data/wowsims-fork.lock.json`.

The cap is not saved at all, rather than restored only on a page with
`?upgrades-dev`. `model/saved_settings.ts` drops `candidateCap` from the entry
it writes and does not read it back, so an entry written by fork `56c87e6ed`
that holds a cap restores none. The dev link still sets the cap for its own
load. Restoring it only with `?upgrades-dev` would make the model read the dev
flag, and the value would not survive anyway: every write on a plain page
rewrites the whole entry. The cost: a cap typed into the picker on a dev page
is gone after a reload unless the link names it.

Test: `saved_settings.test.ts` "restores no cap: a page without the dev link
runs uncapped whatever a dev page set" failed before the change ("expected 7
to be undefined") and passes after (`npx vitest run
ui/features/upgrades/model/saved_settings.test.ts` from the fork).

Riders: S2, the `SettingsSeed` comment now says the saved entry and the dev
link go over the seed. S3, "A run changes none of them". S4, the comparison
with upstream's `ignoreUnknownFields` read is dropped from the `FIELD_CHECKS`
comment, untested. S5, `saved_settings.test.ts` and `useUpgradesStore.test.ts`
use the exported `memoryStorage` from `testing/fake_tab_host.ts`, which now
takes initial entries and exposes them. S6, this branch's two lock `_comment`
re-run commands now name `56c87e6ed` and `c7f739d06`, and the new entry names
`b2f9293a2`; entries from earlier branches still say `HEAD`.

SP4: live reload check on :5173 (ret page). Selected sets, an excluded
source, iterations, prune, the column sort and the export choice came back
after a reload; a `?upgrades-dev&cap=3` cap did not come back without the
link. Log: `.scratch/tab-settings-persist/r2-live-reload.log` (gitignored).

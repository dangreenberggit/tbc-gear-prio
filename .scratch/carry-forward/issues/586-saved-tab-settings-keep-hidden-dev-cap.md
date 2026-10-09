Status: open
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

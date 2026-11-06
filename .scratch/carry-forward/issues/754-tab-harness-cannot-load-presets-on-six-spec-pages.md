Status: closed
Type: bug
Origin: docs/reviews/feat-p45-dps-pass-452.md (round 1, S3/P3)
Serves: .scratch/plans/upgrades-tab-finish-line.md, Chunk 3b (DPS spec list)
Blocks: none
Blocked by: none
Related: 452, 577

# The tab harness cannot load a gear preset on six spec pages, or pick a gear set whose name another spec uses

## What is wrong

`scripts/tab-harness/run-tab-cdp.mjs --preset-tab <tab> --preset <chip>`
loads a Gear Sets preset before the run. Two limits in its `loadPreset`
script stop it on DPS spec pages that epic 452 covers:

- **No phase tabs.** `loadPreset` waits for the
  `preset-group-phase-tabs` buttons and returns
  `{error:'no preset phase tabs after 30 s'}` when the page has none
  (`run-tab-cdp.mjs:518`), and `--preset` cannot be given without
  `--preset-tab` (`:111-112`). The balance, shadow, elemental, warlock,
  rogue and enhancement pages have no phase tabs, so the tracked harness
  cannot start any of them from a preset. The 2026-11-03 phase 4/5 pass ran
  those six specs from a patched copy that lives only in the gitignored run
  folder (`docs/live-runs/2026-11-03-p45-dps-pass.md` § Setup, "Harness").
- **Same-name gear sets.** The chip is found with
  `gearChips().find(c=>c.textContent.trim()===chipWant)` (`:546`), so when
  two specs on one page have a gear set with the same name, the harness
  always loads the first one. On the hunter and warrior pages that is Beast
  Mastery and Fury; Survival and Arms cannot be reached
  (`docs/live-runs/2026-11-03-p45-dps-pass.md` § Setup, "Start gear").

The desktop gate runs this harness (`scripts/check_desktop_tab.py:69`), on
the ret page only today. Whether a gate on another spec page would hit
either limit is a hypothesis, untested.

## Evidence

- Patched copy and its generator (gitignored, main checkout only):
  `.scratch/agent-reports/2026-11-03-p45-runs/run-tab-cdp-notab.mjs`,
  `patch-notab.py`.
- Re-check the first limit: run the tracked harness on `/tbc/druid/balance/`
  with `--preset-tab '?' --preset '?'` and read the error.

## Done when

The tracked harness can load a named gear preset on every DPS spec page
the fork serves, with or without phase tabs, and can load a gear set that
shares its name with another spec's set on the same page (for example by
naming the spec), shown by one run each on the balance page and on the
hunter page's Survival set.

## Comments

### Closed on fix/754-harness-presets, 2026-11-05

`--preset` no longer needs `--preset-tab` on a page with no phase tabs:
no phase tab is clicked and the chips the page shows are used. On a page
with phase tabs, `--preset` without `--preset-tab` stops the run and names
the tabs. `--preset-spec <spec>` takes the chip under that spec's label
(the `preset-group-label` text, such as `Survival`). A chip name found
under more than one spec stops the run with a message that names each
spec, where the old harness loaded the first one.

Verified by: the runs below, on commit `f06d9997` (the harness files clean
in `git status`), from the `.scratch/wt-754-harness` worktree. Each log
records the commit. Every command ran inside one shell call,
`.scratch/agent-reports/754-runs-r2/run-batch.sh`, that starts the dev
servers, runs the harness and stops the servers, because each sandboxed
Bash call has its own network namespace. The settings the runs needed:

- Servers from the `.scratch/wt-global-lane-split` checkout of `dev`,
  whose fork is at `b603564ee` (the lock's commit) with `dist/` built:
  `GOFLAGS=-buildvcs=false node scripts/dev-tab.mjs backend` and
  `TBC_TAB_TYPE_CHECKER=0 node scripts/dev-tab.mjs frontend`.
- Harness: `PLAYWRIGHT_BROWSERS_PATH=/home/daniel/Code/lulz/tbc-gear-prio/.scratch/agent-reports/2026-11-03-p45-runs/pwshim`.
  That folder is in the main checkout's `.scratch/`, gitignored
  (`.gitignore` line `.scratch/*`). Its
  `chromium-1200/chrome-linux64/chrome` is a symlink to
  `~/.cache/ms-playwright/chromium_headless_shell-1200/chrome-headless-shell-linux64/chrome-headless-shell`.
  Whether the harness finds a browser without it was not tested.

The two "Done when" runs, rc 0 each:
```
node scripts/tab-harness/run-tab-cdp.mjs --origin http://localhost:5173 --page /tbc/druid/balance/ --phase 4 --preset 'Phase 3' --out .scratch/agent-reports/754-runs-r2/balance-p4-phase3.json
node scripts/tab-harness/run-tab-cdp.mjs --origin http://localhost:5173 --page /tbc/hunter/dps/ --phase 4 --candidates 40 --preset-tab 'Phase 3' --preset-spec Survival --preset 'DW - 6% hit' --out .scratch/agent-reports/754-runs-r2/hunter-survival-p4-cap40.json
```

The balance page's own start gear is its `Phase 3` set
(`ui/specs/druid/balance/spec.ts:58` in the fork), so that run cannot
show that the click loaded anything. The same is true of the other five
pages with no phase tabs. So each of those six pages also has a run that
loads a set other than its start gear, `--phase 3 --candidates 10` with
`--preset 'Phase 2'` (balance, elemental), `'P2 Preset'` (shadow on
`/tbc/priest/dps/`, enhancement), `'P2 Swords'` (rogue) or `T5`
(warlock). Each run's `presetWorn` holds every item of that preset's gear
set file, for example `Nordrassil Headpiece` first for balance
(`gear_sets/p2_a.gear.json`). Shadow's bracers, item 24692 with a random
suffix, show as `Elementalist Bracelets of Shadow Wrath`. Warrior Arms ran with `--phase 4
--candidates 10 --preset-tab 'Phase 3' --preset-spec Arms --preset BIS`
and wore `p3_arms.gear.json` (`Onslaught Battle-Helm` first; the Fury set
of that name starts with `Cursed Vision of Sargeras`). The hunter run wore
`phase_3/sv/dw_6p.gear.json` (`Gronnstalker's Helmet` first; the Beast
Mastery set starts with `Cursed Vision of Sargeras`).

The same hunter call without `--preset-spec` stops with "Gear Sets chip DW
- 6% hit is found 2 times", and with `--preset-spec Survival` but no
`--preset-tab` it stops with "this page has phase tabs; name one with
--preset-tab".

The desktop gate's ret call (`scripts/check_desktop_tab.py`: `--phase 4
--candidates 40 --preset-tab 'Phase 3' --preset P3` on
`/tbc/paladin/retribution/`) gave `rows`, `aboveCutoffItems` and
`baselineDps` equal to `data/desktop-gate/golden-ret-p4-cap40.json`.

Output files, gitignored, in the `.scratch/wt-754-harness` worktree under
`.scratch/agent-reports/754-runs-r2/`: logs `errors-and-lists.harness.log`,
`loads.harness.log`, `loads-nondefault.harness.log`; one JSON per run;
the item checks `compare.out` and `compare-nondefault.out`.

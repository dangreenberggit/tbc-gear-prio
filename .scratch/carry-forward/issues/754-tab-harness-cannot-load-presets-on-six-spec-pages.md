Status: open
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

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

`--preset` no longer needs `--preset-tab`: without it no phase tab is
clicked and the chips the page shows are used. `--preset-spec <spec>` takes
the chip under that spec's label (the `preset-group-label` text, such as
`Survival`). A chip name found under more than one spec now stops the run
with a message that names each spec, where the old harness loaded the first
one. Both runs below used the dev servers (`node scripts/dev-tab.mjs
backend` and `frontend`) started from a `dev` checkout whose fork was at
`b603564ee`, the lock's commit.

Verified by: these two runs, from the branch's checkout, rc 0 each:
```
node scripts/tab-harness/run-tab-cdp.mjs --origin http://localhost:5173 --page /tbc/druid/balance/ --phase 4 --preset 'Phase 3' --out .scratch/agent-reports/754-runs/balance-p4-phase3.json
node scripts/tab-harness/run-tab-cdp.mjs --origin http://localhost:5173 --page /tbc/hunter/dps/ --phase 4 --candidates 40 --preset-tab 'Phase 3' --preset-spec Survival --preset 'DW - 6% hit' --out .scratch/agent-reports/754-runs/hunter-survival-p4-cap40.json
```

The output files are gitignored and exist only in the
`.scratch/wt-754-harness` worktree. The balance run loaded the `Phase 3`
chip on a page with no phase tabs: `presetWorn` starts with Thunderheart
Headguard, and `baselineDps` 2173.9 and 721 rows equal the 2026-11-03
patched-copy run (`docs/live-runs/2026-11-03-p45-dps-pass.md`). The hunter
run's `presetWorn` starts with Gronnstalker's Helmet (item 31003), the head
of `phase_3/sv/dw_6p.gear.json`; the Beast Mastery set of the same name has
Cursed Vision of Sargeras (32235). Its `baselineDps` is 3441, against 3530
for the Beast Mastery start on 2026-11-03. Without `--preset-spec` the same
call stops with "Gear Sets chip DW - 6% hit is found 2 times".

The ret call in `scripts/check_desktop_tab.py` keeps its flags. Run on the
same servers with `--page /tbc/paladin/retribution/ --phase 4 --candidates
40 --preset-tab 'Phase 3' --preset P3`, it gave `rows`, `aboveCutoffItems`
and `baselineDps` equal to `data/desktop-gate/golden-ret-p4-cap40.json`
(`.scratch/agent-reports/754-runs/ret-p4-p3-cap40.json`).

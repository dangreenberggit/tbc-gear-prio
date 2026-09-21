# Execution notes — upgrades-rowstyle (ticket 472)

## Step 0 baseline (preflight)

- main repo `C:/Users/dgree/Code/lulz/tbc-gear-prio` branch `feat/tab-signoff-followups`
  HEAD `a549c80f27484a743e2884a7d9c3f51da02eb723`, `git status --porcelain` empty.
- fork `vendor/tbc-new-fork` branch `feat/upgrades-tab` HEAD `aa9657e5a`,
  `git status --porcelain` empty.
- `data/wowsims-fork.lock.json:5 "commit": "aa9657e5afd6df3baae406f0f695c6502244046d"` — matches.
- C1 confirmed. C33 read: `run-tab-cdp.mjs` parses `tds[0..4]` positionally with a
  `tds.length < 5` guard, so the two action cells must be appended last, one `<td>` each.
- known-traps read: Node 22 PATH pin + `corepack pnpm`; Edit tool for fork text files;
  fork git standalone with `commit -F`; :5173 for live verify.

## Step 7 — a11y finding (flagged, not resolved here)

`captures/after-upgrades/a11y.json` reports six NEW serious `color-contrast`
nodes at both widths that the pre-change capture does not: epic-quality item
names (`#a335ee`) against the new zebra backgrounds, contrast 2.35-3.59.

- Pre-change (`captures/before-upgrades/a11y.json`): one node,
  `.btn-outline-danger`, the single accepted baseline entry.
- Cause: the row previously had no background, so the name had no measurable
  colour pair. The zebra supplies one and the site's quality purple fails
  against it.
- Not specific to this change: the Gear item list this design is copied from
  reports the identical failures with the identical numbers
  (`captures/after-gear-scss/a11y.json`: 13 `color-contrast` nodes, 3.21 and
  2.35, same `#a335ee`, plus 31 `image-alt` critical nodes on its icons). So it
  is inherited site-theme debt of exactly the kind the existing baseline entry
  records as `wontfix: inherited site theme`.
- Why it is not resolved here: Step 7's acceptance says no critical/serious
  violation outside the baseline, and Step 8's acceptance says the baseline file
  must be unchanged. Those cannot both hold. Choosing between them — accept as
  inherited debt (a baseline edit Step 8 forbids), file a follow-up ticket, or
  give up the 1.125rem name size — decides what Step 8 does, so it is a plan
  gate and goes to Gate C.
- A further obstacle to the baseline route: axe reports these per item
  (`span[title="Choker of Endless Nightmares"]`), so there is no stable
  `(ruleId, selector)` pair to add.

## Step 1 — Gear reference capture, 375 dropped

The harness dispatches clicks at viewport coordinates without scrolling. At 375
the Gear tab's nav button measures 0x0 (diagnostic: `gearTabActive` false,
`gearTabRect` all zeros, `.item-picker-icon` rect all zeros while 50 exist), so
the Gear tab never activates. The Gear entry is 1280-only; the plan's win
condition compares the two tables at 1280, and the Upgrades manifest keeps its
own 375 capture.

Status: closed
Type: task
Origin: docs/reviews/feat-tab-signoff-followups.md (round 6, 2026-09-22)
Blocks: none
Blocked by: none
Related: 473

# a11y baseline covers only epic-quality item names (hypothesis)

Finding S6. The 473 baseline entry is scoped to
`.upgrades-item-name.text-epic` only; rare/uncommon/legendary quality
colours on the zebra rows are not baselined. A run whose captured rows
include a rare-quality name may red the layout gate. Not measured.

## What would close this

Measure the other `text-*` quality classes' contrast on `#222328` /
`#18191e` / `#343a40`; baseline the failing ones with `match: css` and
this ticket, or wontfix with the measurement recorded.

## Comments

**2026-09-24 — closed (stage-gate upgrades-tab-closeout round 1).**
Rare-quality names are baselined; no other quality needs an entry. No
fork edit and no lock change. Main baseline commit
`8eb098d5756f6ce9c63bea348f5c63639bcca6eb` (the entry alone);
this close commit holds the ticket and review row S6. `pnpm verify`
rc=0 on `8eb098d57`. Layout gate on `8eb098d57`: skipped, source
unchanged (the baseline file is not in the gate's digest). The last
green real run is 482's re-pin `f14f33d7d`: `passed:53 failed:0
a11yFailed:0`.

Contrast (WCAG 2.x relative luminance; Python snippet from the round-1
plan, Step 3.1), quality colours from `ui/scss/shared/_variables.scss`
107-112, zebra rows `#222328` (odd) / `#18191e` (even) from
`_variables.scss` 196-197. `#323232` is the hover background
(`--bs-gray-800` override in `_bootstrap_style_overrides.scss`); the
`#343a40` in this ticket's text does not appear in the fork SCSS. axe
does not test hover, so the hover column is for the record only.

    uncommon  #1eff00  #222328:11.47  #18191e:12.84  #323232:9.38
    rare      #0070dd  #222328:3.26   #18191e:3.65   #323232:2.66
    epic      #a335ee  #222328:3.21   #18191e:3.59   #323232:2.63
    legendary #ff8000  #222328:6.23   #18191e:6.97   #323232:5.09
    junk      #9d9d9d  #222328:5.78   #18191e:6.47   #323232:4.73
    common    #ffffff  #222328:15.68  #18191e:17.55  #323232:12.82

Only rare and epic fall under 4.5:1 on the zebra rows; epic already has
its 473 entry. Legendary, junk, uncommon and common pass on both rows
and get no entry.

Large-text check: `.upgrades-item-name` computes to `font-size:
15.75px; font-weight: 400` on the live :5173 feralcat page (settled
run, 1280). WCAG large text needs ≥ 24px, or bold ≥ 18.66px, so the
4.5:1 threshold applies and a wontfix was not available.

Entry added after the `text-epic` one: `ruleId: color-contrast`,
`selector: .upgrades-item-name.text-rare`, `match: css`, `ticket:
480`. Its `reason` says the gate's mid-run ret capture may hold no rare
name. **A `WARN a11y stale-baseline color-contrast
.upgrades-item-name.text-rare (never fired this run -- remove it)` line
is therefore expected. Do not remove the entry for that reason.**

Proof 1, the direct fork test with the edited baseline (plan option
(a)), from `vendor/tbc-new-fork`, PowerShell:

    $env:TBC_A11Y_BASELINE='C:\Users\dgree\Code\lulz\tbc-gear-prio\data\wowsims-fork-a11y-baseline.json'
    $env:TBC_A11Y_DUMP='<round folder>\480-a11y-dump.json'
    npm run test:layout

rc=0, verdict `{"outcome":"measured","passed":53,"failed":0,"a11yFailed":0,"a11yWarned":29}`.
24 `WARN a11y baselined (css)` lines, all epic names from the 473
entry (six names × widths 375/653/768/1280, e.g. `[post-run 1280]
color-contrast span[title="Choker of Endless Nightmares"] (serious)`),
plus the expected `stale-baseline … text-rare (never fired this run)`.
The capture held no rare name, so this run alone proves only that the
entry breaks nothing.

Proof 2, the exported classifier called directly (Node 22, scratch
script importing `a11yClassify` from `test-tab-harness.mjs`, the real
baseline file's `entries`). Both synthetic violations are
`color-contrast`, `impact: 'serious'`, tags `['cat.color', 'wcag2aa',
'wcag143']`, target `span[title="Some Rare Item"]`:

    positive (class="upgrades-item-name text-rare"):
      {"fail":[],"warn":["WARN a11y baselined (css) [post-run 1280] color-contrast span[title=\"Some Rare Item\"] (serious)"],"matched":[2],"rareIdx":2}
    negative (class="text-rare" only):
      {"fail":["FAIL a11y [post-run 1280] color-contrast span[title=\"Some Rare Item\"] (serious) https://dequeuniversity.com/rules/axe/4.10/color-contrast"],"warn":[],"matched":[]}
    classifier check: ok

The positive case goes through the css-baseline path and matches entry
index 2 (the new entry). The negative control fails, so the match
depends on `upgrades-item-name` and a serious WCAG violation still
fails when it does not match.

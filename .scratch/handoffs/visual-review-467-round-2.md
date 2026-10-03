# Visual review — ticket 467, upgrades-tab-closeout round 2 (Step 7)

Seat: gate-visual. Input: `.scratch/stage-gate/upgrades-tab-closeout/round-2/`
(`manifest.json`, `index.json`, `feral-worn{0,1,2,3,4}.json`,
`ret-default.json`, 38 PNGs at width 1280). The capture directory is
gitignored, so this file carries every number the verdicts rest on.

- `forkHead`: `371da7dce972ea8bf6267daadf9f20627f7e58bb` (from `index.json`)
- `forkDirty`: `false` (from `index.json`)
- Captured with: a scratch CDP script against the live :5173 dev server with
  backend :3333, not `pnpm tab-review` (`index.json` `capturedWith`).

## Acceptance sentence judged (from `manifest.json`)

> For each captured set row, the OFF figure is the row's own simmed delta.
> When the tooltip shows no `not_counted` line, the ON figure equals the OFF
> figure plus the shown future-bonus lines minus the shown commit-break lines
> that are above the floor. When the tooltip shows a `not_counted` line, the
> ON figure equals the OFF figure. The tooltip is the same in both states.

Method: for every row with a set sub-line (`setLine` not null) in the `off`
and `on` row lists of each `<label>.json`, I computed ON − OFF and compared it
with the sum of the tooltip's `Npc (k/N)` lines minus the `breaks …` lines
that are commit breaks. A break is a single break (already inside OFF) when
the row's slot holds a worn piece of the broken set in `gearWorn`; otherwise
it is a commit break. "activates Npc (included in this number)" and "Full set
end state" are not added. Tolerance ±0.2. I also checked tooltip text equality
between states, that no row appears in only one state, and that every non-set
row has the same figure in both states.

## Per-capture verdicts

| Label | Verdict | Evidence |
|---|---|---|
| feral-worn0 | pass | `feral-worn0-tip-Thunderheart-{off,on}.png`: Thunderheart Chestguard 17.9 + 92.9 + 93.8 = 204.6, ON shows +204.6; tooltip identical. `feral-worn0.json`: all 15 set rows (Thunderheart, Malorne, Nordrassil) match ON = OFF + futures with no breaks (no set worn). |
| feral-worn1 | pass | `feral-worn1-tip-Thunderheart-{off,on}.png`: Pauldrons "activates 2pc (included in this number)", no future line, OFF = ON = +112.3. `feral-worn1.json`: the 4 Thunderheart rows have ON = OFF; the 10 Malorne/Nordrassil rows match ON = OFF + futures. |
| feral-worn2 | pass | `feral-worn2-tip-Thunderheart-{off,on}.png`: Chestguard 28.0 + 78.0 = 106.0. `feral-worn2-tip-Malorne-{off,on}.png`: Breastplate (chest; worn chest is Bloodsea Brigand's Vest, so the break is a commit break) 8.6 + 62.3 − 108.6 = −37.7. `feral-worn2-tip-Nordrassil-{off,on}.png`: Chestplate 15.1 − 108.6 = −93.5. `feral-worn2.json`: hands/legs rows (worn Thunderheart slots) treat the break as single (ON = OFF + futures only, e.g. Gauntlets of Malorne −140.8 → −78.5); head/shoulder/chest rows subtract it. All 15 set rows match. |
| feral-worn3 | pass | `feral-worn3-tip-Thunderheart-{off,on}.png`: Pauldrons "activates 4pc (included in this number)", OFF = ON = +79.9. `feral-worn3-tip-Malorne-{off,on}.png`: Mantle −15.9 + 63.5 + 69.5 − 115.3 = 1.8, ON shows +1.8. `feral-worn3-tip-Nordrassil-{off,on}.png`: Feral-Mantle −5.1 + 63.0 − 115.3 = −57.4. `feral-worn3.json`: all 12 set rows match; every Malorne/Nordrassil row subtracts the 2pc commit break (3 worn, so a single swap never breaks 2pc). |
| feral-worn4 | pass | `feral-worn4-tip-Malorne-{off,on}.png`: Mantle (shoulder slot holds worn Thunderheart Pauldrons, so "breaks 4pc −76.9" is a single break inside OFF, "breaks 2pc −103.0" is a commit break) −94.8 + 65.6 − 103.0 = −132.2. `feral-worn4-tip-Nordrassil-{off,on}.png`: −84.4 + 65.2 − 103.0 = −122.2. `feral-worn4.json`: head rows (head is Wolfshead Helm, not Thunderheart) subtract both breaks, e.g. Nordrassil Headdress −101.9 + 65.2 − 76.9 − 103.0 = −216.6; non-member rows that only single-break (Fel Leather Gloves, Primalstrike Vest, Vengeful Gladiator's pieces) have ON = OFF. All 15 set rows match. No Thunderheart tooltip exists at worn 4 (`feral-worn4.json` `errors`), as `index.json` states. |
| ret-default | pass | `ret-default-tip-Lightbringer-{off,on}.png`: −2.0 + 18.2 = 16.2, ON shows +16.1 (within ±0.2). `ret-default-tip-Justicar-{off,on}.png`: −37.0 + 17.4 = −19.6. `ret-default-tip-Crystalforge-{off,on}.png`: only "Full set end state", ON = OFF = −9.1. `ret-default.json`: all 15 set rows match. |

**Ticket 467, acceptance sentence: pass.** 86 set rows across the six
states satisfy ON = OFF + shown futures − shown commit breaks (±0.2);
tooltip text is identical OFF vs ON on every one; no row is present in only
one state; every non-set row has the same figure in both states (so the OFF
figure is unchanged by the toggle).

## Findings

| Finding | Severity | Evidence |
|---|---|---|
| The DPS cell's "hover for set detail" sub-line runs past the DPS column into the Source column and draws over the Source text. Worst where Source wraps to two lines: "Serpentshrine Cavern" and "hover for set detail" print on top of each other. Present in both states on every set row. This is not a failure of the 467 acceptance sentence (the figures are correct), but it is a text-over-text render defect on the element 467 relies on. No open ticket covers it (grep of `.scratch/carry-forward/issues` for the sub-line text finds only 471/472/477, none about overlap). Recommend filing it. | blocking (for the tab; not for 467's acceptance sentence) | `feral-worn1-table-on.png` rows 10 and 12; `feral-worn0-table-on.png` rows 12 and 14; `feral-worn2-tip-Malorne-on.png` ("Magtheridon's Lair" over "detail"); every `*-table-*.png` row with the sub-line |
| DPS figures with 5+ characters touch the Slot text with no gap ("Shoulder+112.3 DPS"). Crowding, no overlap. | advisory | `feral-worn1-table-off.png` row 1; `feral-worn0-table-off.png` row 8 ("Shoulder+10.5 DPS"); `feral-worn4-tip-Malorne-on.png` ("Shoulder-132.2 DPS") |
| The `not_counted` branch ("set bonus not counted") is not exercised: no captured row shows it, in either state. That clause of the sentence holds only vacuously; this round gives no visual evidence for it. | advisory | `setLine` is "hover for set detail" on all 86 set rows in the six `<label>.json` files |
| The manifest asks for a `.upgrades-baseline-summary` clip; none was captured as a PNG. The summary text is recorded instead. | advisory | `manifest.json` `capture`; `<label>.json` `summary` (e.g. `feral-worn2.json`: "Your current gear: 2603.6 DPS. Took 165s.") |

No `contested:` items. Every claim in `index.json` that I could check
(inline figures, tooltip text, the worn-1 "ON equals OFF", the worn-4 "no
Thunderheart tooltip") matches the row lists. The SME's do-not-trust verdict on
the ON view (commit breaks charged for a top package whose net is at or below
the floor, ticket 467 Comments 2026-09-24) is a domain finding; these captures
show the tab applies its rule consistently, which neither supports nor
contradicts that finding.

## a11y counts per state

Not captured. The scratch CDP script wrote no `a11y.json` (and no
`facts.json`); `pnpm tab-review` was not run for these gear states. No a11y
count can be reported for any of the 12 states (6 labels × OFF/ON).

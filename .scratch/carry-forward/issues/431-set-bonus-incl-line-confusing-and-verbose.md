Status: closed
Type: bug
Origin: owner screenshot review, 2026-09-18
Blocks: none
Blocked by: none
Related: 419 (added the "incl." total line), 313/330 (the set-bonus sub-lines)

# Set-potential DPS cell: the "incl." line is confusing, semi-repetitive, and too much text

Owner report from the Set-potential-ON screenshot. The 419 DPS cell now shows,
for a set-bonus row, a stack like:

    +77.9 DPS
    incl. 2pc bonus; base +3.7 DPS
    2pc bonus (0/2) (+74.1)
    4pc bonus (0/4) (+117.0)

Owner: "the set bonus info makes no sense. Some line was added with 'incl' that
seems semi-repetitive but also different and very confusing. It's also too much."

Two problems:
1. **The "incl. Npc bonus; base +X DPS" line is confusing** — it half-repeats the
   "Npc bonus (…)" line below it but says something subtly different (it names the
   base delta AND the threshold), and the relationship between the headline total,
   the "incl." line, and the per-threshold lines is not clear.
2. **Too much text in a table cell** — the stack of 3-4 lines per row is visually
   heavy. Owner: if the detailed breakdown is genuinely necessary, it should be
   "presented in a way that makes sense" and, given the volume, "might demand some
   sort of on-hover tooltip action" rather than always-on in the cell.

## What would close this

- The DPS cell for a set-bonus row shows the essential number clearly (the total
  the ranking used), without a confusing semi-duplicate "incl." line.
- The detailed breakdown (base delta, per-threshold 2pc/4pc contributions) is
  either (a) reduced to one clear line, or (b) moved behind an on-hover tooltip so
  the cell stays clean — owner's suggested direction is the tooltip if the detail
  must be kept.
- The presentation makes the base-vs-total-vs-per-threshold relationship legible
  at a glance, not a stack of near-repeats.
- Owner eyeballs a set-bonus row with Set potential on: clear headline, optional
  detail on hover, no confusion.

## Design question for the planner (do not guess)

419's acceptance was "show the total including the set bonus, matching the sort".
That is met and correct (verified live: total = base + bonus, sort agrees). This
ticket does NOT undo that — the TOTAL must still be the shown/sorted number. What
changes is the PRESENTATION of the supporting detail: which of {base delta, the
"incl." line, the per-threshold lines} stays in the cell, and what moves to a
tooltip. Decide the minimal clear cell + tooltip split; keep the total as the
headline. Coordinate with 330 (the per-threshold line wording, already
owner-approved) — do not silently re-reword what 330 settled; this is about
layout/volume, not re-litigating the threshold string.

## Where

`vendor/tbc-new-fork/ui/core/components/individual_sim_ui/upgrades_tab.tsx`
(`resultRow` DPS cell: the `.upgrades-set-total` "incl." line, `setBonusLine`,
`setPackageLine`), `_upgrades_tab.scss`, and any new tooltip attachment (tippy
idiom, as in 420). The `set_bonus.total` string in `translation.json`.

## Notes

New from the owner's screenshot review. The 419 TOTAL is correct and stays; this
is the presentation of the breakdown around it. Tooltip is the owner's suggested
direction for the heavy detail.

## Closed

Closed by fork commit eb83a1583 (tab-ui-refinements; re-pinned in main 23d35e94).
The cell/tooltip split (plan Q2): the DPS cell shows the ranked figure plus at
most ONE short `<small>` qualifier — "with {{threshold}}pc bonus" when set
potential folded a bonus into the shown figure, else "{{threshold}}pc bonus
possible" at the lowest reachable threshold (confounded/crossing keep their own
one line). The base delta and per-threshold breakdown move into a tippy tooltip
on the DPS `<td>`: "Base: {{base}}", 330's prospective/package lines verbatim,
and "Total with set bonus: {{total}} (the ranked figure)" when the total is
shown. The `<td>` gets tabindex=0 when a tooltip exists, so keyboard focus opens
it. The shown total stays exactly `deltaDps + rankableSetPotential` and the sort
key is untouched (ranking unchanged — desktop gate (h) matches golden). 330's
four strings are byte-identical; 419's `total` is reworded and
`available`/`tip_base`/`tip_total` are added, with the schema updated in the same
commit. Observable: a set-bonus row's DPS cell is <= 2 text lines, hover/focus
shows the breakdown, headline - Base = the prospective +dps. The layout gate's
one-line-cell assertion held at all four widths. Owner taste sign-off of the new
strings is in the Step 8 pack.

# SME rank judgment — ticket 443 (set-bonus sub-line wording)

## Verdict

`trust-with-caveats`

The recommended strings below are domain-honest and safe to ship. The caveat
is narrow: one Mode B candidate (iii) has a mild misread risk, and Mode C is
acceptable but is the widest string in the whole feature — noted, not blocking.

## What was judged

The candidate i18n template strings themselves (Mode A / B / C), as given in the
task prompt, against the TBC set-bonus mechanic and the measured width data. No
repo rows were read: the inputs to judge are text templates plus authoritative
rendered-width figures supplied with the task. The set-bonus mechanic (2pc/4pc
thresholds, bonus is a discrete effect that turns on when the piece count is
met) is **recalled game knowledge, unverified** — it is standard TBC/WoW set
behavior and none of it is in dispute for this wording call.

Input provenance: candidate strings and width table are quoted from the ticket
443 task brief; no command produced them.

## Findings

| # | Finding | Severity | Evidence |
|---|---------|----------|----------|
| 1 | "pc" for set pieces can be misread as "percent" by a player scanning fast, especially glued to a number. Risk is highest when "pc" sits directly against the DPS figure with no separator. | low | Recalled, unverified: "pc" = "piece" is the established WoW/TBC set-bonus shorthand (2pc/4pc); every candidate uses it, so it is the house convention, not a defect. Mode B (iii) "4pc bonus +193" is the one layout where the reader could parse "+193" as attached to "pc". |
| 2 | No candidate implies the bonus is already equipped or guaranteed. Mode B's "+{{dps}} from {{threshold}}pc" reads as "the sim measured +193 DPS from reaching 4pc" — a measured delta, not a promise. Domain-honesty requirement met by all of A, B, C. | none (pass) | The wording attributes the number to the set threshold, and the always-present tooltip carries the base/per-threshold/total breakdown, so the line is a cue, not a claim of certainty. |
| 3 | Mode A (i) "hover for {{threshold}}pc bonus" inverts the current phrasing (verb-first) but keeps the same game meaning; it is the only Mode A option at/under the current baseline width. (ii)/(iii) are ~+48px wider and would push the nowrap DPS column toward the 375px layout-gate limit. | med (width) | Given widths: A(i)=115.4px ≈ baseline 113.9px; A(ii)=163.5px, A(iii)=162.3px, both ~+48px over baseline. |
| 4 | Mode B all three are narrower than the current hover baseline, so none widens the column. Honesty is equal across them; the tie breaks on clarity and format consistency. | none (pass) | Given widths: B(i)=94.6px, B(ii)=95.0px, B(iii)=103.1px, all < 113.9px baseline. |
| 5 | Mode C "with {{threshold}}pc bonus (+{{dps}})" is domain-honest: it extends the existing set-potential total line with only the bonus part in parens, and the tooltip already carries the grand total. It is the widest string in the feature at 136.7px (+48.5px over its own "with 4pc bonus" baseline of 88.2px), but it appears only in the combined set-potential-on + inline-on case. | low (width) | Given width: C=136.7px vs baseline 88.2px. It is the sole candidate for its mode, so there is no narrower fitting option to prefer. |

## Chosen string per mode

**Mode A (hover-cue, toggle OFF): "hover for {{threshold}}pc bonus"** — (i).
Domain reason: says plainly that the detail is on hover without asserting the
bonus is active, and keeps the "pc" house convention. Narrowest fitting option:
yes — it is the only Mode A candidate that does not grow the column past the
current baseline (115.4px ≈ 113.9px); (ii) and (iii) are ~48px wider.

**Mode B (inline, toggle ON): "{{threshold}}pc: +{{dps}} DPS"** — (ii).
Domain reason: the colon and the explicit "DPS" unit make it unmistakable that
+193.0 is a measured DPS delta tied to reaching 4pc, not a percent and not a
guarantee — it directly defuses the pc/percent misread. Narrowest fitting
option: effectively yes — at 95.0px it is within 0.4px of the narrowest (B(i)
94.6px) and both are far under the baseline, so width is not the deciding factor;
the unit label is worth the negligible difference. (B(iii) is both wider and the
one with the mild misread risk, so it loses on both counts.)

**Mode C (inline + set-potential on): "with {{threshold}}pc bonus (+{{dps}})"** —
fixed, confirmed domain-honest. Domain reason: it adds only the bonus figure in
parens to the existing total line, and the parenthetical reads as "the sim's
bonus contribution," not a second guaranteed total — the tooltip still owns the
grand total. Narrowest fitting option: it is the only candidate for this mode;
flag that at 136.7px it is the feature's widest string and the one most likely
to press the 375px nowrap layout gate, so it is the string to watch in the gate
run.

## Confidence caveats

- The set-bonus mechanic facts are recalled, unverified standard TBC behavior;
  they are not contested by anything in the task.
- Width figures are taken as authoritative (measured, per the task). I did not
  re-measure. The width-based recommendations (prefer A(i); watch C) stand or
  fall on those figures.
- Live switching could not be demonstrated this session because the default
  Feral P3 run only produced "confounded" set-bonus rows, which use a different
  early-return string outside this toggle. This judgment is on candidate text +
  honesty + width only, not on observed rendering.

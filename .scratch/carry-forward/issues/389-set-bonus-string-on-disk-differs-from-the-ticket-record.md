Status: open
Origin: closing ticket 388 during the `feat/tab-scope-truth` review follow-up
Blocks: none

# The shipped set-bonus string is not the one ticket 330 records

Ticket 330 records the approved reword as:

```
toward {{set}} {{threshold}}pc (+{{dps}})
```

The string in `vendor/tbc-new-fork/assets/locales/en/translation.json:893` is:

```
{{threshold}}pc bonus ({{worn}}/{{threshold}}) (+{{dps}})
```

Two independent passes have now found this — a verification pass on the
finish-line plan, and the ticket-388 investigation. Neither was looking for it.

## Why it matters, and why it is not urgent

It does **not** break label/number agreement. One `nextThreshold` still fills
both template slots, so the figure always belongs to the threshold named (see
ticket 388's Resolution for the trace).

What it does break is the record. The owner is being asked to sign off on
ticket 330 while the ticket quotes a string the product does not use. The
shipped wording also drops `{{set}}`, so the set is unnamed, and replaces the
"toward" framing — which signals *not yet arrived* — with a piece-count
parenthetical that reads as progress toward a bonus the swap may not earn. That
framing was the whole point of 330's reword.

Separately worth a look: `package_disclosure` at
`assets/locales/en/translation.json:896` was reported byte-identical to
`prospective`, which would make ticket 336's disclosure line indistinguishable
from a row's own bonus line. Confirm or refute before acting.

## What to do

1. Establish which string the owner actually approved — 330's quoted text, or
   what shipped.
2. Either update the shipped string to match the record, or update the record
   and re-present it for sign-off. Do not close 330 against a string nobody
   agreed to.
3. Check whether `package_disclosure` duplicates `prospective`.

## Acceptance

- [ ] 330's recorded string and the string in `translation.json` agree
- [ ] The owner has seen the string they are signing off on
- [ ] `package_disclosure` confirmed distinct from `prospective`, or filed

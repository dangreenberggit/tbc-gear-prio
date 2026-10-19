Status: open
Type: bug
Origin: Linux-vs-Windows sim comparison of 2026-10-18 (WSL move, feat/wsl-linux-support fix pass)
Blocks: none
Blocked by: none

# The CLI ranking can print tied items with their rank labels out of order

This is about the old CLI ranking (`pnpm rank`, `packages/core/src/cli.ts`),
not the Upgrades tab.

## What happens

`pnpm rank --offline --region US --realm dreamscythe --character slamaltman --spec ret`
ranks two weapons at the same Δ15.41 (0.77%): Vengeful Gladiator's
Bonegrinder and Vengeful Gladiator's Greatsword. The command ran three times,
and Bonegrinder was printed on the line above Greatsword each time. The rank
labels on those two lines differed:

| Run                    | Line above                  | Line below                  |
| ---------------------- | --------------------------- | --------------------------- |
| Windows, first run     | `#17 ... Bonegrinder`       | `#16 ... Greatsword`        |
| Windows, second run    | `#16 ... Bonegrinder`       | `#17 ... Greatsword`        |
| Linux (WSL Ubuntu)     | `#16 ... Bonegrinder`       | `#17 ... Greatsword`        |

So in the first Windows run the printed labels were not in order (`#17`
above `#16`), and on one platform the labels on a tie changed from one run
to the next. Every other line of the ranking was the same in all three runs:
`diff` of the saved ranking bodies (`rank-win.body`, `rank-win2.body`,
`rank-linux.body`) shows only these two lines.

The Windows runs used the Windows checkout at `tbc-gear-prio@0c0c7a56`
(`dev`). The Linux run used the WSL clone on `feat/wsl-linux-support`, which
changes no file under `packages/` (`git diff --name-only dev...feat/wsl-linux-support`).

Source: the outputs `rank-win.txt`, `rank-win2.txt` and `rank-linux.txt`
(line 860-861 in each) in the session scratchpad
`C:\Users\dgree\AppData\Local\Temp\claude\C--Users-dgree-Code-lulz-tbc-gear-prio\f919225e-4fe9-44a2-bc80-2277a12fd90a\scratchpad\sim-compare\`.
That folder is temporary; rerun the command above to see the rows again.

## Cause

Hypothesis, untested: the labels come from one ordering and the printed rows
from another, and on a tie the label order follows the order in which the
concurrent sims finish. Start by finding where the CLI report assigns `#N`
and where it sorts the rows it prints, and whether both use the same
tie-break.

## Done when

Running the command above several times prints the tied rows with labels in
increasing order every time, in the same order on every run.

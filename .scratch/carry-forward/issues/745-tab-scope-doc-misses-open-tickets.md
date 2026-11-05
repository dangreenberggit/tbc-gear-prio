Status: open
Type: task
Origin: branch fix/wrong-advice-text (2026-11-02), the Maintenance loops of docs/upgrades-tab-scope.md
Serves: .scratch/plans/upgrades-tab-finish-line.md
Blocks: none
Blocked by: none

# The tab scope doc has no row for 17 open tickets

`docs/upgrades-tab-scope.md` § Maintenance says both of its loops must print
nothing. On `dev` `b24a4228` the first loop prints `MISSING` for 714, 715,
718, 719, 725, 726, 731, 732, 734, 735, 736, 737, 738, 739, 740, 741 and 743:
each is open and has no row. This ticket, 745, has no row either. (The second loop also printed `STALE 644` and
`STALE 655`; branch `fix/wrong-advice-text` removes those two rows.)

Several of the 17 are agent-tooling tickets, so the fix may be a row in an
Out-of-scope table or a change to the loop that skips tooling tickets;
which one is a judgment for whoever takes this (hypothesis, untested).

Run the two loops from the repo root as the doc gives them.

Done when: both loops print nothing on `dev`.

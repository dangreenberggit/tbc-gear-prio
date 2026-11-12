Status: closed
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

## Closing note (2026-11-12, branch `docs/745-scope-doc`)

On `dev` `009532cc` the first loop printed MISSING for 49 ids (714–866,
745 included) and the second printed `STALE 452 (closed)` and
`STALE 858 (closed)`. The branch removes the 452 and 858 rows, adds ten
Tab-adjacent rows (736–739, 747, 753, 811, 840, 843, 866) and 39
Out-of-scope rows for the agent-tooling tickets, and records why in
`docs/upgrades-tab-scope.md` § Judgment calls, item 13. Tooling tickets
get rows, not a loop change, because the Categories rule already puts
tooling/process under Out-of-scope. No review was run: the owner said on
2026-11-12 "sure do 745, then merge (i wouldnt really check anything on
that task)".

Verified by: both loops of `docs/upgrades-tab-scope.md` § Maintenance,
run from the repo root, print nothing on this branch:

```
corepack pnpm -s issues:open | grep -o 'issues/[0-9]*' | cut -d/ -f2 | sort -u > .scratch/open-ids.txt
for n in $(cat .scratch/open-ids.txt); do grep -q "^| $n " docs/upgrades-tab-scope.md || echo MISSING $n; done
for n in $(grep -o '^| [0-9]* ' docs/upgrades-tab-scope.md | grep -o '[0-9]*' | sort -u); do grep -qx $n .scratch/open-ids.txt || echo "STALE $n ($(grep -m1 -o '^Status: *[a-z]*' .scratch/carry-forward/issues/$n-*.md | awk '{print $2}'))"; done
```

Status: open
Type: task
Origin: pre-merge review of feat/tab-item-lists (docs/reviews/feat-tab-item-lists.md, finding A1), 2026-10-16
Blocks: none
Blocked by: none
Related: 610, 671, 672

# The completeness gate does not check entries a list should not hold

`scripts/check_pool_completeness.py` fails when an expected item is absent,
when a hard-policy item is present, and when an arena, token or Sunmote
item has the wrong source (`:427-455`). Ticket 610 asked for exactly that.
It does not check anything else about an entry that is present. The
review's adversarial axis planted these into scratch copies of the lists
(`--universes-dir`), and the gate exited 0 for each:

- 34241 Cloak of Unforgivable Sin (Sunwell) added to ret-p2 (classed
  P-later-phase, a soft policy where "present is allowed");
- 31056, a mage T6 piece, added to ret-p3;
- a duplicated entry;
- 32323, a raid drop, relabelled `{kind: unknown}`. With that source the
  player's Sources filter cannot remove it.

None of these is in today's lists: the same axis rebuilt all 44 lists
from committed sources at 3b9bb690 and every one matched byte for byte.
The gate is the only check that reads the lists from data alone, so a
builder bug of these kinds would reach the tab with no failure.

Done when: the gate fails on each of the four planted cases above (red
runs recorded in the closing note), or the closing note says which of
them the owner rules out of scope; `pnpm verify` rc 0.

## Comments

2026-10-18 (stage tab-wowsims-items): since ADR-0038 the tab reads none
of the lists this gate checks; it builds its pool from wowsims' item
database. The gate still guards this repo's universes, which feed the CLI.

2026-10-24: `Serves:` line removed — since ADR-0038 this gate guards only
the CLI's item lists (note of 2026-10-18 above); no plan covers the CLI;
ticket 173 is the precedent.

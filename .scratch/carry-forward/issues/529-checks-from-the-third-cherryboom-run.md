Status: open
Type: check (verify in a real browser; most items are probably not bugs)
Origin: test agent report, 2026-09-30, third Cherryboom enhancement ranking in the Browser pane; owner asked for them to be filed as checks
Blocks: none
Blocked by: none
Related: 525, 526, 528

# Checks from the third Cherryboom run

A test agent ran the Upgrades (New) tab three times for Cherryboom
(Enhancement shaman, Draenei, P3, gear pinned from WCL report
GrY2Wn7Bjcg81yNq) on 2026-09-30 and reported five oddities. None is a
confirmed defect. The runs happened in an automated Browser pane tab that
was sometimes hidden and sometimes 529 px wide, which can explain most of
them. Each item below says what was seen, the cheap check, and what result
would make it a real ticket.

## The owner's words

2026-09-30, verbatim:

> you can flag those things as checks. most were probably the way claude runs in the tab and wasnt in the foreground

## Sources

"Seen" text is the test agent's own report, not re-measured here, except
where a line says "read on 2026-09-30". Those reads were page-console
queries on `http://localhost:5173/tbc/shaman/enhancement/` with the third
run's settled table on screen ("Your current gear: 2244.0 DPS. Took
1225s."), with no setting changed and no sim started.

Line numbers are in `vendor/tbc-new-fork` at fork commit
`02d0ea2ad1dae34087a6d69d316f9c3879bd8247`, the `commit` in
`data/wowsims-fork.lock.json` on 2026-09-30. Read them with
`git -C vendor/tbc-new-fork show 02d0ea2a:<path> | sed -n <from>,<to>p`.
`upgrades_tab.tsx` is `ui/core/components/individual_sim_ui/upgrades_tab.tsx`;
`rank.ts` and `se.ts` are under
`ui/core/components/individual_sim_ui/upgrades/engine/`.

## 1. The third run was much slower

**Seen.** 1225 s, against 809 s and 708 s for two earlier runs with the
same inputs. During the third run the page's main thread froze for about
2 s at a time while the table updated. Pace fell from about 1.4 to about
0.4 candidates per second after about 700 rows. The backend used about 3.9
of 20 logical cores (`__tbc_new_wasmconcurrency` was 4). The pane was
visible for the third run and hidden for the first two.

**What the code shows.** Every landed row calls `this.render()`
(`upgrades_tab.tsx:1838-1839`). The mid-run table copies, sorts and
rebuilds every landed row on each render (`landedRowsTable`,
`upgrades_tab.tsx:2790-2821`). So the work per landed row grows with the
number of rows already landed. That fits the slowdown after about 700
rows. That it costs more with the pane visible than hidden is the test
agent's hypothesis (untested).

**Cheap check.** In a normal foreground browser, run the same ranking
twice: once with the tab in view, once with it in a background tab. Time
both from the status line's "Took Ns". Repeat runs can read cached sims
(`rank.ts:1200-1213`), so compare runs with the same cache state, for
example by clearing the tab's store before each run (how to clear it is
not checked; see ticket 526).

**Real ticket if** the in-view run is clearly slower than the background
run, or the main thread freezes for a second or more at a time in a
foreground browser. The fix would then be in how the mid-run table
renders, not in the sim.

## 2. "Rows landed" stalled at 956, then 942 rows settled

**Seen.** The status line stayed at "956 rows landed" while the sim count
went from 971 to 989 of 994. The settled table then held 942 rows.

**Explained from the code and the page. Not an issue.**

- **The stall.** The run's 994 sims are 1 baseline + 957 candidates + 36
  replica sims (`rank.ts:1355-1359`). The 36 are paired replication: 4
  extra seeds × (1 baseline + the top 8 rows) (`replicateTopItems`,
  `rank.ts:1635-1686`; `PAIRED_REPLICATE_TOP_N = 8` at `se.ts:6`). They
  re-sim rows that already landed, so they add to the sim count and emit
  no row event. Row events come only from the candidate loop
  (`rank.ts:1344`). So after sim 958 the row count stops by design.
  Read on 2026-09-30: the page's assumptions console line says "seeds: 11,
  22, 33, 44, 55" and "pool source: enh-p3.universe.json (957 entries)".
- **957 candidates, 956 rows.** One candidate produced no row. Read on
  2026-09-30, a console warning: "candidate 30090 (mainhand): World
  Breaker was dropped from the ranking: the sim failed on this swap — sim
  error (0): Tried to add a new item swap callback for slots in a
  finalized environment!", with a Go stack through
  `sim/common/tbc/items_weapons.go:190` and `sim/core/item_swaps.go:136`.
  A failed sim skips the candidate (`rank.ts:1216-1225`, then
  `if (!best) return` at `rank.ts:1266`). The skip is by design. The
  panic itself is a possible sim defect: split it out as its own ticket
  (see "What would close this"). Split out as ticket 531, fixed at fork
  2b0fece2f.
- **956 landed, 942 settled.** The settled table drops worn items from the
  below-the-cutoff group (`upgrades_tab.tsx:2864`, reasons in the comment
  above it). Read on 2026-09-30: 14 of Cherryboom's 17 worn item ids are
  entries in `enh-p3.universe.json`, and none of the 17 ids is among the
  942 rendered shopping-list rows (25 in the main table, 917 in the fold).
  956 − 14 = 942.

## 3. Import dropdown toggled on alternate clicks at 529 px

**Seen.** At a pane width of 529 px, the Import dropdown seemed to open
and close on alternate clicks.

**Cheap check.** In a foreground browser at desktop width (1280 px or
more), click Import five times and note whether each click toggles it
once. Repeat at about 530 px wide with a real mouse.

**Real ticket if** it misbehaves in a foreground browser at either width.
If it misbehaves only under automated clicks in the Browser pane, mark it
not an issue.

## 4. DPS figures pushed off screen mid-run at 529 px

**Seen.** The "removes worn …" note pushed the DPS numbers off screen
while the run was going.

**Split out already:** ticket 525. Nothing to check here.

## 5. The dev servers were stopped between turns

**Seen.** The vite server on :5173 and the backend on :3333 had stopped
between the test agent's turns. The desktop app stopped them.

**Not an issue: an environment fact, not a repo defect.** An agent that
drives the tab should check that both ports answer before it starts a
run.

## What would close this

Each of items 1 to 5 is marked "explained / not an issue" in this file,
or split out as its own ticket with a link here. Items 2, 4 and 5 are
marked already. The World Breaker sim panic in item 2 is ticket 531.

Status: open
Type: task
Origin: docs/fork-tab-native-bulk-sim-finding.md (investigation 2026-08-31)
Blocks: none
Blocked by: none

# Can we still show set bonuses if we route through the tournament?

Group: `.scratch/upgrades-tab-sim-followups/README.md`

## What

The tab shows **set-bonus math** — how much a set piece is worth given the 2pc/4pc
bonus it helps complete. Our current flat pass supports this because it keeps
every candidate's individual delta-vs-baseline and does cross-item synergy math
(`upgrades/engine/rank.ts` `buildSetBonuses`, `set-value.ts`).

wowsims' native bulk sim (the tournament) handles set bonuses **within** a single
candidate correctly — each candidate is a full gear set, so any active 2pc/4pc in
that set is simmed. What it does **not** do is reason **across** candidates. So if
we ever route a mode through the tournament (ticket 340), the question is whether
the tab's set-bonus presentation can still be produced — maybe by combining two
measurements somehow.

This is the tricky one. It gates how far ticket 340 can go, and it may turn out
that set bonuses have to stay on our own pass even if plain per-item gains move to
the tournament.

## The question to answer

- What exactly does the tab's set-bonus feature need as input? (Per-piece
  individual delta? A "this set with N pieces" measurement? Both?)
- Can that be assembled from tournament outputs — e.g. by running the tournament
  once for the plain swaps and once (or with specific candidates) for the set
  configurations, then combining? Is there a clean way, or does the cross-item
  nature make it intractable through a per-candidate tournament?
- Honest verdict: (a) set bonuses work through the tournament with a specific
  combining scheme, (b) set bonuses must stay on our flat pass while plain gains
  can use the tournament, or (c) it is not worth splitting — keep set-bonus modes
  entirely on our pass.

## Approach

- Read our set-bonus math to state its exact input needs
  (`upgrades/engine/rank.ts`, `set-value.ts`, `set-bonus.ts`).
- Reason about whether tournament outputs (per-candidate DPS + baseline) can be
  combined to produce it. Prototype only if the reasoning is promising.
- Fork code only for any prototype.

## Acceptance

- [ ] The set-bonus feature's exact input requirement written down.
- [ ] A verdict (a/b/c above) with reasoning, feeding ticket 340's design.

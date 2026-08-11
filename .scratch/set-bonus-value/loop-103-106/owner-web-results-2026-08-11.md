# Owner's wowsims web results — 2026-08-11

Raw results from the owner running the simming protocol
(`.scratch/set-bonus-value/owner-simming-instructions-2026-08-11.md`) on the
wowsims TBC web UI. Settings in every run are identical to
`owner-settings-export-v2.json` (verified by the owner pasting full exports;
only `player.equipment.items` differs per run, recorded below).

## Step 0 — environment

- Web version string: "tbc new" and "alpha", **no version number visible**.
  Date of runs: 2026-08-11.

## Step 1 — baseline (owner's current gear, = v2 export equipment)

- **2245.60 DPS (±73), 12500 iterations.**

## Step 2 — four-piece Thunderheart package

Equipment changes vs baseline (all else identical):

```json
[
  {"id":8345,"enchant":3003},
  {"id":278827},
  {"id":31048,"enchant":2986,"gems":[24028,24028]},
  {"id":278819,"enchant":368},
  {"id":31042,"enchant":2661,"gems":[24028,24028,24028]},
  {"id":29966,"enchant":2647,"gems":[24028]},
  {"id":31034,"enchant":2564,"gems":[0]},
  {"id":29247},
  {"id":31044,"enchant":3012,"gems":[24028]},
  {"id":28545,"enchant":2939,"gems":[24028,24058]},
  {"id":30834,"enchant":2929},
  {"id":30052,"enchant":2929},
  {"id":28034},
  {"id":29383},
  {"id":28658,"enchant":2670},
  {},
  {"id":29390}
]
```

- **2343.77 DPS (±75), 12500 iterations → package delta +98.17 (+4.37%).**
- **The gloves socket is EMPTY in the web's own export: `"gems":[0]` on
  31034.** The UI left the migrated-in socket unfilled — direct confirmation
  of ticket 111's premise from the authoritative source.
- Owner on 2b/2c (suggest gems): "no need to suggest gems because in this
  case the gems are the same. they are all red gems. there is no meta gem to
  activate" — so this run is the no-regem arm by construction; the
  suggested-gems arm was not run because it would change nothing except
  filling the one empty socket.

## Step 3 — helm A/B (baseline gear, 25000 iterations)

Procedure note from the owner, **noteworthy**: after equipping Cursed
Vision, the meta gem had to be placed MANUALLY — "suggest gems" did not
place it. Suggest gems was then used, which also swapped some body gems to
24067 (boots 24028→24067, belt 24058→24067). Both helm arms carry identical
gems: `[32409, 24028]` (Relentless Earthstorm meta + Delicate Living Ruby;
activating the helm socket bonus is a DPS loss for both helms). Both arms
share the same modified body gems, so the A−B difference is helm-only.

- **3a Cursed Vision of Sargeras (32235): 2101.65 DPS (±78).**
- **3b Vengeful Gladiator's Dragonhide Helm (33672): 2090.96 DPS (±77).**
- **Cursed Vision ahead by +10.69** — owner's original ~+10 confirmed;
  engine's +8.61 compatible in ordering and close in magnitude (the engine
  arms did not carry the 24067 body-gem changes).

## Step 4 — Ahune items

Owner confirms via wowhead (matching wowsims and in-game tooltips), proper
item level:

- 278827 Amulet of Bitter Hatred —
  https://www.wowhead.com/tbc/item=278827/amulet-of-bitter-hatred
- 278819 The Frost Lord's War Cloak —
  https://www.wowhead.com/tbc/item=278819/the-frost-lords-war-cloak

These are legitimate TBC ids; ticket 108's closed-invalid disposition
stands, now with external citations.

## Owner decisions recorded in this session

- **Ticket 111 rarity policy: cap auto-fill at RARE for testing**, with a
  note to open it up later (eventually an option like wowsims' own rarity /
  phase dropdowns, especially if we integrate with wowsims directly). The
  principle: the user must know which gems were used, and it must be
  consistent. A user with epic gems equipped keeps their epic gems (that is
  what migrate does); auto-fill assumes rare availability.

## Open comparisons after this data (for the analysis pass)

- Engine PKG_UIMIGRATE (+102.99, empty socket, 3000x5) vs owner +98.17
  (12500): gap ~4.8 DPS. Engine gem-filled figure +113.42 is ruled out as
  the honest comparison by the owner's empty-socket export.
- Engine baseline on v2 gear 2219.82 vs owner web baseline 2245.60: ~26 DPS
  absolute gap, unattributed (candidates: web build differences vs pinned
  v0.0.101, Ahune item stat resolution, iteration count). Absolute-level
  gap does not affect deltas if constant across arms, but should be named.
- Suggest-gems behavioral facts for ticket 111's step-2 model: does NOT
  place meta gems; DOES change existing body gems (24028/24058 → 24067 in
  some slots), i.e. the web button is closer to a re-gem than a fill-only.
  The owner's chosen consistency principle (keep gems the same) is
  therefore a deliberate simplification, not a mirror of the button.

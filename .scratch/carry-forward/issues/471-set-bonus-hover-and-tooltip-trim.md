Status: closed
Type: task
Origin: owner walkthrough, Upgrades-tab UI pass, 2026-09-20
Blocks: none
Blocked by: none

# Set-bonus hover always-on and tooltip trim

Two fixes to `setBonusPresentation`, combined per the owner because both edit
the same function:

- Hover was gated on the Set-potential toggle, so a prospective-only row got no
  hover when the toggle was off, even though the engine computes `setContext`
  unconditionally. Fixed by taking the future/commit terms from the context
  regardless of the toggle; the toggle stays ranking-only (no engine edit, no
  PROVENANCE cycle needed).
- Tooltip trim: dropped the "Set credit" mode line, the full/split totals, and
  "(ranked)"; changed "completing breaks…" to "breaks…"; dropped "DPS" from
  the tooltip figures only (a tooltip-local `tipDelta`, results column
  untouched); changed "N more (share…)" to "{pc} ({have}/{pc})" where
  have = threshold − piecesNeeded (verified against `rank.ts:2255`); changed
  "hover for detail" to "hover for set detail".

Verified live on `:5173` via a real WASM run: 30 hover hints with the toggle
OFF, including prospective rows, and tooltip text matching every trim (proof
captured in `scratchpad/out4/live-proof-toggle-off.json`).

Fork commit `aa9657e5`. Main-repo pin commit `74bb9910`. `pnpm verify` green.

## Comments

2026-09-21: filed retroactively; number was used in the re-pin commit before the file existed.

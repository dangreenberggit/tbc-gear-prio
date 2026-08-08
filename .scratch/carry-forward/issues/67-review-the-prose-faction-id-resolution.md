Status: open
Type: review
Origin: ticket 66 grew past its own scope; the user asked for the wider change
  to get its own review rather than blocking 66 on it.
Blocks: none
Branch: feat/phase-3-vendor-and-craft-coverage (do before merging)
Blocked by: none
Relates to: 66 (landed the change), 58 (only AtlasLoot instance tables were
  vendored — this vendors a second module), 65 (established the id space)

# Review the prose→faction-id resolution landed by ticket 66

**Do before merging `feat/phase-3-vendor-and-craft-coverage`** — it reviews a
change that branch landed, so it is worthless once merged unreviewed. Marked
with `Branch:` rather than `Blocks:` because `Blocks: phase-N` means a PLAN.md
delivery phase (Phase 3 = web shell, not started), while this branch's
"phase-3" is the TBC content tier. Nothing enforces `Branch:` — `pnpm land`
does not read it.

Ticket 66 was a gate fix. Fixing it properly meant closing the gap underneath:
prose rep rows carried a display string and no id, so the gate had nothing but
strings to compare. Commit `3f53c81` vendors AtlasLoot's Factions module,
parses it to `data/faction_ids.json`, and resolves prose factions to ids at
parse time. That is a data-pipeline change, and it landed inside a gate ticket.

Verified before landing (commands in 66's Done-when and the commit body):

- All 20 faction keys normalise without collision; `DUMMY` (a commented-out
  table colliding with The Aldor on 932) is excluded by stripping `--[[ ]]`
  blocks.
- Six universes regenerate with entry counts unchanged, +7 ids, 10 duplicate
  rep rows collapsing, and no other field differing.
- Every generator is byte-reproducible on a second run.
- `pnpm verify` green, 439 tests.

## What a reviewer should actually push on

1. **The join is a normalised string match**, `_faction_key` in
   `assemble_universe.py` — letters only, lowercased, so `"Lower City"` meets
   `"LowerCity"`. It is collision-free across today's 20 factions and
   `check_rep_tables.py` invariant 4 fails if that stops being true. But it is
   still a string join standing between prose and an id. Is the guard
   sufficient, or should the prose parser carry the id from a different route?

2. **`data/faction_ids.json` has no regeneration gate.** It is committed
   parsed output, like `data/atlasloot_sources.json`, and CI restores only
   `vendor/wowsims` — so nothing rebuilds or byte-compares it. Same exposure the
   existing AtlasLoot output already has, deliberately not widened here, but it
   is now load-bearing for a gate. Worth deciding whether `sync:atlasloot:check`
   belongs in `pnpm verify`.

3. **Ten factions have an id but no display authority.** AtlasLoot localises
   through `ALIL[]` and ships no English table, so for those the gate can only
   check the normalised key, not exact punctuation. `Lower City` vs `Lower  City`
   would pass. Acceptable? Or should the ten prose spellings be pinned somewhere?

4. **`sync_atlasloot.py --restore` fetches from `TRACKED`, not the lockfile's
   file map**, so a newly tracked file can be fetched before it is pinned (it
   prints `not yet in lockfile`). That is what let the faction file land without
   moving the `data-tbc.lua` pin. Check the precedence is right — `--restore`
   now verifies against the lock when an entry exists and skips verification
   when it does not.

5. **Ticket 58 overlap.** That ticket is "only AtlasLoot instance tables are
   vendored". This vendors a second module for one narrow purpose. Does 58
   shrink, close, or stay as-is?

## Done when

- A reviewer has signed off on 1-4, or filed the disagreements as tickets.
- Ticket 58's scope is restated in light of the second vendored module.

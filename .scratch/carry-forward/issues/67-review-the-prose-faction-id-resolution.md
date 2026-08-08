Status: closed
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

## Review, 2026-08-08

Reviewed against the tree at `4d07e11`, not at `3f53c81` — three later commits
on this branch moved two of the five premises. Every claim below was re-run, not
read off the commit message. **Verdict: no blocker; land as-is.** Two follow-ups
below are latent-risk, not defects.

### 1. The normalised string join — accept

The join is real but it is not the gate's only line of defence, which the ticket
framing understates. `_faction_key` resolves an id; a *separate* check then
requires the shipped spelling to equal the one the id names. Mutating shipped
universe rows (id retained, spelling edited) fails on all three realistic drift
shapes:

```bash
python scripts/check_rep_tables.py
```

- dropped article (`The Scale of the Sands` → `Scale of the Sands`) → FAIL
- typo (`Deathsworn` → `Deathsworne`) → FAIL, plus the one-id-two-spellings check
- doubled space (`Lower City` → `Lower  City`) → FAIL

Note the asymmetry the ticket's example gets backwards: `Lower  City` does *not*
pass. It resolves to 1011 and then fails the exactness check. The lossy key only
widens what **resolves**; it never widens what **ships**. Invariant 4 (20 keys,
all distinct, no containment pairs) guards the resolve side. That is sufficient
— routing the id from a different source would be strictly better, but there is
no second source in the tree to route it from.

### 2. No regeneration gate on `faction_ids.json` — real, keep open

Confirmed: `verify` runs `rep-tables:check` but not `sync:atlasloot:check`, and
CI restores only `vendor/wowsims`, so nothing rebuilds or byte-compares this
file. `sync:atlasloot:check` also cannot go into `verify` as-is — it hits the
GitHub API for the upstream tag, so it would make `verify` network-dependent and
fail on a new upstream release rather than on drift. This is the same exposure
`atlasloot_sources.json` already carries, now load-bearing for a gate. Filed
separately rather than fixed here; needs an offline-only local-checksum mode.

### 3. Ten factions with no display authority — premise no longer holds

Now six, not ten (`KeepersOfTime`, `ShatariSkyguard`, `TheAldor`, `TheScryers`,
`TheVioletEye`, `Tranquillien`) — later commits extended `REP_FACTION_DISPLAY`
past ui.proto's 10 to 14. More to the point, **none of the six ships**: shipped
ids are `{933, 935, 942, 990, 1011, 1012, 1038, 1077}`, all of which have a
display authority and take the exact-match path. The weak normalised-key branch
is currently dead code. No action; it becomes live only if a new item pulls in
one of the six, and the branch is a correct fallback when it does.

### 4. `--restore` precedence — correct, and the window is closed

Precedence is right: fetch from `TRACKED`, verify against the lock when an entry
exists, skip verification when it does not, and print `not yet in lockfile`.
That ordering is what lets a new input be added without moving an unrelated pin
— the alternative (lockfile-driven fetch) makes adding a file require an
`--update` that also chases upstream. The transitional state is gone anyway:
`factions-tbc.lua` is now pinned with a sha256, and `--check` reports in sync.
`--check` also now iterates `TRACKED`, so a tracked-but-unpinned file is
reported as drift rather than skipped. Accept.

### 5. Ticket 58 — narrowed, stays open

58 asks for the badge **and** reputation modules. This vendored
`AtlasLootClassic_Factions` for ids only, and later commits on this branch
(`c240f2a`, `4d07e11`) parse its vendor loot and attribute vendor-taught crafts.
So 58's rep half is largely delivered; the badge half is untouched, and its
"re-measure the 94" step has not been done. 58 stays open with its scope
restated rather than closing — the second vendored module changes the answer to
"how many of the 94 have a machine witness", and that number is quoted in 57.

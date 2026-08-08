Status: open (pending a CI run — see Landed)
Type: bug
Origin: ticket 67 review, point 2 — the one finding that survived review as a
  real gap rather than a stale premise.
Blocks: none
Blocked by: none
Relates to: 66 (landed the file), 67 (the review that filed this), 58 (the same
  exposure on the other parsed AtlasLoot output)

# `data/faction_ids.json` is load-bearing for a gate with nothing rebuilding it

`data/faction_ids.json` is committed parsed output from
`vendor/atlasloot/factions-tbc.lua`. `vendor/` is gitignored. Nothing in
`pnpm verify` or in CI regenerates the JSON or byte-compares it against the
vendored Lua, so the committed file can drift from its own source — by a hand
edit, a bad merge, or a parser change landed without a regen — and every gate
downstream keeps reporting green.

That was already true of `data/atlasloot_sources.json` (ticket 58's territory).
What ticket 66 changed is the blast radius: `faction_ids.json` now feeds
`rep_source()`, so a wrong id there does not just mislabel a source, it silently
weakens `rep-tables:check`. An id that resolves to the wrong faction still
passes the exactness check as long as both sides agree — the gate compares the
shipped spelling against the *same* map that produced the id.

Verified at `4d07e11`:

```bash
node -e "console.log(require('./package.json').scripts.verify)"
# runs rep-tables:check; does NOT run sync:atlasloot:check
grep -n "wowsims\|atlasloot" .github/workflows/verify.yml
# CI restores vendor/wowsims only
```

## Why `sync:atlasloot:check` cannot just be appended to `verify`

It does two jobs. The drift half (local file vs. lockfile sha256) is exactly
what is wanted. The freshness half calls the GitHub API for the latest upstream
tag, which would make `pnpm verify`:

- network-dependent, on a command required before every push, and
- red on a new upstream *release* — an event that is not drift and not this
  repo's problem at commit time.

So this needs an offline mode, not a script reference in one more place.

## Sketch

- `sync_atlasloot.py --verify-local`: checksum `vendor/atlasloot/*` against
  `data/atlasloot.lock.json` and exit non-zero on mismatch. No network. Skip
  cleanly (exit 0, one line of output) when `vendor/` is absent, so a fresh
  worktree that has not run `--restore` is not blocked by it.
- A regen check for the parsed outputs: re-run `parse_atlasloot.py` to a temp
  path and byte-compare against both `data/atlasloot_sources.json` and
  `data/faction_ids.json`. This one requires `vendor/`, so it belongs in CI
  behind a restore step rather than in local `verify`.
- If CI is to run it, CI must restore `vendor/atlasloot` the way it already
  restores `vendor/wowsims`.

Untested: whether `parse_atlasloot.py` is byte-reproducible across Python
versions. 66's commit body claims a second run reproduces byte-for-byte, but
that was one machine, one interpreter. Confirm on a real CI run before making a
byte-compare a blocking gate — per the durable-claims rule, do not predict this
from a local run.

## Landed, 2026-08-08

Both gates are in `pnpm verify`, ordered immediately before `rep-tables:check`
so the integrity failure surfaces before the check that silently depends on it.

- **`sync_atlasloot.py --verify-local`** (`pnpm sync:atlasloot:verify-local`) —
  checksums `vendor/atlasloot/` against the lockfile via `pinned_fetch.verify`.
  No network: the freshness half of `--check` stays out, so a new upstream
  release does not turn `verify` red. Exercised in four states — matching (0),
  tampered file (1, names the file and both digests), `vendor/` absent (0, skip),
  restored (0).
- **`scripts/check_atlasloot_regen.py`** (`pnpm atlasloot:regen:check`) — reruns
  the parser into a tempdir and byte-compares all **three** committed outputs
  (`atlasloot_sources.json`, `two-hop/raid-recipes.json`, `faction_ids.json`).
  It never rewrites the committed files; a gate that fixes what it measures
  cannot fail. Exercised in the same four states, with the tamper being a real
  edited id in `faction_ids.json`.

The two are complementary and both are needed: `--verify-local` proves the Lua
matches the pin, the regen check proves the committed JSON matches the Lua.
Either alone leaves a hole.

`.github/workflows/verify.yml` now runs `sync:atlasloot:restore` alongside the
existing wowsims restore. That step is what makes the two gates real in CI —
without `vendor/atlasloot` present they take the skip path and pass vacuously.

Byte-reproducibility: all three outputs reproduce exactly on **Python 3.12.0,
Windows** — one machine, one interpreter, so the cross-platform question 66
raised is still open. That is the reason this ticket is not closed. The gate is
written to fail loudly rather than silently if Linux disagrees, which is the
safe direction, but the claim itself is unverified until a real CI run is read.

## Done when

- ~~`vendor/atlasloot` drift against the lockfile fails a gate that runs
  offline.~~ Done — `--verify-local`.
- ~~The two parsed outputs are byte-compared against a regeneration.~~ Done, and
  it covers three outputs, not two.
- **A real CI run on this branch is read** and confirms the parse reproduces on
  Linux/CI Python. If it does not, the fix is a normalisation in the parser (or
  a documented platform pin), not a weakened gate. Close on that evidence.
- Ticket 58's identical exposure on `atlasloot_sources.json` is closed by the
  same mechanism, or 58 records why it is handled separately. **Now covered** —
  the regen check includes `atlasloot_sources.json`, so 58 inherits the gate.

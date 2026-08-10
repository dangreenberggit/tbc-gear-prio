# Handoff: tier-piece source data is wrong, and nothing was checking it

For the agent taking tickets 48, 49 and 50 on `fix/carry-forward-backlog`.

Written 2026-08-07. Measured against `bdf0ebd` (the ticket 42/45/41/37 tip on
`wk/cf-assemble`), which is about to merge into `fix/carry-forward-backlog`.
**Re-measure on whatever tip you actually get** — 37 changed the tier guard and
41/45 changed which items are admitted, so the counts below can move.

## How these were found, and why that matters

Nobody was looking for them. An agent investigating [[44]] (`sources[0]` order)
went to count how often source kinds conflict, found the answer was *never*, and
tripped over these while counting. All three had been sitting in committed data.

Treat the three tickets as samples, not the population. The population is
"tier-piece source rows nothing validates."

## The three tickets

| # | What | Severity |
|---|---|---|
| [48](../carry-forward/issues/48-token-name-spliced-into-boss-field.md) | 10 items have a token name spliced into `boss` | Wrong text in a shipped filter |
| [49](../carry-forward/issues/49-lightbringer-breastplate-names-a-token-paladins-cannot-use.md) | 30990 names a token group paladins cannot use | Wrong answer to the tool's core question |
| [50](../carry-forward/issues/50-crystalforge-breastplate-claims-a-serpentshrine-boss.md) | 30129 claims a boss that does not drop it | Sends a player to the wrong raid |

Each ticket carries its own re-runnable measurement command. Run them first.

## What I know

**48 is a parser bug.** `parse_wowhead_source` in `scripts/assemble_universe.py`
sees `Drop: <Token> - <Boss> (<Zone>)` and puts the whole `<Token> - <Boss>`
phrase into `boss`. The raw text is intact and contains the separator, so the
information needed to split it is present. This is one fix in one function.

**49 and 50 are transcription bugs in the collected input**, not parser bugs.
Fixing 48 will not fix them. Both have wrong text sitting in
`data/wowhead-lists/ret/p3-p5.json`. For 50 the repo already contradicts itself:
`p1-p2.json` transcribes 30129 correctly and `p3/p4/p5.json` do not.

**The curated map is the reliable side.** `data/two-hop/ret-tokens.json` is
right in every case checked — including both 49 and 50, where it disagrees with
the Wowhead lists and the map is the one that is correct. It carries
`assertTokenIdDiffers` guards and a recorded correction for a known Wowhead
mislabel. When the two sources disagree, the current evidence says trust the map.

**Why the type system did not catch any of it.** `ItemSource` types `boss`,
`token` and `profession` as `string`, so any string passes. This is the same
shape as ticket 42 (a proto enum ordinal reaching the UI as `"2"`). The build
gate validates the `kind` discriminant only, never field *contents*. Expect more
of this class in fields nothing cross-checks.

## What I do not know

- **Whether ticket 37's new guard already covers some of this.** 37 landed a
  boss/token cross-check for tier pieces against the two-hop map on the same tip
  these were measured on. Check what it covers before writing a new gate — it
  may already catch 49, and extending it to `raid` rows may catch 50. Do not
  assume; the ticket-37 worker verified its guard by mutation testing and you
  can do the same.
- **Whether the live Wowhead pages are wrong, or the transcription is.** Every
  claim here is about committed files. I did not fetch any Wowhead page. For 49
  and 50 that distinction decides whether you correct the transcription or teach
  the pipeline to prefer the two-hop map.
- **Whether feral has the same defects.** All three were measured on ret. Feral
  has no two-hop token map that I found, so it may have no cross-check available
  at all. Worth measuring; may deserve its own ticket.
- **How wide the class is.** Nothing scanned other string fields (`token`,
  `zone`, `profession` beyond ticket 42, `npc`) for similar junk. A sweep is
  probably worth more than the three point-fixes.

## Suggested order

1. **Measure first.** Re-run all three tickets' commands on your actual tip.
   Two of the three tickets already resolved this session had a stated cause that
   turned out false — assume yours might too, and say so if it does.
2. **48 first** — parser fix, self-contained, and it changes the shape of the
   rows the other two are about.
3. **A gate before the point-fixes.** The most valuable output is a check that
   fails when a tier row disagrees with `data/two-hop/ret-tokens.json`. Written
   first, it turns 49 and 50 into "make the gate pass" instead of two hand-edits
   that the next transcription slip undoes.
4. **49 and 50** — decide transcription-vs-pipeline, then fix, then confirm the
   gate holds.
5. **Sweep** for the same class elsewhere and file what you find.

## Rules that bite here

- `scripts/assemble_universe.py` and `data/universes/**` are **generated
  artifacts**. Regenerate all six universes from the committed sources and show
  the diff contains only your intended change. The regen commands are per-spec
  and per-phase, `--max-phase {2,3,4,5} --spec {ret,feral}` — see `package.json`
  `universe:assemble`. I verified on `bdf0ebd` that a full regen produces an
  empty diff, so any drift you see is yours.
- `pnpm verify` **needs Node 22.** On Node 20 six suites fail with
  `No such built-in module: node:sqlite`. That is environmental, not your bug.
- Tests are typechecked now (ticket 34). An `as` cast to silence a test type
  error re-opens exactly the hole that closed.
- AGENTS.md is binding: comments explain why not what, and a causal claim in a
  commit or ticket needs a re-runnable command or the word "hypothesis" in the
  same sentence.

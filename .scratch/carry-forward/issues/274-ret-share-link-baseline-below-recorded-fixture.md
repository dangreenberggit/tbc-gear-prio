Status: open
Type: defect
Origin: docs/reviews/feat-finish-the-tab.md
Blocks: none
Blocked by: none

# Ret share-link baseline is 13% below the recorded fixture baseline

The finish-the-tab browser cells loaded ret gear by encoding
`test/fixtures/slamaltman.raid-sim-request.json` into a wowsims share link. The
page then reported a baseline of **1775.0 DPS**.

This repo has its own recorded figure for that same fixture at the same
iteration count: **2042.85 DPS** (stdev 119.04, min 1581.23, max 2493.17,
`iterationsDone: 3000`, sim version v0.0.101). See `docs/stage0-findings.md`
§11 and the table in `docs/verification-log.md`.

**1775.0 is 13 % below 2042.85 and the difference is not explained.**

## Why it matters, and what it does not invalidate

The finish-the-tab cells compare one page state against another on a single
baseline — prune on versus prune off, ret versus feral — so the elapsed times
and the control observations stand on their own. What cannot be trusted is the
absolute DPS, and therefore any comparison of these deltas against numbers
produced outside the page.

## Two candidate causes, neither tested

1. **A different encounter or buff set.** The page received
   `IndividualSimSettings` built by `toIndividualSimSettings`
   (`packages/core/src/individual-settings.ts`), which lifts raid-level buffs,
   debuffs and the encounter out of a `RaidSimRequest` into the individual
   message. The 2042.85 figure came from the `RaidSimRequest` itself. If the
   two carry different consumables, raid buffs or encounter settings, the
   baselines are measuring different fights.
2. **A slot arriving empty.** The fixture has **17 equipment slots of which 16
   carry an item id**, and 16 ids are what the share link persisted into
   `__tbc_new_retribution_paladin__currentSettings__`. That is self-consistent,
   but it was originally written up as "17 items", so the count deserves a
   direct check rather than an assumption.

## What would close this

Either reconcile the two numbers or name the setting that differs:

- Re-sim the fixture through the page and through `wowsimcli` with settings
  asserted identical on both sides — same iterations, seeds, encounter, buffs,
  consumables, talents — and compare the baselines.
- Or diff the `IndividualSimSettings` the page decoded from the share link
  against the `RaidSimRequest` the 2042.85 run used, field by field, and record
  which field moves the number.

If the gap turns out to be a real defect in `toIndividualSimSettings`, it
affects every share link this repo encodes, not just this measurement.

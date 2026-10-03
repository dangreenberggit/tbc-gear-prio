Status: open
Type: investigation
Origin: owner, 2026-09-29, in chat (relayed verbatim by the orchestrating session)
Blocks: none
Blocked by: none
Related: 286, 465, 522

# A stopped and restarted sim seems to continue instead of restarting after a change

This is an investigation ticket about a suspicion. Nobody has confirmed a
bug. Find out whether the behaviour is wrong before designing a fix.

## The owner's words

2026-09-29, verbatim:

> a stopped and started sim seems to continue rather than restart even if underlying settings changed (such as a swapped item) -- unsure but worth investigating.

## What the code does

Line numbers are in `vendor/tbc-new-fork` at fork commit
`02d0ea2ad1dae34087a6d69d316f9c3879bd8247`, the `commit` in
`data/wowsims-fork.lock.json` on 2026-09-29. Read them with
`git -C vendor/tbc-new-fork show 02d0ea2a:<path> | sed -n <from>,<to>p`.
`upgrades_tab.tsx` is `ui/core/components/individual_sim_ui/upgrades_tab.tsx`;
`rank.ts` is `ui/core/components/individual_sim_ui/upgrades/engine/rank.ts`.
Everything below is from reading the code. None of it was observed in a
run.

**Stop.** The Stop button only aborts the run's `AbortController`
(`upgrades_tab.tsx:1366-1376`). The engine checks the signal between
candidate tasks, so sims already running finish and no new one starts
(`rank.ts:1390-1415`). The tab stays in the running state until
`rankUpgrades` returns, so Simulate stays disabled until then
(`upgrades_tab.tsx:1907`). Two runs cannot overlap.

**What survives a Stop.** The tab keeps one `MemoryStore` for the life of
the page (`upgrades_tab.tsx:738-751`). Its comment says its purpose is to
dedupe identical sim requests across runs in the same page session. Two
kinds of entry are kept:

- A whole ranking, keyed by a hash of the run's inputs, written only for a
  complete run (`rank.ts:778-837`, `1612-1627`). A stopped run writes
  none.
- One sim result per request, written as each candidate's sim finishes
  (`rank.ts:1211-1228`). The key is the full sim request, the sim version,
  the seed and the iterations (`simCacheKey`,
  `ui/core/components/individual_sim_ui/upgrades/engine/seams/sim-runner.ts:128-135`).
  `rank.ts:1616-1617` says so directly: "Per-sim rows already landed via
  `cacheSimResult` inside `runCandidate`, so a re-run still resumes
  cheaply."

Nothing else survives. The `stopped` state keeps the partial ranking, but
nothing reads it, and the table renders as empty (`upgrades_tab.tsx:2699-2708`,
ticket 286).

**Simulate after a Stop.** `run()` starts from nothing each time
(`upgrades_tab.tsx:1749-1848`):

- a new `AbortController`;
- an empty `landedRows`;
- the page's request skeleton (`currentPageSkeleton`) and phase, read at
  the click (`upgrades_tab.tsx:1761-1763`);
- the worn gear, read once near the start of `rankUpgrades` (`rank.ts:614`,
  `ui/core/components/individual_sim_ui/upgrades/adapters/player_gear_source.ts:62-85`).

Each candidate's request is built from the new gear with the candidate
swapped in (`composeFor`, `rank.ts:650-665`). The engine looks up that
request in the store before it sims it (`rank.ts:1211-1213`). The delta is
the candidate's DPS minus the new run's baseline (`rank.ts:1229`).

**What a change does to the store.** There is no explicit invalidation.
The staleness listeners only mark a finished (`done`) run stale
(`upgrades_tab.tsx:1444-1485`) and touch neither a `stopped` state nor
the store. Invalidation relies on the key: a changed input changes the
request, and a changed request misses the store. From the code, not
checked in a run:

- A change that alters every request, such as talents, race, buffs,
  encounter or iterations, should give no reuse. The restarted run re-sims
  everything (hypothesis, untested).
- A worn item swapped in slot X changes the baseline and every candidate
  request for other slots, so those are re-simmed. A candidate for slot X
  gives the same request as before, because the gear is the same once the
  candidate is in slot X. So those rows come from the store at once. Their
  figures should still be right, because the stored DPS is for the same
  gear and the delta uses the new baseline (hypothesis, untested).
- A change that alters only which candidates run, such as the Candidates
  cap, the Sources picker or the phase's pool, reuses every request that
  is unchanged (hypothesis, untested).
- The tab passes no seeds (`upgrades_tab.tsx:1784-1793`), so every run uses
  `DEFAULT_SEEDS` (`rank.ts:724`, `734`). A run on a fresh page with the
  same inputs should therefore give the same figures as a resumed run.
  That assumes the sim gives the same result for the same request and seed
  (hypothesis, untested).

**Possible explanations for what the owner saw**, all hypotheses:

1. **Expected behaviour that looks like resuming.** Rows whose requests
   did not change land in the first seconds of the new run, straight from
   the store. That reads as "it carried on". After a worn swap in slot X,
   the rows for slot X would do this.
2. **A real bug: a store key that misses an input the sim uses.** If
   something that changes DPS is not in the request, or is not in the key,
   an old result would be reused for a new setting. Nothing found here
   shows such an input, but this pass did not list every field of the
   request against every page setting.
3. **A related bug on a non-default path.** A result from the bulk
   screening pass is stored together with the baseline it was measured
   against, and a later run reuses that baseline too (`rank.ts:1189-1210`).
   After a worn swap, a slot-X candidate would then be measured against the
   old gear's baseline. The shipped tab does not screen: it uses the
   per-candidate runner (`upgrades_tab.tsx:738-747`, `1709-1732`). This
   path runs only when the `upgradesTab.runner` localStorage key is
   `bulk-http`, so it would not explain what the owner saw
   (hypothesis, untested).

## Proposed correct behaviour

Proposed by the orchestrating session on 2026-09-29. It is not an owner
ruling:

- A change to any input that affects DPS invalidates what the stopped run
  measured, and the next Simulate measures against the new inputs.
- A plain Stop and then Simulate, with nothing changed, may resume from
  the stored results.

Per-request reuse after a change already meets the first rule, as long as
the key covers every input that affects DPS. A stored result for an
identical request is the same measurement. So the fix may be one of:

- nothing, if explanation 1 holds;
- a status note that says how many rows came from earlier sims, so reuse
  does not look like a stuck run;
- a key fix, if explanation 2 holds.

## Proposed repro (not run)

A short run, not a full ranking:

1. Open the Upgrades (New) tab on `:5173`. Set Candidates to about 10 and
   iterations low.
2. Press Simulate. Press Stop after about 3 rows land. Note each landed
   row's item, slot and DPS figure.
3. Swap one worn item, for example a ring. Press Simulate. Note which rows
   land within the first second and their figures.
4. Reload the page, keep the swapped item, use the same Candidates and
   iterations settings, and press Simulate. Let it finish.
5. Compare. Every figure from step 3 should equal the figure for that item
   in step 4. Rows that land at once in step 3 should all be rows whose
   request did not change (for a ring swap: ring candidates).
6. Repeat step 3 with a talent change in place of the item swap. Expect no
   row to land at once.

A test can do the same without a browser: call `rankUpgrades` with a
recorded or fake `SimRunner` and one `MemoryStore`, abort after a few
candidates, change what the `GearSource` returns, and run again. Then
assert that each figure equals a run on an empty store, and that the
runner was called for every request not seen before.

## What would close this

1. A written finding, linked here, that says which explanation holds.
   Back it with the repro above or with the test, and give a command or
   steps a reader can re-run.
2. If there is a bug: a fix as a fork commit plus a re-pin (AGENTS.md, "The
   forked tab repo"), and `pnpm verify` with rc=0. If there is no bug:
   close with the finding, or file a small ticket for a status note if the
   owner wants one.
3. Acceptance, judged by a test or by hand:

   > After Stop, a change to the worn gear or to a setting that affects
   > DPS, and Simulate, every row's DPS figure equals the figure from a run
   > on a freshly loaded page with the same gear, settings, Candidates and
   > iterations.

   `gate-visual` cannot judge this from a capture. The capture script
   records only `pre-run` and `post-run` states
   (`vendor/tbc-new-fork/test-review.mjs`, header comment) and has no way
   to Stop a run. Use the `rankUpgrades` test, or the repro by hand in the
   Browser pane.

## Out of scope

- Ticket 522 (tab requests leave out the consumables' database rows).
  That is a separate bug about what a request carries.
- Whether a `stopped` result should be marked stale after a change. The
  `stopped` table renders as empty (ticket 286), so there is nothing to
  mark.

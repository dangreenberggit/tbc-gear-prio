# Pre-merge review — phase-2/caches

Diffed against: `phase-2/trust...phase-2/caches` (merge-base `0a37c7cc`)

Reviewed at `62d4c53`, three commits:

```
97669ca Add SqliteStore and prove it interchangeable with MemoryStore.
62d4c53 Cache the gear snapshot and the sim result, defending the point budget.
```

Fixes from this review landed as `8ca148c` (gear key, "deltas stable",
standards cleanups) and `5847a06` (error boundary).

**Dispatch note.** `codex` is not on `PATH`, so option 2 of the skill: four
fresh sub-agents on the sharp lane (Opus, effort `medium`) — adversarial,
domain, and the `code-review` skill's Standards and Spec axes — run as one
parallel batch. No wall, no ceiling; nothing was downgraded. Each reviewer got
the diff and its brief only, with no access to the authoring session.

This branch is a Phase 2 subplan, so it is diffed and reviewed against
`phase-2/trust` rather than `dev`, per `.scratch/phase-2/spec.md`'s topology.
It merges into `phase-2/trust`; only that branch ever lands on `dev`.

## Adversarial

Probed cache poisoning and staleness, test falsifiability, error boundaries,
and `SqliteStore` correctness.

The headline finding is shared with the domain axis and recorded there: the
gear cache key omitted the character. The adversarial framing added the
detail that the ranking hash would _agree_ with the poisoned value, because it
hashes whatever `readGear` returned — so the wrong baseline propagates with no
error anywhere.

**Finding (high) — the error-boundary split was incomplete, in three places.**
The split moved the store _write_ out of the `sim-failed` catch but left the
_read_ inside it, so the docstring claiming the split prevents mislabeling was
not true of the code. Three distinct consequences, all reproduced before fixing:

1. **Baseline site** — a failing `kv` read became `RankError("sim-failed")`,
   the exact "wrong subsystem" outcome the comment claimed to prevent.
2. **Candidate site, the serious one** — a failing `kv` read was caught by the
   `catch` meant for wowsimcli panics, so the candidate was pushed to
   `simSkips` with a row reading _"the sim failed on this swap"_ and dropped
   from the ranking. A transient store error silently returned a ranking one
   place short, with no error raised: a wrong order, not a failure.
3. **`internal` was declared but never constructed.** `cacheSimResult` threw a
   bare `Error`, which misses `cli.ts`'s `instanceof RankError` branch and
   prints a raw stack where an operator expects `internal: …`.

**Fixed in `5847a06`** — only `deps.sim.run` now sits inside the sim catch, and
both cache helpers route store faults through `asInternal`. The regression test
asserts the _kind_, and was confirmed to fail without the fix
(`expected Error: kv read exploded to match object { kind: 'internal' }`).

Confirmed sound: no path strands a job row in `running` (ticket 29 holds);
the gear-cache placement really was moved rather than relocated —
`rank.ts` always calls `deps.gear.readGear`, so ADR-0019's hash always sees
fresh gear; and the two new rank tests are falsifiable rather than theatre.
`NonRetainingStore` does not weaken its one use site — that assertion needs
the cache disabled to have two requests to compare.

Also confirmed by probe, both deferred to ticket 31: `SqliteStore.job.create`
throws `UNIQUE constraint failed` permanently after any row deletion, and
`job.create({input: undefined})` reads back as `null` from `SqliteStore` and
`undefined` from `MemoryStore` — a hole in the "provably interchangeable"
claim, since the contract suite never passes `undefined`.

## Domain

Checked against `docs/phase0-findings.md`, PLAN.md §11, §12, §15, and
`docs/verification-log.md`.

**Finding (high) — the gear cache key could not identify one character.**
`gearCacheKey` was `gear:<reportCode>|<fightId>`, but a fight is a raid, not a
player: 25 people share one `(reportCode, fightId)`, and
`LoggedGear.provenance.sourceID` exists because a snapshot resolves to one of
them. `docs/phase0-findings.md` §11 records this repo already shipping that
bug once — `events[0]` was Hagguth the Warrior, so §6's item table quoted his
Destroyer Battle-Helm `30120` for a slamaltman run. A fight-only cache key
would have made it permanent and silent, with no TTL to age it out.

Not live in `HEAD` before the fix — `rankUpgrades` only reads a fight it
resolved from `findFights(input.character, …)`, and no WCL adapter exists yet —
but it was armed for the moment `WclGearSource` lands, and the docstring
("the fight is the whole address") was the false claim a future author would
have trusted. **Fixed in `8ca148c`.**

Claims that check out:

- **Permanent caching with no TTL is the documented design**, not an
  invention — PLAN.md §11 ("immutable and permanent") and §12 ("gear snapshots
  are immutable, so this page is instant on revisit"). A log re-upload gets a
  new `reportCode`, so it does not alias. Re-parse of an existing code
  changing `CombatantInfo` is unaddressed by any committed finding and remains
  **unverified**; risk judged low.
- **Sim determinism** — `docs/verification-log.md`: "Shared-seed repeats are
  bit-identical." `simCacheKey` folds request + `simVersion` + seed +
  iterations, so the cache's premise holds. Caveat already on record: bit
  identity is proven at the `rankUpgrades` seam through `RecordedSimRunner`,
  not across two real binary spawns.
- **Not caching `findFights` is correct**, and better-founded than the comment
  claimed — §12 [R9] calls it a live query wanting a short TTL _and_ per-IP
  rate limiting. The comment cited only the TTL half; corrected in `8ca148c`.

Left on the table: nothing reads `rateLimitData`, so §14 Phase 4's "point
budget survives expected concurrency" box has no instrument behind it. Correct
to defer — §5.1 puts that surface behind the WCL adapter, which does not exist.
Ticket 32.

## Standards + Spec

### Standards

Comment policy was the main axis of criticism: the diff over-commented. Three
cuts applied in `8ca148c` — an eight-line block whose first sentence restated
the class name, a `close()` docstring that restated the method, and the fourth
near-identical copy of the same ADR-0019 argument, reduced to a pointer.

`simStoreKey` extracted: the read and the write were independently building the
same `` `sim:${simCacheKey(...)}` `` string, which is exactly how a cache drifts
into never hitting. `rankingCacheKey` and `gearCacheKey` already existed as
named builders for that reason.

Judged not violations, and I agree: `NonRetainingStore extends MemoryStore` is
not Refused Bequest (it keeps the whole job half, which is the point);
`store-contract.test.ts` is the documented adapter-pair exception, not a fourth
port; no new test asserts on stage internals — the new assertions are counts
crossing a seam and the value `rankUpgrades` returns.

One `Data Clumps` note, partly overtaken by the adversarial fix: collapsing
`(deps, req, simVersion, opts)` into a `SimCache` closure. The stated benefit
was removing the `let baselineWasCached` / `let candWasCached` dance — and
`5847a06` removed that dance anyway for a correctness reason, since the tuple
was what let the store read sit inside the `sim-failed` catch. What remains is
the four-parameter repetition across `readCachedSim` and `cacheSimResult`,
which is real but mild. Not taken: any such closure must preserve the property
that only `deps.sim.run` is inside the catch, and two named helpers make that
visible at the call site in a way a closure would hide.

### Spec

All four scope items delivered: gear snapshot cache, sim-result cache under
the content address of `RaidSimRequest` + `simVersion`, `SqliteStore` against
§11's two-table schema with a shared contract suite, and retention semantics
(correctly _absent_ — no TTL).

**Finding — "deltas stable" was untested.** The ticket names two halves and
says the second is the one with teeth: _"assert the second `Ranking`'s `items`
are deep-equal to the first's, not merely that it returned."_ The only
deep-equal in the suite sat inside the pre-existing identical-re-run test —
which, by this branch's own measurement, passes without either new cache. So
the deep-equal covered the Phase 1 ranking cache, not the new ones: a sim cache
returning a mismatched observation would have moved every `deltaDps` while the
run-count assertions still passed. **Fixed in `8ca148c`** — the pool-grows test
now deep-equals the cached candidate's `RankedItem` across runs.

Scope creep: none. Nothing touches `ret-p*.json`, the web shell, or the
fight-list TTL. Deployment stayed out — `SqliteStore` has zero production call
sites and `cli.ts` still constructs `MemoryStore`.

Also flagged, both deferred to ticket 31: `SqliteStore`'s `kv` omits §11's
`created_at` column, and job ids from `SELECT COUNT(*)` race two writers and
reuse ids after a delete.

On the ticket amendments themselves — this branch edited its own spec file, so
the Spec axis was asked to judge whether that was honest. Verdict: genuine
clarification rather than a spec rewritten to match the build, because the
amendments _narrow_ the author's freedom and carry a re-runnable falsification
story. The fair caveat, now closed: the amendment presented two new tests as
"the evidence for this box" while both were hits-cache evidence only.

## Summary

Four axes, five findings that mattered; three fixed on the branch, two
deferred to Phase 4 tickets that are correctly outside ticket 01's scope.

Two defects were worth the review on their own:

**The gear cache key dropped the character** (domain and spec, independently).
The ticket's own scope text said `(reportCode, fightId, character)` and the
implementation kept only two coordinates, so the code was corrected to match
the spec rather than the reverse. Not reachable in `HEAD` — no WCL adapter
exists — but armed, and a docstring asserting "the fight is the whole address"
would have been read as permission by whoever wrote that adapter.

**The error-boundary split was incomplete** (adversarial, and missed by the
other three axes). This is the one that would have shipped a wrong answer
rather than an error: a transient store read failure inside the candidate loop
pushed a `simSkips` row blaming the sim and dropped the item, returning a
ranking one place short with nothing raised anywhere. The comment asserting the
split was safe made it _less_ likely to be found by reading — which is the
argument for an adversarial axis that does not trust the comments.

Every fix is backed by a test confirmed to fail without it, by reverting the
specific expression and re-running rather than by argument:

| Fix                  | Red state without it                                             |
| -------------------- | ---------------------------------------------------------------- |
| Gear key + character | two-raiders case: warrior served slamaltman's gear               |
| Error boundary       | `expected Error: kv read exploded to match { kind: 'internal' }` |
| Gear cache exists    | `CachingGearSource is not a constructor`                         |
| Sim cache exists     | `expected 6 to be 4`                                             |

`pnpm verify` green at `5847a06` — codegen, typecheck, lint, format, 231 tests,
skeleton check, skill mirrors.

## Disposition

| ID  | Axis        | Disposition | Ticket / note                                                                                                                                                                                                                                            |
| --- | ----------- | ----------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| D1  | Domain      | fixed       | Gear cache key now includes character + spec; `CachingGearSource` scoped to a character. Regression test confirmed failing against the old key (`8ca148c`)                                                                                               |
| S1  | Spec        | fixed       | "deltas stable" now asserted — pool-grows test deep-equals the cached candidate's `RankedItem` across runs (`8ca148c`)                                                                                                                                   |
| ST1 | Standards   | fixed       | `simStoreKey` extracted so the cache read and write cannot drift (`8ca148c`)                                                                                                                                                                             |
| ST2 | Standards   | fixed       | Three comments cut: one restating a class name, one restating `close()`, one a fourth copy of the ADR-0019 argument (`8ca148c`)                                                                                                                          |
| A1  | Adversarial | fixed       | Error-boundary split completed: only `deps.sim.run` sits inside the `sim-failed` catch, store faults route through `asInternal`. Closes the silent candidate-drop path and constructs the `internal` kind that was declared but never thrown (`5847a06`) |
| A2  | Adversarial | defer       | `SqliteStore.job.create` wedges with `UNIQUE constraint failed` after any row deletion — folded into ticket 31                                                                                                                                           |
| A3  | Adversarial | defer       | `job.create({input: undefined})` round-trips to `null` on `SqliteStore`, `undefined` on `MemoryStore`; contract suite never passes `undefined` — folded into ticket 31                                                                                   |
| S2  | Spec        | defer       | `.scratch/carry-forward/issues/31-sqlitestore-job-ids-and-kv-created-at.md` — job-id race and missing `kv.created_at`; `Blocks: phase-4`                                                                                                                 |
| D2  | Domain      | defer       | `.scratch/carry-forward/issues/32-no-instrument-for-wcl-point-budget.md` — no `rateLimitData` reader; `Blocks: phase-4`                                                                                                                                  |
| ST3 | Standards   | wontfix     | `SimCache` closure to collapse the four-param helpers — the `{observation, cached}` tuple is what keeps the store write outside the `sim-failed` catch                                                                                                   |
| D3  | Domain      | wontfix     | WCL re-parse changing `CombatantInfo` under a stable `reportCode` — unverified, no committed finding either way, risk judged low against unambiguous §11/§12 wording                                                                                     |

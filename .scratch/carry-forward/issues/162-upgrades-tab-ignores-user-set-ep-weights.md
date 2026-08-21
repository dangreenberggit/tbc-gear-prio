Status: resolved
Type: design
Origin: docs/plans/wowsims-tab/plan.md §12 (deferred from the tab's v1 scope)
Blocks: none
Blocked by: none

# Upgrades tab ignores the page's user-set EP weights

The tab prefilters and gem-fills with our committed per-spec weights
(`upgrades/data/data.ts` `epWeightsFor`). The host page has its own EP weights
that the user can compute by simming or load from a saved set, and the tab
never reads them. v1 ships that way on purpose (weights gate candidate
*selection* only — sims produce every displayed number, so the failure mode is
a worse shortlist, never a wrong number). This ticket is the v2 design.

All upstream line numbers are against the fork pin `adb0d135` in
`vendor/tbc-new-fork`.

## What upstream actually does

- `ui/core/player.tsx:279` — `private epWeights: Stats = new Stats()`, i.e.
  all-zero at field-initialiser time.
- `ui/core/individual_sim_ui.tsx:589` — `applyDefaults` immediately calls
  `setEpWeights(eventID, this.individualConfig.defaults.epWeights)`, and
  `:737-739` restores either the saved `settings.epWeightsStats` or that same
  spec default on load. **The zero vector is not observable in practice.** The
  "weights default to zero until the user computes them" premise behind this
  ticket is wrong at this pin; the real risk is a *stale or hand-edited*
  vector, not an empty one.
- `ui/core/player.tsx:531-533` — `hasCustomEPWeights()` returns true iff the
  current vector equals no entry in `getSpecConfig().presets.epWeights`. This
  is the "user touched them" signal and it already exists.
- `ui/core/components/suggest_reforges_action.tsx:321, 329, 364-372` — the
  precedent. Reforge suggestion has a `useCustomEPValues` opt-in; when it is
  off it falls back to `this.defaults.epWeights`, and `:326-330` registers a
  sim warning (`sidebar.warnings.custom_ep_not_enabled`) shown when the user
  has custom weights but has not enabled them. **Mirror this, do not invent a
  different interaction.**

## Recommended design

**Now (v1, shipped):** committed weights only, plus an assumptions-drawer line
naming the weights file and its `pin` field, so the shortlist's basis is
visible.

**Later (v2):** a `useCustomEPValues`-shaped opt-in in the tab's settings,
default **off**.

- Off → committed weights, exactly as today.
- On → `player.getEpWeights()`, mapped and validated (below); on validation
  failure fall back to committed weights and surface the reason.
- Whenever `hasCustomEPWeights()` is true and the toggle is off, show the same
  style of warning upstream shows for reforging, so the user is told their
  computed weights are not steering the shortlist.
- Subscribe to `player.epWeightsChangeEmitter` (`player.tsx:297`) to mark
  existing results stale rather than silently re-running.

## Await-if-computing: not implementable without a shim

The user's idea was that a Run clicked mid-computation should await the
in-flight stat-weight sim instead of racing it. Against this pin it cannot be
done from outside:

- The computation is `await`ed inside an anonymous click handler
  (`stat_weights_action.tsx:365-428`); the promise from
  `player.computeStatWeights` (`:408`) is never stored on any field.
- The only in-progress flag is `let isRunning` at `:364`, a closure local.
- `SimSignalManager.running` is `private` (`sim_signal_manager.ts:38`) and the
  class exposes only `registerRunning` / `unregisterRunning` / `abortType`
  (`:45, :55, :63`). There is no getter, no "is anything running" query, and no
  completion event — `TriggerSignal` only models *abort*, not *finish*
  (`:7-25`).
- `player.computeStatWeights` (`player.tsx:535-563`) is public and awaitable,
  but only by whoever *starts* the run. It gives no handle on a run someone
  else started.

**Shim required (fork-side, small):** add a public in-flight promise on
`Player` — set it in `computeStatWeights` before awaiting and clear it in a
`finally`, exposed as `getPendingStatWeights(): Promise<StatWeightsResult |
null> | null`. The tab's Run path then does
`await player.getPendingStatWeights()` when non-null. This is a genuine fork
patch and inherits the drift cost in §3 of the plan; polling
`hasCustomEPWeights()` on a timer is the alternative and is worse — it cannot
distinguish "still computing" from "computed and unchanged". Prefer the shim,
and only build it if v2 is actually wanted.

Failure modes the Run path must handle:

- **Never started** — `getPendingStatWeights()` is null. Nothing to await;
  proceed immediately with whatever weights the toggle selects.
- **Fails or is aborted** — `computeStatWeights` already swallows both,
  returning `null` after a toast (`player.tsx:544-562`), and on abort it does
  not call `setEpWeights` at all. So the awaited value may be `null` while
  `getEpWeights()` still holds the pre-run vector. Treat `null` as "no new
  weights", run with the existing vector, do not block and do not error.
- **User navigates away from the modal mid-run** — `addOnHideCallback`
  aborts (`stat_weights_action.tsx:430-432`), which lands in the case above.

## Stat-key mapping

Total on the stats half, with one real gap.

| Source | Shape | Maps to our `Record<string, number>`? |
| --- | --- | --- |
| `Stats.toProto().stats` (`proto_utils/stats.ts:609-614`) | dense array, index = `proto.Stat` | **Yes, 1:1.** Our keys are the same enum — `packages/core/src/stats.ts:5-10` says indices match `proto.Stat` in `data/proto/common.proto`. Convert with `stats.forEach((v, i) => v !== 0 && (rec[String(i)] = v))`. |
| `Stats.toProto().pseudoStats` (same lines) | dense array, index = `proto.PseudoStat` | **No counterpart.** Our `epScore` (`packages/core/src/stats.ts:31-49`) indexes one flat stats array; there is no pseudo-stat channel. |

The pseudo-stat gap is not hypothetical and it is not new to this ticket:
`data/presets/ret/p2.ep-weights.json` records `"pseudoWeights": {"0": 5.34}`
(main-hand DPS), and `packages/core/src/cli.ts:284-288` reads only `.weights`,
so that 5.34 is **already discarded on the CLI path today**. Any v2 that reads
page weights inherits the same truncation. Decide explicitly whether to (a)
keep dropping pseudo-weights and say so in the assumptions drawer, or (b)
extend `epScore` with a pseudo-stat channel — (b) is a `packages/core` change
with its own drift cost and should not be smuggled in under this ticket.

## Validity check

Keep it principled: the check exists to reject a vector that cannot order
items, not to second-guess a user's judgment. Three rules, applied to the
mapped record:

1. **Non-degenerate** — at least one non-zero weight. An all-zero vector makes
   every candidate score 0 and the prefilter becomes an arbitrary tie-break.
2. **Non-negative** — no weight `< 0`. A negative weight on a gear stat is
   meaningless for an upgrade prefilter (it would rank *away* from stats) and
   in practice only arises from an aborted or misconfigured stat-weight sim.
   DTPS-style specs are out of scope here — the tab ships ret and feral (§2.5).
3. **Primary stat present** — the spec's EP reference stat has a non-zero
   weight. Without it the vector cannot rank the stat the shortlist is built
   around.

Anything failing these falls back to committed weights with the reason shown.
Do **not** add magnitude or ratio sanity checks; a user's weights being
*unusual* is their prerogative, and only *unusable* justifies overriding them.

## Done when

- The tab's assumptions drawer names the EP-weights file and its `pin` for the
  run just performed (this is the v1 half and can land alone).
- A test asserts the prefilter uses committed weights while the page's
  `player.getEpWeights()` holds a different vector, so v1's behaviour is
  pinned before v2 changes it.
- If v2 is built: a test per validity rule (all-zero, a negative weight,
  missing reference stat) asserting fallback to committed weights; a test that
  the mapped record equals the committed record when the page holds the same
  preset the file was copied from; and a test that a `null` result from an
  aborted computation leaves the run using the pre-existing vector.
- The pseudo-weight decision (drop vs. extend `epScore`) is recorded, either
  here or as an ADR.

## Comments

### 2026-08-14 — v1 half landed

The v1 half of this ticket — assumptions-drawer disclosure plus a pinning
test — is done. v2 (the `useCustomEPValues`-shaped opt-in reading
`player.getEpWeights()`) was **not built**: it was out of scope for this
slice and the user has not asked for it. This ticket stays `Status: open`
for v2.

**This lands in `vendor/tbc-new-fork`'s own git history, not in this repo's
log.** The fork is a separate, gitignored clone at
`vendor/tbc-new-fork` on branch `w/a2-162-v1`, commit
`57a84f1e4ecce1ef3e11da675bf623964caea907` (base
`adb0d135336a26eab613215fa85b1265d7ce2e5d`).

What landed, in the fork:

- `data/data.ts` — added `epWeightsSourceFor(spec)`, exposing the `source`
  file name and `pin` already present in each `*.ep-weights.json` (previously
  discarded — `epWeightsFor` only read `.weights`).
- `engine/disclosure.ts` — `buildStandingAssumptions` takes an optional
  `EpWeightsSourceDisclosure` and, when given one, emits a new
  `"ep-weights-source"` standing assumption naming the file and pin. Optional
  so it stays a byte-for-byte port for any caller that doesn't pass it.
- `engine/rank.ts` — added optional `Deps.epWeightsSource`, threaded into the
  `buildStandingAssumptions` call that builds each `Ranking.assumptions`.
- `engine/ep-weights-v1.test.ts` — three tests: `epWeightsFor` returns the
  committed vector independent of a differing page-set vector; the drawer
  line names both file and pin when a source is given; the line is omitted
  (not synthesized wrong) when no source is given.
- `engine/test-ts-loader.mjs` — a small Node ESM loader so the test above can
  run under plain `node --test` (the fork has no test runner — adding one
  means touching `package.json`/`package-lock.json`, both out of this
  worker's scope). See its header comment for the exact invocation.

Re-run the test:

```
cd vendor/tbc-new-fork
node --experimental-strip-types --import "data:text/javascript,import{register}from'node:module';import{pathToFileURL}from'node:url';register(pathToFileURL('ui/core/components/individual_sim_ui/upgrades/engine/test-ts-loader.mjs'));" --test ui/core/components/individual_sim_ui/upgrades/engine/ep-weights-v1.test.ts
```

Observed: `# pass 3`, `# fail 0` (run 2026-08-14).

**Wiring gap — closed at fan-in, 2026-08-14.** The slice worker could not
reach `upgrades_tab.tsx` (it sits one directory above `upgrades/`, outside
that worker's write scope), so the `ep-weights-source` assumption reached
`Ranking.assumptions.standing` but the drawer never rendered it. The
orchestrator closed that last mile in fork commit `179de35a4`: it adds
`epWeightsSource: epWeightsSourceFor(specId)` to the `Deps` literal and
renders the entry in the drawer's `<dl>`, filtering `standing` for it and
printing `s.detail` rather than restating the string. Verified:

```bash
cd vendor/tbc-new-fork && npx tsc --noEmit -p tsconfig.json   # exit 0
```

So this ticket's **first acceptance criterion is now met end to end**, not
just in data. The ticket stays `open` only because v2 is deliberately unbuilt.

**Caveat on the second criterion, from the pre-merge review
(`docs/reviews/feat-sweep-tab-tickets.md`, finding S8):** the v1 pinning test
is weaker than the criterion asks. It builds a `pageWeights` local, asserts it
differs from the committed vector, then calls `epWeightsFor("ret")` twice and
asserts the two calls agree — `pageWeights` is never connected to a `Player`,
`Deps`, or `rankUpgrades`. That pins a **type signature**, not behaviour, and
the exact v2 change it exists to guard against (threading page weights into
the prefilter) would add the parameter and leave this test passing. Compounding
it, the test is not gated at all — see ticket 166. Strengthening it is part of
v2's work, not a v1 regression.

Not built (v2, deliberately): the `useCustomEPValues`-shaped toggle, the
fork-side `getPendingStatWeights` shim on `Player`, extending `epScore` with
a pseudo-stat channel. No shim was written; `player.tsx`, `stats.ts`,
`sim/**` in the fork were not touched (read-only per the worker's scope).

### 2026-08-15 — v2 built, resolved

Built per the user's 2026-08-15 decision (default-with-guard, not the
opt-in-toggle shape this ticket originally sketched): the tab now uses
`player.getEpWeights()` whenever `player.hasCustomEPWeights()` is true and
the mapped vector passes the three validity rules from this ticket's
"Validity check" section (non-zero, non-negative, has weight on the spec's
reference stat); otherwise it falls back to the committed per-spec/phase
file (ticket 168, built in the same slice). No opt-in control was added —
the validity check is the guard the user chose in place of it. No await-the-
computation shim was built, matching this ticket's own conclusion that it is
not implementable without a `Player`-side patch and was not wanted.

**Lands in `vendor/tbc-new-fork`'s own git history** (gitignored clone, own
`.git`), branch `w/a2-162-v1`, commit `3000b2f6b7178c2e98e994583f4e3300e0ceb269`
(base `63494ce7b`). Outer repo's `data/wowsims-fork.lock.json` bumped to this
commit on `feat/sweep-tab-tickets`.

What landed, in the fork:

- `ui/core/components/individual_sim_ui/upgrades/adapters/page_ep_weights.ts`
  (new) — `resolvePageEpWeights(simUI)`: not-custom / custom / invalid,
  implementing the stat mapping (`Stats.toProto().stats`, dense array index
  = `proto.Stat`, dropped when zero) and the three validity rules. Pseudo-
  weights are dropped, per this ticket's own conclusion that the CLI path
  already drops them today — stated in the file's doc comment, not silently
  done.
- `ui/core/components/individual_sim_ui/upgrades_tab.tsx` — `run()` now
  calls `resolvePageEpWeights` first; on `'custom'` it uses the mapped
  record and discloses `{kind:'custom'}`, otherwise it uses
  `epWeightsFor`/`epWeightsSourceFor` (ticket 168's resolver) and discloses
  `{kind:'committed', file, pin}`. `wireStalenessListeners` now also listens
  on `player.epWeightsChangeEmitter`, marking a `'done'` result stale rather
  than rerunning.
- `ui/core/components/individual_sim_ui/upgrades/engine/disclosure.ts` —
  `EpWeightsSourceDisclosure` is now a `{kind:"committed",file,pin} |
  {kind:"custom"}` union; the assumptions-drawer line reads "your page
  weights (custom)" or "committed EP weights from `<file>` (pin `<pin>`)"
  accordingly. This is the change ticket 168's own "Done when" and this
  ticket's item 3 both asked for.
- `ui/core/components/individual_sim_ui/upgrades/engine/rank.ts` —
  `Deps.epWeightsSource` retyped from the old inline `{file,pin}` shape to
  `EpWeightsSourceDisclosure`. This is an `engine/` edit (constrained,
  per the worker's brief): E-W3
  (`packages/core/test/wowsims-fork-parity.test.ts`) was re-run in the outer
  repo and passed before `engine/PROVENANCE.md`'s hashes for `rank.ts` and
  `disclosure.ts` were updated; `pnpm engine-port-drift:check` then reported
  30/30.

Tests: `ui/core/components/individual_sim_ui/upgrades/adapters/page_ep_weights.test.ts`
(new, 5 cases — not-custom, custom+valid mapping, and the three validity
failures, each asserting the disclosed reason) and a rewritten
`engine/ep-weights-v1.test.ts` (6 cases — ticket 168's per-phase resolution
for ret/feral, plus disclosure wording for both the committed and custom
cases). Both run under Node's built-in `--experimental-strip-types --test`
with no bundler; `page_ep_weights.test.ts` needed no custom loader because
its only two imports are `import type`, erased at strip time. Observed:
`page_ep_weights.test.ts` 5/5 pass, `ep-weights-v1.test.ts` 6/6 pass
(2026-08-15). `npx tsc --noEmit -p tsconfig.json` in the fork: exit 0.

Not tested: wiring `resolvePageEpWeights`'s output into an actual `Run` click
against a real `Player`/`IndividualSimUI` instance (a served-page render
check) — the fork's dev server needs a full `make devmode` build, judged not
cheap enough for this slice; state so plainly rather than imply it was
checked. The unit tests above cover the mapping/validation logic and the
resolver/disclosure logic each in isolation, but not their end-to-end
connection through `upgrades_tab.tsx`'s `run()`.

### 2026-08-15 — correction

Line 9 and line 13 above say "prefilters" and "candidate *selection*". There
is no EP prefilter in the engine: candidate selection is `filterPoolByPhase`
plus the Kael temp-legendary exclusion only, and every eligible candidate is
simmed (`packages/core/src/rank.ts:576-582`). EP's role, here and throughout
this ticket, is gem fill only. See
[`docs/plans/wowsims-tab/candidate-pool.md`](../../../docs/plans/wowsims-tab/candidate-pool.md)
§4.

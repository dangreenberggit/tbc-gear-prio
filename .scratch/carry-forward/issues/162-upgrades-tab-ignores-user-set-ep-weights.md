Status: open
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

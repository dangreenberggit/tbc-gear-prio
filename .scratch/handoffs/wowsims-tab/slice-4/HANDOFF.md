# Slice 4 — UI completion: handoff

Plan: [`docs/plans/wowsims-tab/plan.md`](../../../../docs/plans/wowsims-tab/plan.md)
§4, §9.4.

Status: **UI completion built and verified without a sim. `npx tsc --noEmit`
exit 0 in the fork; `pnpm verify` exit 0 (760 tests) in this repo;
`pnpm engine-port-drift:check` 30/30; `packages/core/src/` untouched.**

## Commits

- Fork, `vendor/tbc-new-fork` on `feat/upgrades-tab`: `6cf6dc28a` "Polish the
  Upgrades tab UI and add slot sub-tabs" — **not pushed** (plan §1 lock).
  Parent: `f7146dd69` (slice 3's adapters + first ranking).
- This repo, `feat/shopping-list-wowsims-tab`: (this commit) —
  `data/wowsims-fork.lock.json` bumped to `6cf6dc28a`, this handoff.

## What was built

All changes are in `upgrades_tab.tsx` (rewritten), a new
`upgrades/engine_provenance.ts`, and locale string additions in
`assets/locales/en/translation.json`. **No file under `upgrades/engine/` was
touched** — every added behaviour is a re-render over `applyView`'s existing
`ViewRow`/`ViewResult` shape (`bisTags`, `owned`, `source`/`sources`,
`belowCutoffInView`), which slice 2's port already produced. Confirmed by
`pnpm engine-port-drift:check` staying at 30/30 with no hash changes needed —
the E-W3/PROVENANCE.md re-run order in the task brief did not apply here
because it was never triggered.

### Shopping-list polish (plan §4, sub-tab 1)

- **BiS/Alt tags**: `resultRow` reads `row.bisTags` and appends `★ BiS` or
  `Alt` inline after the item name.
- **Source labels**: new `sourceLabel()` helper — zone sources (raid/token)
  show the zone name; zoneless kinds (badge, crafted, rep, pvp, world,
  heroic, unknown) map through a label table mirroring `view.ts`'s own
  `ZONELESS_SOURCE_LABELS` (not imported — that table is private to
  `view.ts` — but semantically the same set of kinds, and a mismatch would
  just fall back to the raw `source.kind` string, not crash).
- **Owned items greyed**: `row.owned` adds `upgrades-row-owned text-muted`
  to the row and appends "(Owned)" after the name — was previously only a
  CSS class with no visible text cue.
- **Cutoff behind an expand**: `rowsTable()` renders the below-cutoff rows
  into a second, initially-hidden (`d-none`) table with a toggle button
  (`upgrades-below-cutoff-toggle`) that flips visibility and swaps its own
  label text between "Show N item(s) below the cutoff" and "Hide items
  below the cutoff". This replaced the old behaviour, which simply never
  showed below-cutoff rows at all.

### Per-slot sub-tabs (plan §4, sub-tabs 2+)

`renderSubTabs()` derives the set of populated slots from the current
`ViewResult` (`slotsInView()`, filtering `SIM_ORDER` by which
`slotChoice ?? slot` values actually appear in `view.rows`), then builds one
`nav-tabs`/`tab-pane` pair per slot, hand-rolled exactly the way
`DetailedResults.tsx` does it (static `<li><button data-bs-toggle="tab"
data-bs-target="#id"></button></li>` + `<div id="id" className="tab-pane
fade">`, `new Tab(...)` per button) — copied idiom, not a shared component,
per the task brief's explicit instruction. The strip is torn down and
rebuilt on every render (the shopping-list tab/pane is kept, since its id
never changes) rather than diffed — slot sets change only when a new
`Ranking` lands, so a full rebuild on state transition is cheap and simple,
and matches the DetailedResults precedent of a static array driving the nav
rather than incremental patching.

Each slot pane reuses the same `rowsTable()` renderer as the shopping list,
filtered to that slot's rows (`row.slotChoice ?? row.slot === slot`) — same
BiS/owned/source/cutoff-toggle behaviour per slot, not a separate code path.

### Staleness banner (already wired in slice 3, now visible)

The listener wiring (`gearChangeEmitter`, `talentsChangeEmitter`,
`sim.changeEmitter` → `setState({ ...state, stale: true })`) was already
correct in slice 3 and is **unchanged**. What changed is the rendering:
`statusContent()`'s `'done'` case now renders a `.alert.alert-warning`
banner block (icon-less, but visually distinct — background color, border,
bold "results may be out of date" text) instead of a plain inline text
suffix, satisfying plan §4's "visible banner" language more literally than
slice 3's text-only version.

### Progress display

Unchanged from slice 3 — `statusContent()`'s `'running'` case already shows
`progressLabel(p)`, which covers every `Progress` stage including
`simming {done}/{total}`. Plan §9.4 lists "progress display" as a
done-when item; nothing needed changing here since slice 3 already
satisfied it. Confirmed by re-reading `rank.ts`'s `onProgress` call sites
(unchanged, not touched this slice) against `progressLabel`'s switch (still
exhaustive over `Progress`'s five stages).

### Assumptions drawer (plan §4's "seed, iterations, maxPhase, engine
provenance = fork commit, sim version")

New `<details>`/`<summary>` element (native HTML disclosure widget — no JS
toggle needed, matches the "drawer" framing without inventing state) below
the results, rendered only in the `'done'` state. Shows:

- **Seeds**: `ranking.assumptions.seeds.join(', ')` — plural because
  `rank.ts`'s `DEFAULT_SEEDS` is `[11, 22, 33, 44, 55]` and paired
  replication can use more than the first.
- **Iterations**: `ranking.assumptions.iterations`.
- **Max phase**: `ranking.assumptions.maxPhase`.
- **Engine provenance**: `ENGINE_FORK_COMMIT`, a new hand-maintained
  constant in `upgrades/engine_provenance.ts`. **Known limitation, stated
  in that file's own doc comment**: the fork has no build-time git-info
  plumbing (no `git describe` step anywhere in `vite.config.mts` or the
  worker build), so this cannot be read at runtime the way
  `WasmSimRunner.version()` reads an already-exported constant. It is a
  literal that must be hand-updated whenever `upgrades/` changes — and by
  construction a commit can never contain its own hash, so this file
  necessarily lags one commit behind HEAD immediately after being written.
  That is inherent to the mechanism, not a bug to chase further; the
  alternative (inventing a build step) was out of scope and would have
  added an npm dependency or a new build script, which the task brief's
  "fork stays dependency-free" constraint rules out for the former and
  slice-boundary discipline rules out for the latter.
- **Sim version**: `` `api-v${CURRENT_API_VERSION}` `` — the same constant
  `WasmSimRunner.version()` already returns (`constants/other.ts`), read
  directly rather than stashed on `Ranking` (which has no such field —
  it's folded into `contentHash` instead per `rank.ts`'s own comment).

## Verification — every plan §4 behaviour, and how, without a sim

Per the task brief's "done when": every view behaviour must work without
triggering a sim, since views are pure renderings over one `Ranking`. Two
verification passes were used, both **without running a real WASM sim**
(ticket 156's ~100× environment slowdown makes that impractical here, and
was explicitly out of scope per the brief):

### 1. `applyView` pure-logic checks against a synthetic `Ranking`

Ran a standalone Node/tsx harness
(`scripts/verify_view.mjs`-style, written to this session's scratchpad —
**not committed**, matching E-W3's own precedent of loading the fork's
`engine/` files by file-URL import) that imports the fork's real
`upgrades/engine/view.ts` and `slots.ts` and exercises 16 assertions
against a hand-built `Ranking` with BiS/owned/below-cutoff/crafted-source
items:

```
ok: shortlist excludes below-cutoff item
ok: belowCutoffCount is 1
ok: rows includes all 4 (cutoff is a view flag, not a filter)
ok: hideOwned removes owned row from rows
ok: hideOwned still keeps non-owned rows
ok: BiS tag present on row
ok: pinBisAvailable true when any row is BiS
ok: pinBis puts BiS row first despite lower deltaDps
ok: owned flag survives into ViewRow
ok: raid source carries a zone
ok: crafted source has no zone
ok: row 101 slot 'head' is in SIM_ORDER
ok: row 102 slot 'chest' is in SIM_ORDER
ok: row 104 slot 'feet' is in SIM_ORDER
ok: row 103 slot 'finger1' is in SIM_ORDER
ok: applyView does not mutate its input Ranking

ALL CHECKS PASSED
```

This directly verifies: cutoff filtering is a view-level flag not a data
filter (so the "expand" toggle has real rows to reveal), `hideOwned`
actually removes rows, BiS tags and `pinBisAvailable` are computed
correctly, `pinBis` sorting overrides `deltaDps` ordering, `owned` survives
into the row the UI reads, source shape correctly distinguishes zone vs
zoneless kinds (what `sourceLabel()` branches on), every row's effective
slot is a valid `SIM_ORDER` member (what `slotsInView()`'s filter depends
on), and — directly testing plan §2's "no view changes a number" —
`applyView` never mutates its input `Ranking` under any option combination.

### 2. Real page, real DOM, real tab switch (no sim run)

Drove the fork through the Claude Code Browser pane against another
session's already-running `vite serve --port 5173` (this session's own
`preview_start` on port 5173 was blocked as in-use, so it attached to that
server directly at `http://localhost:5173/tbc/paladin/retribution/` rather
than starting a duplicate). Confirmed:

- Clicking the "Upgrades" nav tab renders the new tab shell — status line
  reads "Ranks upgrades against your current gear and settings on this
  page." (the `'idle'` state), matching `buildTabContent()`'s wiring.
- No console errors trace to `upgrades_tab.tsx`, `engine_provenance.ts`, or
  the translation file — only pre-existing unrelated noise (wowhead
  tooltip fetch failure, reforge-worker 404s), matching slice 1 and slice
  3's handoffs' notes that this noise is expected in this environment.
- **Did not click Run.** Per the task brief, a full sim run in this
  automation environment is known (ticket 156) to take minutes-to-stuck,
  and this slice's done-when explicitly does not require a completed sim —
  only that view behaviours work over an *existing* `Ranking`, which check
  (1) above verifies directly and more thoroughly than eyeballing a DOM
  after a lucky fast run would.

### Not independently re-verified in-browser (would need a completed ranking)

The sub-tab strip's actual click-to-switch DOM behaviour (Bootstrap's
`Tab.show()` toggling `active`/`show` classes) was **not** clicked through
in a live browser, because no session-scoped `Ranking` reaches the tab
without a completed sim, and the `UpgradesTab` instance has no debug
handle exposed on `window` to inject a stub state into (checked: no
`sim`-matching global exists on the page). This is the same idiom
(`new Tab(ref.value!)`) `DetailedResults.tsx` already uses in production,
so functional risk is low, but it is **untested end-to-end**, stated
plainly rather than implied by the code-reading verification above.

## Untested / hypothesis, stated plainly

- **Sub-tab click-switching in a real browser** — not exercised, see above.
  The Bootstrap `Tab` wiring is copied verbatim from `DetailedResults`'s
  working pattern, but this specific instantiation (dynamically created
  nav items, not a static array) was not clicked through live.
- **The below-cutoff toggle's click handler** — verified by code reading
  (`classList.toggle('d-none')`, label text swap) but not clicked in a live
  browser for the same reason (no completed ranking reachable without a
  sim in this environment).
- **`engine_provenance.ts`'s `ENGINE_FORK_COMMIT` will be one commit stale**
  immediately after this handoff's commit lands, by construction (a commit
  cannot contain its own hash). Whoever next touches `upgrades/` should
  update it to `HEAD` in that same commit, per the file's own doc comment.
- **E-W2 (in-browser wall-clock budget) remains unmeasured** — unrelated to
  this slice's scope, carried forward from slice 3/ticket 156, not
  re-attempted here.
- **The iteration-count control** named in plan §9.4/D7 as "a visible
  control" was not built this slice — the task brief's plan-§4 behaviour
  list (which this slice's done-when is scoped to) does not mention it,
  and D7's control was not re-confirmed as in scope; flagging this gap
  rather than silently omitting a mention of it.

## Verification summary (actual commands/output)

- Fork `npx tsc --noEmit`: **exit 0**, no errors.
- This repo `pnpm verify`: **exit 0**. `40 Test Files passed (40)`,
  `760 Tests passed | 1 skipped | 2 todo (763)` — same counts as slice 3's
  handoff, confirming no regression.
- `pnpm engine-port-drift:check`: **30/30 ported files match
  PROVENANCE.md** — unchanged, since no `engine/` file was touched.
- `git status --short packages/core/src`: **empty** — untouched, checked
  both before writing this handoff and via the same command in slice 3's
  handoff precedent.
- `git status --short` in the fork after `git add`: only
  `assets/locales/en/translation.json`,
  `ui/core/components/individual_sim_ui/upgrades_tab.tsx`, and the new
  `ui/core/components/individual_sim_ui/upgrades/engine_provenance.ts`
  staged; `.ew1-scratch/` (slice 3's leftover untracked scratch dir) was
  left alone, not added.

## Fix-up after review

Fixes for the findings in
[`slice-3-4-review.md`](../slice-3-4-review.md). Fork commit
`e1fbf0e2d` (parent `6cf6dc28a`) on `feat/upgrades-tab`, **not pushed**.
This repo: `data/wowsims-fork.lock.json` bumped to `e1fbf0e2d`, this section.

- **F1 (medium, fixed)** — weapon-pool rows landed in no slot sub-tab.
  `slotsInView` and `slotPaneContent`'s row filter both cast
  `row.slotChoice ?? row.slot` to `SimOrderName`, which is unsound for
  `weapon`: it is a pool `ItemSlot`, not a `SIM_ORDER` member, and never
  gets a `slotChoice` because `rank.ts` only sets one for slots that map to
  more than one sim slot (finger/trinket). Replaced the cast with a shared
  `effectiveSlot()` helper that resolves through `pool.ts`'s exported
  `simSlotsForPoolSlot` (`row.slotChoice` still wins when the engine set
  one), used identically by `slotsInView` and `slotPaneContent`. Also
  updated the results-table slot column to use the same helper, so weapon
  rows show "Main Hand" instead of the literal string "weapon".

  Verified with a small node harness
  (`vendor/tbc-new-fork`, not committed — scratch) that re-implements
  `simSlotsForPoolSlot`/`effectiveSlot` and buckets every entry in the
  three committed universes by effective slot:
  ```
  ret-p2   mainhand bucket: 12  weapon bucket: 0
  ret-p3   mainhand bucket: 18  weapon bucket: 0
  feral-p2 mainhand bucket: 57  weapon bucket: 0
  ```
  These match the review's own weapon-row counts (12/18/57) exactly, and
  the `weapon bucket: 0` confirms nothing is left stuck under the old,
  un-tabbed key. This is a bucket-assignment check against the raw
  universes, not a run through `applyView`/`rankUpgrades` — it does not
  exercise `slotChoice` being set by a live ranking, only the fallback path
  F1 was about.

- **F2 (low, fixed)** — `activeSubTab` was written but never read, so any
  staleness-driven re-render (`renderSubTabs` tearing down and rebuilding
  the tab strip) silently bounced the user back to Shopping List.
  `renderSubTabs` now tracks each rebuilt sub-tab's button by id and calls
  `Tab.show()` on the remembered `activeSubTab` after rebuilding, falling
  back to Shopping List when that slot no longer has any candidates. The
  existing `shown.bs.tab` listener (attached once, in the constructor)
  keeps `activeSubTab` in sync for both user clicks and this programmatic
  `show()`. Verified by `npx tsc --noEmit` and by reading the resulting
  control flow; **not** verified live in a browser (same E-W2/ticket-156
  constraint as the rest of this slice — browser sims are out of scope for
  this fix-up, and this fix's mechanism does not depend on a completed sim
  to exercise the tab-switch/rebuild path, but no live click was recorded).

- **F3 (low, fixed)** — removed the dead `hideOwned` field; its one call
  site in `currentViewOptions()` now inlines `false` directly, with a
  comment pointing at plan §4 (greying, not hiding, owned rows is the
  spec'd behaviour). No visible change.

- **F5 (low, fixed)** — added the D7-required visible iterations control:
  a plain `<input type="number">` next to the Run button, defaulting to
  3000 (mirrors `rank.ts`'s own un-exported `DEFAULT_ITERATIONS`, restated
  as a local constant since that engine constant isn't public and engine/
  is out of scope for this fix-up). `run()` reads it once, at click time,
  via a new `readIterations()` helper, and passes it as `RankInput.iterations`
  — an already-existing optional field on the engine's public input type,
  so no engine change was needed. The input has no change listener, so
  editing it cannot mark state stale or trigger a sim by itself; it only
  changes what the *next* Run click sends. Verified by `npx tsc --noEmit`
  and by reading `run()`'s call site; **not** verified live (same
  ticket-156 constraint — no browser sim was run to confirm the control's
  value actually reaches a completed ranking's `assumptions.iterations`).

### Verification (fix-up)

- Fork `npx tsc --noEmit`: **exit 0**, no errors, after fixing one
  follow-on type error (`min`/`step` on `<input>` belong at the top level
  in this fork's `tsx-vanilla`, not inside the `attributes` bag).
- This repo `pnpm verify`: **exit 0**. `40 Test Files passed (40)`,
  `760 Tests passed | 1 skipped | 2 todo (763)` — unchanged from slice 4's
  own numbers, confirming no regression from the fix-up (expected: no
  `engine/` or `packages/core/src` file was touched).
- `pnpm engine-port-drift:check`: **30/30 ported files match
  PROVENANCE.md** — unchanged.
- F1's bucket-count numbers above, from a fresh run against the fix-up
  commit's working tree.
- Not run this pass: browser sims (ticket 156, same constraint as slice
  3/4), and no live click-through of F2's tab-restore or F5's iterations
  control — both are stated above as unverified rather than implied
  tested.

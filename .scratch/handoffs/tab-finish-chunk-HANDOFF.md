# Handoff — "finish the tab" chunk (wowsims Upgrades tab)

Written 2026-09-19 for a fresh session (prior session's context was spent). This
covers the whole arc of work on the wowsims Upgrades tab this chunk, where it
stands, and what the owner still wants.

## TL;DR

- Everything lives on **`feat/tab-signoff-followups`** (main HEAD `2b9512d8`,
  17 commits ahead of `dev`). The FORK work is on `vendor/tbc-new-fork` branch
  `feat/upgrades-tab`, HEAD `c122a3012` = `data/wowsims-fork.lock.json` commit.
- **MERGE IS HELD** by owner instruction. Do NOT `pnpm merge-to-dev` without a
  fresh, explicit merge ask. The batch is review-clean and merge-ready
  (`pnpm merge-to-dev --check-only` = `merge-ready: ok`), but the owner wants two
  design questions (ticket 438) resolved before it lands, so the tab reaches
  `dev` complete.
- **15 work tickets are closed** (see below); **8 follow-up tickets are open**
  (425, 426, 432, 434, 435, 436, 437, 438).
- **Nothing is pushed** (fork lock `pushed: false`). Pushing the fork branch is a
  separate owner ask.

## What shipped this chunk (all closed)

Three waves, all on `feat/tab-signoff-followups`:

1. **Chunk 3 re-verify** — re-proved the earlier styling on the post-Chunk-1 fork
   tip; review at `docs/reviews/phase-3-tab-layout-verify.md` (that was a separate
   branch folded in).
2. **9-ticket owner batch** (415, 416, 417, 419, 420, 421, 422, 423, 424) — from
   the owner's first sign-off walkthrough. Pre-run headings, baseline placement,
   Content→checkboxes, set-potential total, tooltip target, cutoff text, export
   box, mobile alignment, and the Sim-sets guarantee control.
3. **5 UI refinements** (427, 428, 429, 430, 431) + **433** (default-select the
   phase's BiS set) + **6 copy rewords** — from the owner's screenshot review.
   - 430 = the unified single result-row tag ("BiS is set membership"; one tag
     per selected set, star dropped, generic bisTags suppressed when in a set).
   - 431 = set-bonus breakdown moved to a DPS-cell hover tooltip; total kept.
   - 433 = on load/phase-change, pre-select the phase's BiS preset(s); rule =
     `preset.phase === bisTagPhaseFor(...).tagsFromPhase` AND all in-pool ids
     bisTags-tagged. Feral P5 correctly degrades to the P3 pair (owner confirmed
     working-as-intended: "use the latest BiS set at/before the phase; auto-
     corrects when wowsims adds a later set").

Reviews: TWO clean pre-merge rounds, all four axes each time, in
`docs/reviews/feat-tab-signoff-followups.md`. Gates green: `pnpm verify` rc=0,
layout gate 45/45, desktop gate green (golden unmoved), locale gate red→green
(this batch fixed a pre-existing schema drift).

## The six copy strings as shipped (owner-approved)

`upgrades_tab` in `vendor/tbc-new-fork/assets/locales/en/translation.json`:
- `settings.sources_title` = "Sources"
- `settings.sets_caption` = "Items in these sets are always included in the sim,
  even if the filters above would exclude them."
- `export.flavour_tokens` = "Exporting the token ID for tier pieces — the item
  that actually drops."
- `export.flavour_gear` = "Exporting the gear item ID for every row."
- `set_bonus.tip_base` = "Before set bonus: {{base}}"
- `set_bonus.tip_total` = "Total with set bonus: {{total}} (what the rows are
  ranked by)"
Kept as-is by owner decision: "Alt", "Sim sets", "pc"/"BiS"/"token id".

## What the owner still wants (open, prioritised)

### Design questions — the reason the merge is held (ticket 438)
The owner re-raised these in the 2026-09-19 viewing session; they were addressed
too shallowly the first time and need a REAL design exploration (options +
trade-offs, `design-an-interface` skill / design lane), NOT straight-to-code:

- **A) The "Sources" filter component.** Currently a flat checkbox pile in a
  content-block (ticket 428). The owner: this isn't a good approach and the
  content-block wrap isn't one of the better options either. Generate and compare
  real component approaches (multi-select dropdown, collapsible facet list, chip
  multi-select, group/tier affordances…). The owner explicitly asked "what
  solutions were looked at?" — the answer this chunk was "none"; fix that.
- **B) The "Sim sets" organization.** The selected phase's sets + custom (saved)
  sets should be viewable; other phases' sets should be hidden/collapsed when not
  the most relevant. Currently a flat list of all phases. 433's default already
  keys off the current phase, so "relevant now" has a definition to build on.

Do the exploration, present options to the owner, get a pick, THEN implement.

**IMPORTANT correction (read 438's "grounding" section):** the owner's real,
repeated ask (verified from the origin transcript) is not "invent N component
options" — it is (1) **study how wowsims itself builds these controls and match
that native idiom** ("i question how much we've really tried to match the styling
elsewhere on wowsims" — the 428 content-block is the kind of not-quite-native
half-measure they're tired of), and (2) **the automated visual review was
supposed to catch this** ("third time bringing up this issue") — i.e. finally
build the approved visual+a11y reviewer so off-brand/broken controls get flagged
before the owner sees them. Frame Part A as "find and match the native wowsims
control," and land the visual reviewer in the same next tab stage. The literal
"content dropdown too big" was only sizing and is already fixed (328).

### Real UI bugs
- **Ticket 437** — "Ranking failed: Failed to fetch" is dumped raw into the UI.
  The tab should catch a worker/transport load failure and show a plain message.
  NOTE: the specific failure the owner hit was ENVIRONMENTAL, not a branch defect
  — see the "Running the tab for viewing" section.
- **Ticket 439** — after a run, scrolling with the cursor over the sim-settings
  panel scrolls the sim's item/results list instead of the settings panel. A
  scroll-target / overflow-containment bug in the post-run layout.

### Deferred minors (not blocking)
- 425 — BiS-tag gap layout assertion can pass vacuously.
- 426 — Content filter: a multi-source item survives if any source stays ticked
  (behaviour choice) + the `guaranteedSetsAvailable()` per-row localStorage parse
  perf smell.
- 432 — wire `test-locales.mjs` into `pnpm verify` (its schema half is already
  fixed this chunk; the wiring decision is open).
- 434 — the desktop gate leaves a stray `wowsimtbc.exe` on :3333 that blocks the
  next run; fix the gate's teardown. **This bit the executor 3× this chunk** — the
  orchestrator had to free the port by hand each time. The executor seat is
  (correctly) permission-denied from killing it, so the fix is the gate cleaning
  up, not loosening permissions.
- 435 — tab tippy instances not `.destroy()`'d on re-render (GC-bounded).
- 436 — `.content-block` scaffold hand-written 3× in the tab; extract a helper.

## Running the tab for viewing (IMPORTANT — dev-server gotcha)

- **Vite alone (port 5173) does NOT run the sim.** It serves the UI but returns
  its HTML fallback for `sim_worker.js` / `lib.wasm`, so Run fails with
  "Failed to fetch" (`worker_pool.ts:292`). This is the environmental cause of
  ticket 437's error; it is NOT a branch bug.
- **Use the Go backend (port 3333) to actually Run:** `preview_start` name
  `wowsims-backend` (builds `wowsimtbc` first, ~50s), then open
  `http://localhost:3333/tbc/druid/feralcat/`. Verified this chunk: Run works
  there (simmed 401 candidates, no fetch error). Feral is the spec that shows the
  set-bonus tooltips + Sim-sets chips; ret = `/tbc/paladin/retribution/`.
- fnm/node trap: never `cd` into the fork; node pin
  `C:\Users\dgree\AppData\Roaming\fnm\node-versions\v22.17.1\installation`.
- The desktop gate needs go+make+Chrome and binds :3333; free any stray
  `wowsimtbc.exe` first (ticket 434).

## Process notes for whoever picks this up

- This chunk ran the **stage-gate** skill (Planner=Fable, Reviewer/Executor=Opus
  medium) for the two feature batches, and `pre-merge-review` (four axes) after
  each. Stage artifacts: `.scratch/stage-gate/tab-signoff-followups/` and
  `.scratch/stage-gate/tab-ui-refinements/`.
- **Separately APPROVED but NOT built:** a per-feature visual + a11y reviewer
  (axe-core ratchet + a `gate-visual` seat), scheduled as its OWN stage-gate for
  the NEXT tab stage. Full proposal:
  `.scratch/stage-gate/visual-a11y-review-proposal.md`. See memory
  `project-visual-a11y-reviewer-approved`. It needs a fresh session to register
  the new agent. Ticket 438's design work and this reviewer are both "next tab
  stage" candidates.
- Ticket numbers: `NEXT` = 439.

## Suggested next moves (owner will confirm)

1. Ticket 438: run the design exploration for Sources + Sim-sets, present options.
2. Owner picks; implement the chosen designs (fork commits + re-pin + gates).
3. Ticket 437 (error message) can ride along with that implementation.
4. THEN re-offer the merge of the whole `feat/tab-signoff-followups` batch.
5. The visual+a11y reviewer build is its own stage-gate whenever the owner wants.

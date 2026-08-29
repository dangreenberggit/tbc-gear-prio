# Handoff — Upgrades tab presentation fixes + the 4pc/noise ranking decision

Written 2026-08-28 for the next agent (or session) to **oversee via the
orchestration system** and finish. You are the delegator: fan work out to
sub-agents, judge their output, commit per green slice. Do not hand-implement
what a worker should do — but do read this whole file first; it carries facts
that vanished with prior agents' reports.

Branch: `feat/upgrades-dedup-wowsims` (main checkout). Fork: separate gitignored
repo at `vendor/tbc-new-fork` on `feat/upgrades-tab`, tip `bc7925362`, pinned in
`data/wowsims-fork.lock.json`. Nothing is merged to `dev`. Tree is clean at
handoff.

## THE ONE SETTLED DECISION (owner, stated repeatedly — do not re-ask)

**A real set bonus affects ranking; a noise-level (sub-floor) bonus affects
nothing — not the label, not the sort, not the cutoff.** A set bonus is ≥0 by
nature; our negative "4pc" figures are sim noise around zero (see
`.scratch/set-bonus-value/README-set-bonus-truth.md` for the proof, but you do
NOT need to re-investigate — this is settled). The owner has answered this many
times; treat it as ground truth and implement it. Do NOT open another
investigation or ask the owner to re-decide the ranking rule.

## Current state (what's done vs open)

Done, committed, verified, **not merged**:
- 317, 319, 320, 322, 324 (five tickets) + 315's display noise floor. Re-pins
  green. Pre-merge review round 5 written (`docs/reviews/feat-upgrades-dedup-wowsims.md`).
- 315's floor: `SET_BONUS_MIN_DISPLAY_DPS = 10` in
  `vendor/tbc-new-fork/ui/core/components/individual_sim_ui/upgrades_tab.tsx:109`,
  gating the *displayed* set-bonus line (`:1986,1991`). This hides sub-noise
  bonuses from the LABEL only.

Open (this handoff's work): 313, 325, 326, 327, 328, 329, 330, 331.

## Work item 1 — 331: apply the owner's rule (noise doesn't rank) — SMALL

**The bug in one sentence:** the displayed bonus line is noise-gated (315), but
the *ranked number* is not — `rankableSetPotential` returns the raw
`prospectiveBonusDps` with no floor, so a sub-noise (even negative) bonus silently
moves the sort key and cutoff when the toggle is on.

Fix location (BOTH copies — drift cycle):
- `packages/core/src/view.ts:333-336` `rankableSetPotential` (returns raw bonus,
  only zeroes the confounded case).
- Ported twin: `vendor/tbc-new-fork/ui/core/components/individual_sim_ui/upgrades/engine/view.ts:169`.

The fix: `rankableSetPotential` returns `0` when the bonus is below the noise
floor (so it contributes nothing to `sortKeyFor` `view.ts:338-341` and to the
cutoff path `view.ts:317-324`). Real bonuses pass through unchanged.

**Design points the next agent MUST resolve (these are real, not settled):**
1. **Where does the floor value live for the ranking layer?** `SET_BONUS_MIN_DISPLAY_DPS = 10`
   is in the fork *tab* file, NOT in `packages/core`. `view.ts` is core. Do not
   reach across into the tab. Decide: a shared constant in `packages/core`
   (e.g. next to `cutoff.ts`), reused by both the display gate and the ranking
   gate, OR a core-level notion. Note `packages/core/src/cutoff.ts` already has a
   per-spec noise-derived cutoff (ret 3.4 = 2×SE 1.678, feral 3.6); the display
   floor (10) is higher/rounder. Reconcile: is the ranking floor the same 10, the
   cutoff's 2×SE, or its own value? This is a genuine design call — bring options
   to the owner if unsure, but frame them, don't re-litigate the RULE.
2. **ADR-0024 says the opt-in view MAY score a member by its package's
   `packageDeltaDps`** (`docs/adr/0024-...md`). It predates the 315 floor. Adding
   the ranking gate needs a one-line ADR-0024 amendment ("a sub-noise
   contribution does not move the ranking") so the record matches the code. This
   is bookkeeping, not an owner decision.

**The parked stage-gate plan is WRONG — do not execute it.**
`.scratch/stage-gate/upgrades-4pc-visibility/plan.md` (reviewed sound) solved a
different, wrong problem (sum per-threshold increments to *surface* the 4pc). It
is superseded. The real fix is the small noise-gate above. If you re-run the
stage-gate, write a NEW plan for the noise-gate scope; do not resume the old one.
The old plan's decision-log is at `.scratch/stage-gate/upgrades-4pc-visibility/decision-log.md`.

Tests: unit-test `rankableSetPotential` returns 0 below floor / passthrough above
(pure function); interface test through `rankUpgrades` that a sub-noise set row's
sort position is unchanged by the toggle. Drift cycle for the fork twin (see
below). Ticket 331 has the full reframing already written in it.

## Work item 2 — 330 + 328's tooltip: copy, DOWNSTREAM of 331

- **330**: the set-bonus LINE wording. Owner picked (earlier) the "need N more"
  honest form; but once 331 lands, revisit — with noise-gating, the line only
  ever shows for a real (above-floor) bonus, which simplifies the copy. Options
  were in a copy-agent report (now gone); regenerate them if needed. Owner's rule:
  plain English, may use terms observably used elsewhere on wowsims, succinct,
  show progress against the THRESHOLD (`/2`, `/4`), never piece count (`/5`, `/8`
  — tier sets have 5 or 8 pieces but bonuses only at 2/4).
- **328 item 4 — the toggle tooltip**: plain-English reviewed explanation of what
  the set-potential toggle does. Wording depends on 331 (what it does with a
  noise bonus). After 331: "Include real set bonuses in the ranking" is roughly
  right; write it plainly, review against the plain-English rules, attach via
  tippy.js (already a dep; match native tooltip idiom).

## Work item 3 — 327 + 328 (CSS + controls): READY, independent of the 4pc work

These do NOT depend on 331. They are the clean wins. The diagnosis and the
native-styling fixes were produced by sub-agents whose reports are GONE — the
facts are captured here so you don't re-research. Owner direction: **match
wowsims' native styling presumptively; verify by direct browser observation
below 768px** (the browser pane's `resize_window` WORKS this session — earlier
"inert" claims no longer hold; drive `http://localhost:5173/tbc/paladin/retribution/`,
Upgrades tab, at 375/653/767 + a desktop width).

### 327 — results table illegible below 768px (root cause found)
The entire failure is the mobile table block
`vendor/tbc-new-fork/ui/scss/core/components/individual_sim_ui/_upgrades_tab.scss`
`@include media-breakpoint-down(md)` (~lines 528-589). Root cause: `table-layout:
fixed` with fixed-**rem** column widths that assume a 16px root font, while the
fork's root font is **14px** — every column ~12.5% too narrow, and they were
already too tight. Symptoms: Slot column ("Shoulder"→"Sho/uld/er"), DPS column
("+63.8 DPS"→3 lines), 112px row heights (Source zone+boss wraps to 6 lines and
sets the row height), header "R/a/n/k". No actual clipping — "disappears" is the
perceptual result. Desktop (`up(md)`, `table-layout:auto` + `white-space:nowrap`)
is fine.
**Fix (native precedent):** drop `table-layout:fixed` and the per-`nth-child` rem
widths below `md`; let columns size to content like the only native table
(`_stat_weights_action.scss`: `--table-cell-padding` 0.5rem uniform, zebra via
`--bs-table-row-even-bg`/`--bs-table-row-odd-bg`, numeric right-aligned). DPS
cell `white-space:nowrap; text-align:right` at ALL widths. Owner's chosen
fallback if content is still too wide on a phone: **horizontal scroll inside an
`overflow-x:auto` wrapper** — never shatter or clip.

### 328 — controls + TMB export off native style (native fixes found)
- **TMB "Copy JSON" button looks disabled**: it's `btn btn-outline-secondary`
  (grey on transparent, no icon). Native export/import buttons are **filled
  `btn btn-secondary`** + a leading icon (`<i class="fa fa-copy me-1">`). Change to
  that.
- **TMB blurb** (owner picked): replace the current "clankerbrain" caveat with
  **"A ranked item-priority list for import into ThatsMyBis."** i18n key
  `upgrades_tab.export.caveat` in `vendor/tbc-new-fork/assets/locales/en/translation.json`
  (currently ~line 891); rendered `upgrades_tab.tsx:694`.
- **Checkboxes "too big"**: they are already the native 28px default — NOT
  oversized. The fix is to render "Set potential"/"BiS only" as native
  `BooleanPicker` (`inline:true`) components (as the run-settings toggles do)
  instead of hand-rolled `<label><input class="form-check-input">`, so they get
  native `.form-check` layout. Keep 28px.
- **"Content" dropdown "too big"**: it's `form-select form-select-sm` (12.25px) +
  a 40px min-height floor, while the native phase selector beside it is plain
  `form-select` at 10.5px. Match the phase selector: `form-select` at
  content-font-size (or render via `EnumPicker`), drop the 40px floor.

### 329 — the layout gate must assert LEGIBILITY (not just structure)
`vendor/tbc-new-fork/test-layout.mjs` passed the illegible table because it
asserts structure (viewport overflow, grid-column, sticky) not readable cells.
Add DOM-geometry assertions below 768 (375/653/767): no results cell wraps a
short single word to multiple lines (row height ≤ ~2 line-heights, or cell text
height ≈ one line for known-short tokens), no clipped text, sane row spacing.
Same raw-CDP mechanism the gate already uses. See tickets 325 (gate wired into no
automated run) and 326 (assertion #5 width-parity escape hatch) — fold in or
keep separate as you judge.

## The drift cycle (for any `packages/core/src` change with a fork twin — 331)

`view.ts` has a ported twin, so 331 triggers it. Read
`docs/agents/known-traps.md` § "Before editing a ported engine file". Order:
1. `npx vitest run packages/core/test/wowsims-fork-parity.test.ts` green first.
2. Make the core edit + the identical fork-twin edit (Edit tool, never sed).
3. Update the sha256 row for `view.ts` (and any other touched twin) in
   `vendor/tbc-new-fork/ui/core/components/individual_sim_ui/upgrades/engine/PROVENANCE.md`.
4. Fork commit inside `vendor/tbc-new-fork`.
5. Move `data/wowsims-fork.lock.json` `commit` to the new fork tip; run
   `pnpm sim-implemented-effects:generate`.
6. `pnpm verify` (runs the drift + parity gates).
CSS/controls fixes (327/328/329) touch fork-only, NON-ported files
(`_upgrades_tab.scss`, `upgrades_tab.tsx`, `translation.json`, `test-layout.mjs`)
— NO drift cycle, just a fork commit + re-pin.

## Orchestration guidance (you are the delegator)

- Models: workhorse = Sonnet-class for implementation; review = **Opus at effort
  medium** (Opus 4.8, NOT Opus 5 — owner instruction: any Opus subagent is 4.8
  `claude-opus-4-8`); design/plan = Fable. See `docs/agents/model-policy.md`.
- The 4pc fix (331) has real design calls (floor location, ADR-0024) — worth a
  fresh stage-gate with a NEW plan, OR a plan-then-execute if you judge it small
  enough now that the rule is settled. Do NOT resume the superseded plan.
- CSS/controls (327/328/329) are mechanical given the fixes above — a single
  fork worker, sequential (they share the fork's one index; do NOT run parallel
  writers on the fork tree without worktree isolation).
- The browser pane's `resize_window` WORKS this session — verify CSS by direct
  observation below 768, don't assert.
- After the batch: `pre-merge-review` (round 6, chain from fork `bc7925362` /
  main HEAD), then ASK before `pnpm merge-to-dev`. Never merge without a separate
  explicit ask after the owner sees the review.

## Sequencing (owner's call: 331 was to go first, but it's now small)

The owner earlier said sequence 331 first, but that was when 331 was the big
sum-increments plan. Now 331 is small and CSS is independent. Reasonable order:
(a) CSS/controls 327/328/329 first as the clean visible wins, or (b) 331 first as
the owner originally wanted. Confirm with the owner which they'd rather see land
first; do not assume.

## Files to read first (in order)
1. This handoff.
2. `.scratch/carry-forward/issues/331-...md` (has the full reframing).
3. `docs/adr/0024-...md` (the decision 331 must reconcile with).
4. `docs/agents/known-traps.md` (drift cycle, cwd-persists, Node 22).
5. `.scratch/set-bonus-value/README-set-bonus-truth.md` — ONLY if you need the
   proof behind "negative = noise"; the rule itself is settled, don't re-derive.

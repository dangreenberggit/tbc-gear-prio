# Handoff — session 3: implement ticket 438 (Sources popup + Sim-sets disclosure)

Written 2026-09-19 by the orchestrator running the two final tab-arc sessions
back-to-back. **This is the SECOND of two.** Session 2 (the visual+a11y reviewer)
runs first and must land before this one, because this session uses the
`gate-visual` seat session 2 builds — and `gate-visual` registers only at session
start, so **this session must be a FRESH session** (a new stage-gate run started
after session 2's commits exist on disk).

## Why this is a separate, fresh session

- `gate-visual` (the per-unit visual+a11y judging seat) registers at session start
  only. Session 2 creates `.claude/agents/gate-visual.md`. A session that started
  before that file existed cannot spawn it. So this session starts fresh, after
  session 2's process-file commit.
- The owner chose "run 2→3 back-to-back" with ONE report at the end and NO owner
  checkpoint between them. "Back-to-back" governs owner interruptions, not the
  session boundary — the fresh session is a mechanical requirement, not a new ask.

## What session 3 builds

Ticket 438 is `Status: claimed` — the DESIGN exploration is done and BOTH design
questions are **owner-confirmed (2026-09-19)**. See
`.scratch/handoffs/438-sources-sim-sets-design-HANDOFF.md`:

- **Q1 — Sources filter → native "Sources…" popup.** Replace the flat checkbox
  pile (`.upgrades-source-filter-group content-block`, `upgrades_tab.tsx:795-800`)
  with a `btn` "Sources…" opening a `BaseModal` of grouped checkboxes (Raids
  section + Other-sources section, 2-col grid), plus a one-line summary under the
  button ("N of M sources excluded"). Borrow the native
  `ui/core/components/gear_picker/filters_menu.tsx` idiom (`menu-section`s +
  `_filters_menu.scss:41-48` 2-col grid + `base_modal.tsx`). Near-zero net-new CSS.
  This is the exact control wowsims uses to filter items by source. Removes the
  ~473px checkbox stack ticket 321 fought.
  - Owner note on the re-exploration: a multi-select DROPDOWN was prototyped and
    REJECTED (it surfaced EXCLUSIONS not inclusions — unintuitive — and the chip
    rail crowds). The popup is the direction. Do not revive the dropdown.

- **Q2 — Sim-sets → "Other phases (n)" disclosure.** Keep the current chips for
  `set.phase === sim.getPhase()` and ALL saved sets always shown; put the rest
  behind a `button[aria-expanded]` + collapse class (the tab's own disclosure
  idiom, `upgrades_tab.tsx:704-711`). A selected off-phase chip stays visible by
  construction (no badge needed). Anchor: `setsGroupRef` at
  `upgrades_tab.tsx:816-822`; chip render loop `1958-2024`; default selection
  keys off `sim.getPhase()` already (ticket 433, `defaultGuaranteedSetKeys`).
  - Owner rejected the runner-up (native phase tabs) because the tab already has a
    phase selector (`upgrades_tab.tsx:774`) — a second phase-tab row duplicates it.

**Ticket 437 does NOT ride along — it is already CLOSED** (fixed round 3, on this
branch). Do not reopen it. The design handoff's older text mentioning "437 can
ride along" predates the round-3 arc that closed it.

## First moves for the fresh session

1. **File the implementation tickets.** 438 says explicitly: "the chosen designs
   get their own implementation tickets/plan. This ticket is the EXPLORATION;
   implementation is downstream." So file one impl ticket for Q1 and one for Q2
   (from `NEXT` — session 2 may have advanced it past 444 for a11y-baseline
   tickets; read `.scratch/carry-forward/issues/NEXT` fresh, do not assume). Each
   `Related: 438`. Then close/keep 438 per its own terms (it's the exploration;
   the picks are recorded in the design handoff).
2. **Run the stage-gate skill** for the implementation (planner Fable → reviewer
   Opus → executor Opus). The plan's rendering steps MUST carry
   `Visual acceptance:` blocks (the format session 2 added to
   `.claude/skills/stage-gate/plan-template.md`) — read that template fresh; both
   Q1 and Q2 change what the tab renders, so both get visual acceptance and the
   executor runs `pnpm tab-review` + spawns `gate-visual` per unit before re-pin.
   This is the FIRST real use of the reviewer session 2 built — it is the point.
3. Fork work on `vendor/tbc-new-fork` branch `feat/upgrades-tab`; re-pin per
   `docs/agents/upstream-catch-up.md` §5 / known-traps. Everything lands on
   `feat/tab-signoff-followups` (same held branch — whole arc merges as one unit,
   owner decision 2026-09-19). Do NOT merge to dev.

## Base state at handoff (fill in from session 2's report)

- Branch: `feat/tab-signoff-followups`. Base for session 3 = session 2's tip
  (SEE session 2 execution report / decision-log for the exact SHA;
  `.scratch/stage-gate/visual-a11y-reviewer/`).
- Fork tip after session 2's re-pin: SEE the lock `data/wowsims-fork.lock.json`
  `commit` field, read fresh.
- `pnpm verify` was rc=0 on session 2's tip (confirm fresh before starting).
- Session 2's `gate-visual` seat + `Visual acceptance:` template are the tools
  this session consumes.

## Constraints (same as every tab session)

- Never `cd` into the fork; `git -C`, `npm --prefix`, subprocess cwd. Node 22 pin
  `C:\Users\dgree\AppData\Roaming\fnm\node-versions\v22.17.1\installation`.
- Borrow-native: the whole point of Q1 is matching the real wowsims filter idiom.
  Read `filters_menu.tsx`/`base_modal.tsx` before writing; do not invent CSS.
- Desktop-gate :3333 stray `wowsimtbc.exe` (ticket 434) — flag, don't kill.
- Merge is owner-HELD. After session 3's pre-merge-review, STOP and report the
  whole two-session arc; the owner gives a separate merge ask.
- The tab runs on :5173 (vite) in this env, which does not serve the sim worker —
  the Go backend on :3333 (`preview_start` name `wowsims-backend`) is needed to
  actually Run and see post-run states. `gate-visual`'s capture harness serves its
  own built dist and needs neither port (per session 2's known-traps line).

## The end state the owner is waiting for

Both controls rebuilt to the confirmed native idioms, visual-reviewed by the new
seat, re-pinned, pre-merge-reviewed. Then the ENTIRE `feat/tab-signoff-followups`
arc (the round-1/2/3 work already reviewed + session 2's reviewer + session 3's
438 impl) is one merge-ready unit awaiting the owner's merge ask.

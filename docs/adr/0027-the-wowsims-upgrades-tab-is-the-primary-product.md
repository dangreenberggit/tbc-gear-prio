# ADR-0027 — The wowsims Upgrades tab is the primary product; the standalone web shell is secondary

**Status:** accepted
**Date:** 2026-08-22
**Amends:** PLAN.md §12 and §14 Stage 3 — the standalone shell stays a deliverable but is no longer the main line
**Related:** [`docs/plans/wowsims-tab/plan.md`](../plans/wowsims-tab/plan.md), ticket `.scratch/carry-forward/issues/267-wcl-gear-source-goes-live.md`

## Context

Two front ends exist for one engine:

- The **standalone web shell** (PLAN.md §12, §14 Stage 3): our own server and
  page, sims run server-side through `wowsimcli`, gear read from Warcraft
  Logs. Built on `phase-3/web-shell` on 2026-08-22; five of six Stage 3 gate
  boxes closed; the sixth ("type a character") waits on a live Warcraft Logs
  source (ticket 267).
- The **Upgrades tab** inside a personal fork of the wowsims TBC site
  (`docs/plans/wowsims-tab/plan.md`): sims run in the visitor's browser on the
  site's own simulator, gear comes from the page. Slices 1–6 were built in
  August 2026; the fork pin is behind the engine pin (ticket 251).

The tab plan says the two "neither replace nor depend on" each other
(`plan.md:611-613`). No document said which one is the product. The owner's
recollection of having decided this was checked on 2026-08-22 (grep over
PLAN.md, `docs/`, `.scratch/`, git log): nothing written states a preference,
and the tab work calls itself a "detour" throughout `.scratch/handoffs/wowsims-tab/`.

## Decision

The owner decided on 2026-08-22, in chat: **focus on the wowsims tab, not an
independent app.** Recorded here so it stops being carried in memory.

Consequences:

1. The Upgrades tab is the primary product. Engine work is judged first by
   whether it serves the tab.
2. The standalone shell is secondary. It merges as built (it is reviewed and
   green) and stays as the server-side demo and the CLI's sibling, but no
   further Stage 3 work is scheduled.
3. Ticket 267 (live Warcraft Logs gear source) is **not on the critical
   path**. It is critical only for the standalone shell and at most an
   optional later feature for the tab, which reads gear off the page
   (`plan.md:125-127`). It keeps `Blocks: phase-3` because Stage 3's first
   gate box is genuinely open; merging `phase-3/web-shell` therefore uses
   `--ack-open-blockers` with this ADR as the reason.
4. PLAN.md §14's "no stage starts until the previous gate is written" still
   binds the standalone track: Stage 4 (deploy) does not start while box 1 is
   open. That is acceptable because Stage 4 is not on the tab's path either.

## What this does not decide

- Whether the engine copy in the fork (tab plan D3) is ever replaced by
  consuming `packages/core` as a package — `plan.md:196-199` leaves that to a
  later slice.
- Whether the standalone shell is eventually deleted. Revisit once the tab
  ships.

## How to verify the premise

`grep -rn -i "detour" .scratch/handoffs/wowsims-tab/ | head` shows the tab's
self-description; `grep -n "separate deliverable" docs/plans/wowsims-tab/plan.md`
shows the no-dependency line; `git log --oneline -3 dev..phase-3/web-shell`
shows the shell's state at the time of this decision.

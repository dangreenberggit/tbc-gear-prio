Status: open
Type: feature
Origin: Stage 3 web-shell plan (`.scratch/stage-gate/stage-3-web-shell/plan.md`, Q1), 2026-08-22
Blocks: phase-3
Blocked by: none

# Go live on `GearSource`: read a real character from Warcraft Logs

## Problem

The Stage 3 web shell is offline-first. `/c/$region/$realm/$name` resolves
exactly three recorded characters — slamaltman, shredzepelin and nexess, all
`US/dreamscythe` — from committed `test/fixtures/*.raw.json`, and answers
anything else with `404 not a recorded character (offline build)`. So the
first §14 Stage 3 gate box, **"type a character, wait, trust the top
recommendation"**, is still ☐: a stranger cannot type their own name.

Everything downstream of the gear read already works against the live
binary. What is missing is only the adapter that turns a character name
into `LoggedGear`.

PLAN.md L898 scopes this out of Stage 3 deliberately: it "needs its own real
planning pass before Stage 3 closes — not scoped here". This ticket is that
pass's placeholder.

## The credential exists

`WCL_CLIENT_ID` and `WCL_CLIENT_SECRET` are present in the main checkout's
`.env` (names only — the values were never read). `.env` is gitignored
(`.gitignore:2`), which is why it is absent from any fresh worktree. Verify
with `grep -o '^[A-Z_]*=' .env` from the repo root; do not print values.

So this work is not blocked on credentials, and the Stage 3 plan did not
choose offline-first because none existed. It chose offline-first on size:
this adapter is roughly 12 steps and 8 new files against a live API that
fixtures cannot verify, versus 17 steps for the whole rest of the shell.

## What to do

The sizing that Stage 3's Q1 produced, as a starting checklist rather than a
finished design:

1. OAuth2 client-credentials flow with token reuse.
2. A GraphQL client with retry/backoff and `rateLimitData` accounting.
3. `findFights` via `Character.encounterRankings` with `includeCombatantInfo`.
4. The `report.events(CombatantInfo)` fallback route, for characters with
   kills but no `encounterRankings` — slamaltman is exactly this case and the
   recorded fixture for it already exists.
5. `readGear` normalisation, including `talents[].id → talentPointsByTree`
   (PLAN.md §12 R18) and the gem/enchant mapping.
6. `salvationUptime` from per-player buff uptimes — feral needs it to tell a
   cat fight from a backup-tank fight (ticket 06).
7. A `RECORD_FIXTURES=1` recorder, so a live resolve can be frozen into the
   same fixture shape the offline path replays.
8. `CachingGearSource` wiring — this closes ticket 78's other half, which is
   re-blocked to this ticket. Its docstring calls the gear cache "the primary
   defence of the WCL point budget".
9. A fight-list TTL.
10. A per-IP rate limit on the web shell's character route.
11. A fixture-versus-live contract test, so a schema change upstream fails
    loudly rather than silently returning thinner gear.
12. Ticket 32's point-budget instrument.

Then swap the composition in `apps/web/server/wiring.ts`. The server takes
its `GearSource` through `Deps`, so nothing else in the shell has to change,
and the offline path should stay as the test and demo route rather than
being deleted.

## Done when

- A character nobody recorded resolves from live WCL and ranks end to end.
- PLAN.md §14 Stage 3's first gate box is ☑ in `docs/verification-log.md`.
- Ticket 78 is closed or re-scoped, and ticket 32's instrument exists.

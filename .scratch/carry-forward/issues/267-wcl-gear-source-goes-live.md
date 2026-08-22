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

## Priority (2026-08-22, owner)

The wowsims Upgrades tab is the primary product (ADR-0027). This ticket is
critical only for the standalone web shell, which is now secondary. Nothing
else waits on it. Do it when the standalone shell matters again.

## The interface you are implementing

`GearSource` is two methods (PLAN.md:346-349, mirrored at
`packages/core/src/seams/gear-source.ts:62-65`):

    findFights(c: CharacterRef, spec: SpecId): Promise<FightSummary[]>
    readGear(f: FightRef): Promise<LoggedGear>

Endpoints, confirmed live at Stage 0 (PLAN.md:359-363): token at
`https://www.warcraftlogs.com/oauth/token` (shared, not classic-specific),
GraphQL at `https://classic.warcraftlogs.com/api/v2/client`.

**Two traps that PLAN.md §5.2 settled, both silent if you miss them.**
`CombatantInfo.talents[].id` is *points spent in that tree*, not a talent id
(PLAN.md:365-367, R18 at :379). `CombatantInfo.specID` is `0` for every
combatant in our fixtures, including a confirmed Ret — never branch on it
(PLAN.md:369). Upstream's `raid_wcl_importer.tsx` reads `talents[].guid`
and hits the first trap silently, so read it, do not port it (PLAN.md:381).

`salvationUptime` is **optional** on `FightSummary` (`gear-source.ts:27`). A
source that omits it degrades to "never measured" rather than a false zero,
but the feral off-tank flag stays silent until it is wired (PLAN.md:898). The
fight it disambiguates is
`.scratch/phase-2/issues/06-shredzepelin-gear-incorrect.md` (closed).

The three committed fixtures under `test/fixtures/` are the current contract
shape for `LoggedGear`; the contract test in step 11 compares live against
them. Unverified: whether they cover every field a live response returns.

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
7. A `RECORD_FIXTURES=1` recorder (PLAN.md:383; env slot at PLAN.md:795), so
   a live resolve can be frozen into the same fixture shape the offline path
   replays and tests stay offline.
8. `CachingGearSource` wiring — this closes ticket 78's other half, which is
   re-blocked to this ticket. Its docstring calls the gear cache "the primary
   defence of the WCL point budget".
9. A short TTL on the **fight-list query specifically** — gear snapshots are
   immutable and cache permanently, fight lists cannot (PLAN.md:748).
10. A per-IP rate limit on the web shell's character route. Steps 9 and 10
    are **not optional before any public form ships** (PLAN.md:748,
    `.scratch/stage-gate/stage-3-web-shell/brief.md` Constraints): `/c/…`
    fires a live query for anyone who types any name, and commercial use of
    the WCL API needs prior approval.
11. A fixture-versus-live contract test, so a schema change upstream fails
    loudly rather than silently returning thinner gear.
12. Ticket 32's point-budget instrument.

Then swap the composition at `apps/web/server/wiring.ts:83`, inside
`createDeps` (`:55`), where `gear: new RecordedGearSource(gearData)` is the
only gear source ever constructed. The route side goes through
`createCharacterResolver` (`apps/web/server/characters.ts:37`), which takes a
`gearSourceFor(ref, spec)` function — so nothing else in the shell changes.
Keep the offline path as the test and demo route rather than deleting it.
(Line numbers as of tip `cd91498`; re-check with `grep -n RecordedGearSource
apps/web/server/wiring.ts`.)

## Done when

- A character nobody recorded resolves from live WCL and ranks end to end.
- PLAN.md §14 Stage 3's first gate box — "type a character, wait, trust the
  top recommendation" — is ☑ in `docs/verification-log.md`. Match the
  evidence style of the existing Stage 3 entry
  (`docs/verification-log.md:1716-1746`): the exact command run, the
  character resolved, and the observed output — not an assertion that it
  works.
- Ticket 78 is closed (it is, at `cd2becb`; its `CachingGearSource` half
  lives here), and ticket 32's instrument exists.

## Not needed by the wowsims tab

The tab's `PlayerGearSource` reads gear off the page — `findFights` returns
one synthetic "current gear on this page" entry and `readGear` maps
`player.getGear()` (`docs/plans/wowsims-tab/plan.md:125-127`). Its core loop
needs no WCL source. Its optional import slice is **report-URL-first**;
character-first discovery, which is what this ticket builds, is explicitly
deferred there (`plan.md:447-451`). So this ticket is critical for the
standalone app and at most an optional later feature for the tab.

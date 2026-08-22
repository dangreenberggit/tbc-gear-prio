# Brief — Stage 3, the web shell

Opened 2026-08-22. Base SHA `8a1c01af1f6c4dca6dd905cf3c46ff4d228d2d61`, branch
`phase-3/web-shell` off `dev` (tooling still says `phase-N/`; docs say Stage N).

## Goal

Ship PLAN.md §14 **Stage 3 — Web shell** as §12 specifies it, so that every
Stage 3 gate box can be closed with evidence in `docs/verification-log.md`:

> ☐ type a character, wait, trust the top recommendation
> ☐ feels calm during multi-minute work
> ☐ zero layout shift during a run
> ☐ filters and pins re-render without a network round trip
> ☐ the pin control is hidden, not inert, where no curated set exists (§4.1)
> ☐ every Stage 1 CLI check still passes unchanged against the same core

Stage 2's eight boxes are all ☑ (verification-log entry 2026-08-22). Stage 3
is unstarted: `apps/` is declared in `pnpm-workspace.yaml` and empty; the root
`package.json` has no web or server dependency; nothing serves `/api/jobs`.

## What exists to build on (verified on this tip)

- `rankUpgrades(input, deps, onProgress?)` — `packages/core/src/rank.ts:554`.
  The `onProgress` callback is the natural job-progress feed.
- `applyView(ranking, ViewOptions)` — `packages/core/src/view.ts:314`, pure,
  not in `contentHash` (ADR-0019). The CLI already exercises every option.
- Three seams, each with adapters: `Store` (`MemoryStore`, **`SqliteStore`**
  at `seams/store.ts:142`), `SimRunner` (`CliSimRunner`, `RecordedSimRunner`),
  `GearSource` (`RecordedGearSource`, **`CachingGearSource`** at
  `seams/gear-source.ts:102`). **No `WclGearSource` exists.** `SqliteStore`
  and `CachingGearSource` are tested but nothing constructs them (ticket 78,
  `Blocks: phase-3`).
- The CLI (`packages/core/src/cli.ts`) is the reference wiring: flags at
  `cli.ts:83`; it builds `CliSimRunner` + `RecordedGearSource` + `MemoryStore`,
  loads the per-spec skeleton from disk, calls `rankUpgrades`, then
  `applyView`, then `disclosure.ts` / `rank-report.ts`.
- Committed character recordings at repo-root `test/fixtures/` (not
  `packages/core/test/fixtures/`): `slamaltman.raw.json`,
  `shredzepelin-cat.raw.json`, `nexess.raw.json`, plus `*.raid-sim-result.json`
  for slamaltman and shredzepelin-cat. `git ls-files test/fixtures` lists them.
- `CapState` (`caps.ts`), `plausibilityWarnings` (`plausibility.ts`),
  `contentHash` (`content-hash.ts`).
- **Not implemented:** `IndividualSimSettings` export, the wowsims share-link
  codec (zlib+base64 after `#`), any rate limiting or fight-list TTL (§12 R9).

Do not trust the above blindly — the planner re-verifies what its plan leans on.

## Scope

In scope (§12, §14 Stage 3):

- Three routes: `/`, `/c/$region/$realm/$name`, `/run/$id`.
- `POST /api/jobs` (dedupe on `contentHash`, attach to a running job),
  `GET /api/jobs/:id`, in-process worker, honest progress derived from real
  counts, TanStack Query polling while `queued|running`.
- Skeleton-then-fill results, no re-sort during a run, one animated re-sort at
  completion, assumptions drawer, cutoff rows behind an expand, hit-cap banner
  with `hitDriven` row marks, wowsims attribution + pinned sim version footer.
- View controls over `applyView`: raid, boss, slot grouping, owned (greyed,
  never dropped), pin BiS (hidden where no curated set). Rank stays absolute.
  Cutoff absolute (ADR-0020). Confirm TMB's actual control labels before
  building the filter UI — §12 says its table is unconfirmed.
- Exports: `IndividualSimSettings` JSON download and wowsims share link.
  Ticket 72 (`Blocks: phase-3`) asks that the **import** direction share one
  codec with this export; its Stage 1 (`--sim-settings <path>` lift) is the
  minimum that satisfies the blocker — decide it or re-block it with a reason.
- Ticket 78 (`Blocks: phase-3`): wire `SqliteStore` / `CachingGearSource` into
  a real call site, or remove them, with the reason recorded.
- Closing the gate boxes in `docs/verification-log.md` and PLAN.md §14.

Out of scope:

- Stage 4 deploy (container, Hetzner, concurrency caps, queue backpressure).
- The `docs/plans/wowsims-tab/` detour (a tab inside a wowsims fork). It says
  of itself "No PLAN.md stage gate is touched"; it is not Stage 3.
- Re-opening settled product questions: role relevance (234, wontfix),
  combat-model internals (upstream's, ticket 258 rule), Ahune ids (108).
- Visual polish beyond §12's restraint rules.

## Open questions

Each carries candidates that differ in kind, the result that would make each
win written before measuring, and the measurement or why fixtures cannot
give one. A dropped candidate carries a reason.

### Q1. Does Stage 3 go live on `GearSource`, or ship offline-first?

PLAN.md §14 says going live "needs its own real planning pass before Stage 3
closes — not scoped here", and the first gate box ("type a character") reads
as live. Nothing in the repo fetches from WCL today.

- **A — offline-first shell, live source as a named follow-up.** The shell runs
  end to end over `RecordedGearSource` + `CliSimRunner` for the committed
  characters; `WclGearSource`, the fight-list TTL and per-IP rate limit (§12
  R9) become a separately planned ticket that `Blocks: phase-3` so the stage
  cannot close without it. Wins if the six gate boxes can each be evidenced on
  recorded characters, and the owner accepts that "type a character" is
  closed by the live follow-up, not this plan.
- **B — build `WclGearSource` in this plan.** Wins if §5.2's spec plus the
  recorded fixtures' shape make the adapter a bounded step (the planner must
  show the fixture-vs-live contract, `salvationUptime` handling, point-budget
  defence via `CachingGearSource`, and R9's TTL + rate limit) without making
  the plan too large for one executor.
- **Measured by:** the planner's sizing — count of files and steps for B's
  adapter against the rest of the plan, and whether a WCL credential is even
  available in this environment (`WCL_CLIENT_ID` in `.env`, §13). If no
  credential, B cannot be verified here and A wins by default.

### Q2. Server and UI stack

§12 names TanStack Query and an in-process worker, not the framework. §13
says Node 22, TypeScript, Windows dev / Linux deploy.

- **A — one Node server app (`apps/web`) that serves the API and a React SPA.**
  Wins if the three routes and job polling fit in one process with the CLI's
  exact wiring reused, and `pnpm verify` (typecheck/lint/format/test) extends
  to it without new gates.
- **B — a full-stack framework with file routes (TanStack Start / Remix /
  Next).** Wins only if it removes more code than it adds for three routes
  and a poll endpoint. The planner states the dependency count for each.
- **Measured by:** dependency count added, lines of glue outside
  `packages/core`, and whether the CLI's `rankUpgrades` wiring is shared
  rather than copied. Cannot be measured by fixtures; measured by the plan's
  Paths manifest.

### Q3. Export and share link — does ticket 72's import ride along?

- **A — export only now; 72 re-blocked to a later phase with a reason.** Wins
  if the share-link encode half needs no `IndividualSimSettings` →
  `RaidSimRequest` lift (the export is the *other* direction).
- **B — export plus 72 Stage 1 (`--sim-settings` lift, APL merge).** Wins if
  both directions really share a codec so building one without the other
  duplicates it — the planner names the shared functions.
- **Measured by:** `wowsimcli decodelink` round-trip on a produced link (the
  binary path and digest are in
  `.scratch/stage-gate/stage-2-close-shortlist-box/binary-provenance.md`), and
  a diff of the encode vs decode code paths in the plan.

### Q4. Persistence — `SqliteStore` in or out (ticket 78)?

- **A — wire `SqliteStore` behind `DATABASE_URL` (§13), `MemoryStore` in
  tests.** Wins if the job table + cache survive a server restart and ticket
  31's job-id race is either fixed or shown not to affect this shell.
- **B — `MemoryStore` only for Stage 3; delete or re-block 78.** Wins if §14
  Stage 4 ("caches survive restart") is the first gate that needs it and
  nothing in Stage 3's six boxes does.
- **Measured by:** the Stage 3 gate list — which box, if any, fails on
  `MemoryStore`. Named, not guessed.

## What done means

`apps/web` (or the chosen layout) exists, `pnpm verify` is green on the tip
and covers it, and the Stage 3 gate line in PLAN.md §14 matches a dated
`docs/verification-log.md` entry that closes each box with a re-runnable
command or records, per box, why it stays open (the same honesty precedent as
Stage 0's ☒ `race` box). Tickets 72 and 78 are closed or re-blocked with
reasons. Every Stage 1 CLI check passes unchanged. Findings that do not block
are carry-forward tickets. No merge to `dev`.

## Constraints

- Three seams only (`GearSource`, `SimRunner`, `Store`). A fourth port needs
  agreement first. Tests at the `rankUpgrades` interface through recorded
  adapters; no assertions on stage internals; pure functions unit-tested.
- Durable-claims rule: every causal claim in a committed artifact points at a
  re-runnable command or says **hypothesis** / **untested**. A property
  measured against one option is not a comparison.
- `ViewOptions` never enter `contentHash` or trigger a sim (Stage 2 gate,
  ADR-0019).
- Never derive a TypeScript type from a JSON import.
- Platform-safe paths and spawns from the first line (§13).
- The executor may fan out with `parallel-phase`; the plan's Paths manifest
  then carries a Partition with no path in two slices.
- Commit per green slice. Do not merge to `dev`; `pre-merge-review` runs
  after, then the user is asked.
- Fight-list query and any live WCL call, if built, must carry a TTL and
  per-IP rate limit before any public form (§12 R9) — not optional.

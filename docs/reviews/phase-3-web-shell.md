# Pre-merge review — phase-3/web-shell

Reviewed range: `8a1c01af1f6c4dca6dd905cf3c46ff4d228d2d61..6ef098cf9062691aed0538741c98016e5cc261de`

Dispatch: four fresh Opus subagents (adversarial, domain, standards, spec),
one parallel batch, each told it writes nothing; `codex` not on `PATH`. Fixes
landed after dispatch in `6d917f5..46df87b` (six commits); the next round
chains from the recorded `<through-sha>` above so those commits fall inside
a reviewed window.

What the branch is: PLAN.md §14 Stage 3, planned and executed through the
stage-gate pipeline (`.scratch/stage-gate/stage-3-web-shell/`). `apps/web` is a
`node:http` server plus a Vite React SPA over the CLI's own offline wiring;
core gained `cli-wiring.ts`, `set-potential.ts`, `share-link.ts`,
`individual-settings.ts` and a `candidates` progress field. Five of six Stage 3
gate boxes close; box 1 ("type a character") stays open on ticket 263.

## Adversarial

- **A1 (high)** `apps/web/server/jobs.ts` — the `submitKey → jobId` map was
  kept after a run settled, so a later resubmit attached to a finished job.
  §12 says "attaches to a _running_ job"; cross-run dedupe is already the
  `contentHash` ranking cache. **Fixed** `6d917f5`: key deleted on every
  settle; `SyntheticSimRunner.hold()`/`open()` makes the in-flight window a
  controlled state; two tests (attach during a held run; new id after `done`).
- **A2 (high)** `jobs.ts` — `contentHash` was set before the `complete` check,
  so an `incomplete` job published a hash indistinguishable from a full run's.
  **Fixed** `6d917f5`: set only when `ranking.complete`.
- **A3 (medium)** `apps/web/server/equipment.ts` was a byte-identical copy of
  `logged-gear.ts:10-22`. **Fixed** `6d917f5`: core index now exports
  `equipmentFromLoggedGear`, `socketedItemsFromLoggedGear`, `gemContext`,
  `equipmentForCandidateSwap`; the copy is deleted.
- **A4 (medium)** `seams/store.ts:7` imports `node:sqlite` at module scope, so
  `DATABASE_URL` gates persistence, not the Node 22 floor. Ticket 264 owns the
  `engines` field. **Fixed** (docstring) `46df87b`.
- **A5 (medium)** the pin-BiS pair in `jobs.test.ts` recomputes the expected
  value the way the code does, so it catches wiring breaks, not meaning bugs.
  **Wontfix** — `pinBisAvailable`'s meaning is tested in core (`view-gate`);
  the server test's job is exactly the wiring, and the verification log says
  box 5's absent case rests on test data.
- **A6 (low)** `readJsonBody` streamed unbounded. **Fixed** `b940bc3`: 64 KiB
  cap, 413 JSON (`req.pause()`, not `destroy()` — destroying the socket ate
  the response).
- Checked sound: `matchPath` segment counts, API 404 before SPA fallback,
  `safeJoin` traversal guard, `mergeRows`/`finalOrder` arrival order with the
  `itemId|slot|slotChoice` key, dense `equipment.items`, `CURRENT_API_VERSION`
  from the proto option, the 30 s vitest timeout hiding no hang. On the
  verification-log entry: "I found no claim in it the code cannot support."

## Domain

- **D1 (major)** `apps/web/server/exports.ts` equipped a `?item=` candidate as
  `{ id }` — no gems, no enchant, no meta repair — so the share link did not
  open what the app measured, against the module's own header. **Fixed**
  `5bcb597`: `withCandidate` now calls the ranker's `equipmentForCandidateSwap`
  with a `gemContext` built from the same three inputs `rankUpgrades` uses;
  verified on slamaltman ret-p2 (head candidate carries enchant 3003, sockets
  filled, meta seated). Test asserts gems and enchant survive the decode.
- **D2 (minor)** the hit-cap banner dropped `assumedRace` and
  `talentHitAssumed`, the two fields verification-log R8 says the banner exists
  to carry. **Fixed** `fd815c3` together with Sp8 below.
- **D3 (minor)** = A3. **Fixed**.
- Unverified, recorded: the feral share-link base path
  `https://www.wowsims.com/tbc/druid/feral/` is exercised by no test and
  corroborated by nothing offline (the ret path is, via the Stage 1 log entry).
  Left as-is; the URL is a one-string change if wrong.
- Checked correct: `apiVersion` 13 read from the pinned fork's own proto
  option; `UI_SLOT_ORDER` equals `SIM_ORDER`; `maxPhase` from the lock; rank
  printed absolute; cutoff untouched by any view; `hideOwned` never set by the
  UI (§8.3.3 holds).

## Standards + Spec

### Standards

- **S1 (hard)** three 73-column lines in one commit body ("Record the Stage 3
  gate and close five of six boxes"). **Wontfix** — rewriting history on a
  shared branch costs more than one column.
- **S2 (hard)** `void clock();` at `jobs.ts:208` silenced an unused parameter.
  **Fixed** `6d917f5`: `clock` removed from `CreateJobManagerInput` and
  `CreateApiRoutesInput`; `Store` already timestamps rows.
- **S3 (judgement)** `docs/workflow.md`'s purity section still named only
  `seams/` and `cli.ts` as exemptions; `eslint.config.js` also exempts
  `cli-wiring.ts`. **Fixed** `46df87b` (`share-link.ts` is pure and not
  exempt).
- **S4 (judgement)** `CreateDepsInput.pool` is a test-only hook on a production
  type. **Wontfix** — documented in place; the alternative (a committed
  no-BiS universe) is worse, and `Deps.pool` is core's own documented test
  injection point.
- Clean: comment policy (every added comment is a why), no type derived from a
  JSON import (`slots.ts` is a hand-written `as const` with a drift test), three
  seams only, tests at the module interface plus pure-function units, tickets
  263–265 well-formed with `NEXT` bumped in the same commit, 24 of 25 commit
  messages within the seven rules.

### Spec

- **Sp1** per-row exports existed on the server and in `api.ts` but nothing in
  `Run.tsx` reached them. **Fixed** `fe5460a`: `ResultRow` has a "wowsims"
  control on the item-level endpoints (anchor after fetch, so popup blockers
  do not eat it; only when `done`, since the endpoints 409 otherwise).
- **Sp2** box 3's CLS window excludes the fill-to-completion frame (headless
  tab is permanently `hidden`, polling pauses). **Wontfix** as a finding — the
  log entry states the limit in those words; it is disclosed, not claimed.
- **Sp3** `RowSkeleton.tsx` folded into `ResultRow.tsx`. **Wontfix**, cosmetic.
- **Sp4** = A1. **Fixed**.
- **Sp5** `share` returns `{ url, apiVersion }` where the plan said `{ url }`.
  **Wontfix**, harmless extra field.
- **Sp6** three tickets where step 15 said one. **Wontfix** — 264 and 265 are
  real findings; the step's acceptance wording was narrower than the work.
- **Sp7** the "Already have it" control greys/un-greys; §12's table describes
  a row state, not a toggle. **Defer** → ticket 266 (owner ruling).
- **Sp8** banner said "under the 142 hit cap" where §12 says "under the 9% hit
  cap". **Fixed** `fd815c3`: exported `HIT_CAP_PERCENT`; banner renders
  percent, rating, what you have, assumed race and talent, and the ± band.
- **Sp9** while running, the list shows every arrived row; at completion the
  collapse to `shortlist` folds into the single permitted re-sort. **Wontfix**
  — the cutoff is only known at completion, the plan states rowless skeletons
  leave in that same motion, and §12's objection is to reshuffling _while you
  read_, which this is not.
- **Sp10** server `mostRecent` and page `mostRecentFirst` both encode the
  most-recent rule; the server returns fights unsorted, so the page's sort is
  load-bearing. **Defer** → ticket 267 (server should own the order).
- Correct and recorded: share-link shape matches §12 L781; assumptions drawer
  carries all eight L756 items plus `standing`; rank never renumbered; footer
  attribution + `simVersion` on every page; no re-sort during a run; pin
  control absent, not disabled; PLAN.md L909 matches the log entry; ticket
  72/78 edits match step 15.

## Summary

Twenty-three findings across the four axes; **no blocker to the merge**.
Fourteen fixed in six commits, two deferred to tickets (266, 267), seven
wontfix with reasons. The one that mattered most was the domain axis's D1:
the per-item share link opened a bare item where the app had measured a
gemmed, enchanted, meta-repaired one — fixed by using the ranker's own swap
rather than re-deriving it. The adversarial axis's A1 was the executor's own
flagged deviation (dedupe outliving the run) and the spec axis independently
called it a "last week's gear" trust failure; it is reverted to in-flight
attach. Every reviewer separately noted the verification-log entry states its
own limits (box 1 open, box 3's unobserved frame, box 5 on test data) and
found no claim the code cannot support.

**Merge note:** ticket 263 (`WclGearSource` goes live) carries `Blocks:
phase-3` on purpose — gate box 1 is genuinely open — so `pnpm merge-to-dev`
needs `--ack-open-blockers`. Tickets 74–77 also say `Blocks: phase-3` but are
all `Status: closed`.

## Disposition

| ID   | Axis        | Disposition | Ticket / note                                                                        |
| ---- | ----------- | ----------- | ------------------------------------------------------------------------------------ |
| A1   | Adversarial | fixed       | `6d917f5` — dedupe key dropped on settle; hold/open test                             |
| A2   | Adversarial | fixed       | `6d917f5` — `contentHash` only when complete                                         |
| A3   | Adversarial | fixed       | `6d917f5` — core index exports; `equipment.ts` deleted                               |
| A4   | Adversarial | fixed       | `46df87b` — docstring; floor itself is ticket 264                                    |
| A5   | Adversarial | wontfix     | wiring test by design; meaning tested in core                                        |
| A6   | Adversarial | fixed       | `b940bc3` — 64 KiB body cap, 413                                                     |
| D1   | Domain      | fixed       | `5bcb597` — `equipmentForCandidateSwap` in exports                                   |
| D2   | Domain      | fixed       | `fd815c3` — assumed race and talent in the banner                                    |
| D3   | Domain      | fixed       | = A3                                                                                 |
| S1   | Standards   | wontfix     | commit-body wrap; not rewriting shared history                                       |
| S2   | Standards   | fixed       | `6d917f5` — `clock` parameter removed                                                |
| S3   | Standards   | fixed       | `46df87b` — `docs/workflow.md` purity exemptions                                     |
| S4   | Standards   | wontfix     | documented test hook on core's own injection point                                   |
| Sp1  | Spec        | fixed       | `fe5460a` — per-row wowsims control                                                  |
| Sp2  | Spec        | wontfix     | limit is stated in the log entry                                                     |
| Sp3  | Spec        | wontfix     | cosmetic file fold                                                                   |
| Sp4  | Spec        | fixed       | = A1                                                                                 |
| Sp5  | Spec        | wontfix     | harmless extra field                                                                 |
| Sp6  | Spec        | wontfix     | extra tickets are real findings                                                      |
| Sp7  | Spec        | defer       | `.scratch/carry-forward/issues/266-already-have-it-control-semantics-are-a-guess.md` |
| Sp8  | Spec        | fixed       | `fd815c3` — percent + rating wording                                                 |
| Sp9  | Spec        | wontfix     | cutoff known only at completion; one motion                                          |
| Sp10 | Spec        | defer       | `.scratch/carry-forward/issues/267-character-api-returns-fights-unsorted.md`         |

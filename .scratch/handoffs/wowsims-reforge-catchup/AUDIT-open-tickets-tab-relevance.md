# Audit — which open tickets relate to the Upgrades tab itself

Read-only audit. Repo `C:\Users\dgree\Code\lulz\tbc-gear-prio`, `dev` at
`66ab791`. Scope: the 10 tickets opened or left open by the most recent work
(`feat/342-learn-from-upstream` and `feat/wowsims-reforge-catchup`) —
350, 351, 352, 354, 355, 357, 358, 359, 360, 361. Verified against
`.scratch/carry-forward/issues/`: 353 and 356, also in that number range, are
`Status: closed` and excluded. No ticket numbered 362+ exists yet. (This repo
also carries a much larger pre-existing backlog under
`.scratch/carry-forward/issues/` — tickets in the teens through 340s from
earlier work — which `pnpm issues:open` also lists; that backlog is out of
scope for this audit, which answers the owner's question about what the
*current* body of work left behind, not the full historical ticket count.)

The Upgrades tab (ADR-0027, primary product) lives in the gitignored fork
clone at `vendor/tbc-new-fork/ui/core/components/individual_sim_ui/upgrades/`.
This repo's `packages/core` is a separate TypeScript ranking engine (CLI,
recorded adapters, universes) that shares data/pins with the fork. "Touches a
file the tab also uses" is not the same as "is about the tab" — classified
accordingly below.

## Table

| Ticket | Bucket | One-line reason | User-visible symptom |
| --- | --- | --- | --- |
| 350 — two-hander-swap-leaves-worn-offhand | **ENGINE, affects tab** | The bug lives verbatim in both engine copies, including the tab's own `upgrades/engine/rank.ts` and `pool.ts` | A dual-wield enh/warrior/hunter row for a two-handed candidate is priced against a gear set the game cannot equip (two-hander plus the worn off-hand item still on), so the row's delta may be wrong; direction and size not yet measured |
| 351 — weapon-imbue-does-not-follow-candidate-weapon | **ENGINE, affects tab** | Same dual-copy bug; the pinned weapon stone never updates per candidate in either engine | A feral dagger or off-hand candidate row is simmed with the wrong (or a stale) weapon stone; today this happens to net out to no live asymmetry because of a separate fork-engine quirk, but the request itself is wrong |
| 352 — ticket-number-allocation-rule-contradicts-itself | PROCESS/DOCS | Two internal docs (`issue-tracker.md`, `known-traps.md`) give contradictory ticket-numbering procedures | none |
| 354 — sync-wowsims-check-misreports-drift-on-a-ref-pin | TOOLING | `scripts/sync_wowsims.py --check` misreports drift because it was written for tag pins and the engine is now pinned to a commit sha | none (developer-facing CLI warning only) |
| 355 — push-or-archive-the-fork-branch-feat-upgrades-tab | TOOLING (repo risk to the tab's own code) | The tab's entire source exists on one machine only, unpushed; several committed artifacts are derived from that single point of failure | none today; if the disk is lost the tab's source and every gate that checks against it become unrecoverable — an availability risk to future tab work, not a defect a user hits |
| 357 — build-from-source-can-leak-a-git-worktree-registration | TOOLING | Two defects in `scripts/fetch_wowsimcli.py`'s build-from-source path (leaked worktree registration; `--commit` writes an unreachable binary) | none (developer build tooling only) |
| 358 — three-stale-scope-notes-mis-state-what-their-inputs-reach | PROCESS/DOCS (one item borders ENGINE) | Three stale prose notes understate what a stale input reaches; #2 (the feral P1 EP-weights note) is the one with a real, if narrow, engine consequence — see the Upgrades-tab section below, since the tab exposes the exact control this note misdescribes | none as filed (a docs-correction ticket); the underlying exposure it documents is TAB-relevant and unfiled — see the gap section |
| 359 — agents-md-trigger-list-omits-the-new-engine-pin-trap | PROCESS/DOCS | `AGENTS.md`'s trigger list for `known-traps.md` doesn't mention "moving the engine pin" | none |
| 360 — nothing-binds-a-recorded-fixture-to-the-engine-pin | ENGINE (test harness) | No gate compares a recorded fixture's `simVersion` to the current engine pin, and ticket 353's own inventory is incomplete/uncorrected in place | none directly; a stale fixture could mask a real engine regression, which could eventually surface as a wrong number, but nothing today shows one has |
| 361 — no-test-harness-for-scripts-python | TOOLING | No pytest harness exists for `scripts/*.py`, so ticket 356's fix (and future script logic) has no regression test | none (developer-facing) |

## The TAB bucket, ranked by severity and reachability

Both TAB-classified tickets are engine-logic bugs that are **live in the
exact same form in the fork's own copy** — confirmed by reading
`vendor/tbc-new-fork/ui/core/components/individual_sim_ui/upgrades/engine/rank.ts`
and `pool.ts`, which the tickets already grep-cite by symbol
(`attemptEligibility`, `DUAL_WIELD_SPECS`, `mainHandIsOneHanded`). Nothing
gates these code paths off — they run on every candidate swap the tab
performs for the affected specs, whenever such a candidate exists in the
pool.

1. **350 (two-hander swap leaves worn off-hand) — higher priority.**
   Reachable today for three of the four dual-wield specs on every
   phase currently shipped: enhancement (42–59 two-handers across
   p2/p5 universes), warrior (55–77), hunter (43–64). Rogue is
   structurally safe (0 two-handers in TBC). The composed sim request
   for these rows describes gear the game cannot equip, so an unknown
   number of two-hander rows for three specs may carry a wrong delta —
   direction and magnitude are explicitly unmeasured (ticket 350's own
   "What is NOT claimed" section), but the row count exposed (up to ~250
   candidate rows across phases and specs) makes this the ticket to
   measure first.

2. **351 (weapon imbue doesn't follow candidate) — lower priority in
   practice, despite similar reach.** Reachable for every feral weapon
   candidate (36–86 entries per phase) and structurally for any future
   preset that pins an imbue, but the ticket's own reading of the fork's
   damage code establishes that today this produces **no live
   asymmetry**: `forms.go`'s hardcoded id check happens to give all
   feral weapon candidates the same bonus regardless of which stone is
   technically "correct" for their weapon type. Fixing the plumbing
   naively (mirroring upstream) would introduce a new asymmetry rather
   than removing an existing one, so this is a "our request is
   technically wrong but currently harmless" bug, correctly filed as a
   design decision rather than a hotfix.

**Bottom line on reachability:** neither ticket is gated, defaulted off,
or unreachable — both fire on ordinary tab usage for ordinary specs (enh,
warrior, hunter, feral) with no special settings required. 350 is the one
a user can actually see a wrong number from today; 351 is real but inert
under current fork engine behavior.

## Unfiled gaps — real tab-affecting findings sitting only in scratch files

Two findings meet the bar (real, tab-relevant, not filed as a ticket):

### 1. No evidence the tab builds or runs after the reforge-catchup merge (`AUDIT-fork-testing.md`)

The merge that re-pinned the engine and merged 121–127 upstream commits into
the fork branch ran `tsc --noEmit` (type-check only) and six data-consistency
gates, all green. It did **not** run `npm run build` (the real Vite bundle
the tab ships as), did **not** run the fork's Go test suite
(`go test --tags=with_db ./sim/...`, which covers exactly the class/spec sim
fixes this merge pulled in), and did **not** load the tab in a browser or dev
server — including the one merge conflict that was resolved by hand
(`sim_header.tsx`), which is exactly the kind of change a type-check can pass
while the rendered DOM is wrong. The audit's verdict: "there is no evidence
the fork actually builds, and no evidence it runs." This is a materially
different and larger question than any of the 10 filed tickets ask — it's
about whether the whole tab currently loads at all — and it has no ticket.
**This is the most consequential unfiled item:** if the tab does not
currently build, every other ticket about tab correctness is moot until it
does.

### 2. Candidate-cap exposure for stale feral EP weights, tab-reachable (`SME-353-feral-verdict.md`, verdict D)

The feral EP-weights file's own scope note ("EP only chooses gems here") is
false: `candidate-order.ts` uses the same weights to order the whole eligible
pool, and `rank.ts:1100` caps that order to the top N when a cap is set. The
CLI never sets a cap, but **the Upgrades tab exposes a user-facing
"Candidates" number field** (`upgrades_tab.tsx:897`, `readCandidateCap` at
`:1183`) that does. The default is safe (0 = no cap), so no user hits this
without deliberately typing a limit — but a user who does type one gets a
shortlist ordered by Phase-1 feral EP weights against a Phase-3 universe, and
a good item could be dropped below the cap and never simmed, invisibly (no
error, no disclosure — this is different from the phase-mismatch note that
*is* surfaced elsewhere in the UI). Ticket 358 files the docs correction for
the false scope note, but does not file the underlying exposure — whether
the tab's candidate-cap feature should warn when weights are stale, or
whether the weights should simply be re-derived — as its own ticket. Given
the SME's own read that this is "narrow" and "unlikely to be badly wrong
even when stale," it does not need to jump the queue, but it should exist
as a ticket rather than live only in a review-seat handoff file that will
not be found by someone auditing tab tickets later.

## Answer

Of the 10 currently open tickets from this body of work, **2 actually affect
the Upgrades tab** — 350 and 351, both engine-logic bugs present verbatim in
the fork's own shipped copy of the ranking engine. The other 8 are the
repo's own tooling (354, 357, 361), test-harness/inventory hygiene for the
ranking engine (360), documentation and process correctness (352, 358, 359),
or a source-availability risk to the tab's code rather than a defect in it
(355).

In tab-priority order:

1. **350 — two-hander swap leaves the worn off-hand equipped.** Live today
   for enhancement, warrior, and hunter dual-wield rows in every shipped
   phase; direction and size of the pricing error are unmeasured. Highest
   priority because it can silently misprice a row a real user sees.
2. **351 — weapon imbue doesn't follow the candidate weapon.** Live in the
   sense that the request is wrong, but currently inert (no DPS asymmetry
   today) because of a compensating fork-engine quirk; the fix is a design
   decision, not a hotfix.

Plus one gap that outranks both of them if true: **there is no evidence the
tab currently builds or runs at all** after the reforge-catchup merge
(unfiled, `AUDIT-fork-testing.md`). If a wrong ranking is worse than no
ranking, a broken build is worse than either.

**The single thing to do next on the tab:** run `npm run build` (or
`make host`) inside `vendor/tbc-new-fork` and load the Upgrades tab in a
dev server. That's the cheapest check that answers the largest open
question — does the merged tab work at all — before spending effort
measuring how wrong ticket 350's mispriced rows are.

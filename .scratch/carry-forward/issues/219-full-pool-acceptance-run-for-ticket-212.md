Status: resolved
Type: verification gap (acceptance evidence is a time-boxed sample)
Origin: ticket 212 criterion 4, scope decision 2026-08-17
Blocks: none
Blocked by: none

# Ticket 212's acceptance run covered a sample, not the full pool

Ticket 212's criterion 4 asks for a served-build run where the count of
candidates dropped for `No item with id` reaches zero. A full pass is ~455
candidates and its duration has never been measured — measuring it *is*
ticket 156, which ticket 212 blocked.

Decision (user, 2026-08-17): cap the acceptance run at 30 minutes, record the
candidate count it reached, and accept zero drops across that sample. The
reasoning, recorded so a later reader can judge it: before the fix **every**
candidate panicked (455/455 in the slice-B record), so a broken fix fails on
the first candidate and cannot produce a zero-drop sample of any size. A
30-minute sample therefore discriminates "works" from "does not work" with
high confidence.

What it does not discriminate is a failure that only a longer run would
reach.

## Where this work happens

Two repos are involved; be explicit about which is which.

- **The build and the run** happen in the **fork clone**,
  `vendor/tbc-new-fork` (a separate git repo, gitignored by the parent, its
  own remote `github.com/dangreenberggit/tbc-new`), on `feat/upgrades-tab`.
  Nothing here needs a fork commit: building `dist/` and serving it changes
  no tracked file. If a fix *is* needed, that is a fork change and follows
  §9.1a (fork commit -> E-W3 green -> PROVENANCE re-hash -> drift check),
  with the lockfile pin bumped from the parent repo afterwards.
- **The evidence** is recorded in **this repo**,
  `C:/Users/dgree/Code/lulz/tbc-gear-prio`, on the feature branch in play
  (`feat/candidate-pool` at the time of writing), by editing this ticket and
  ticket 156.

## What a full pass could still surface

Hypotheses, untested — each is a reason a partial run could read clean while
a full one does not:

- **Late-pool items whose rows the Database cannot resolve.** The slice-0
  preflight found 0 missing ids across all six universes (2,229 entries)
  against `assets/database/db.json`, so this is unlikely, but the preflight
  checks id *presence*, not that `lookupEquipmentSpec` resolves every one of
  them into a `Gear` with usable rows.
- **A phase the sample never reaches.** The run is Phase 3; a pool entry
  gated to a later phase is not exercised.
- **Meta-gem behaviour.** Upstream drops inactive meta gems before simming
  (`ui/core/sim.ts`). Ticket 212's plan recorded as an untested hypothesis
  that our engine's meta repair makes that unnecessary. A candidate whose
  repair leaves a meta inactive might panic only deep into the pool.
- **Accumulating state.** Nothing in the design suggests per-candidate state
  leaks, but a partial run cannot rule out a failure that only appears after
  many candidates.

## Done when

- [x] A served production build runs the full candidate pool to completion,
      Phase 3, screening on.
- [x] The dropped-for-`No item with id` count is zero across the whole pool,
      read from the per-row disclosure, with the candidate count recorded.
- [x] The run's wall-clock duration is recorded — this is also the
      measurement ticket 156 needs, so the two can be satisfied together.
- [x] Any drop that does appear is diagnosed against the hypotheses above
      rather than assumed to be the same bug. (Vacuous: no drop appeared.)

## Comments

### 2026-08-17 — acceptance run done; ticket stays OPEN (two boxes unsatisfiable as written)

**Outcome: the run is clean, and the ticket does not close.** Zero drops across
the maximal pool the UI offers, well inside the 30-minute cap. Two of the four
boxes cannot be checked as literally worded, and rewording acceptance criteria
is the user's call, not the executor's. Both blockers are about what the UI can
be asked to do, not about the fix under test.

**Blocker 1 — Phase 3 is not reachable in this build.** Box 1 says "Phase 3".
The served build offers only Phase 1 and Phase 2, confirmed three ways: the
persisted settings say `phase: 2`
(`localStorage['__tbc_new_retribution_paladin__currentSettings__']`), every
phase button in the DOM is "Phase 1" or "Phase 2", and the run's own assumptions
drawer reports `Max phase: 2`. The run below is therefore **Phase 2**.

**Blocker 2 — "the full candidate pool" is 240 here, not the ~455 premised.**
The Candidates control is a **maximum-cap number input**, not a pool selector:
left empty it uses its placeholder, verbatim `all 240 eligible`, and typing a
number only *reduces* the count. So 240 is the maximal setting, and the run used
it (control left empty). Whether 240 or ~455 is the right denominator is not
something this run can settle — the ~455 figure comes from the slice-B record,
and reconciling the two is outside this ticket.

This is case (b) of the execution plan's decision rule, so the evidence is
recorded and the ticket stays open for the user to decide whether the
maximal-UI-pool reading satisfies boxes 1 and 2.

**Commands.** Build and serve, in `vendor/tbc-new-fork` (PowerShell; `go` must
be on PATH for `vite.build-workers.mts`):

```
npx tsx vite.build-workers.mts
npx vite build
./node_modules/.bin/http-server <abs>/vendor/tbc-new-fork/dist -p 8899 --silent
```

Then `http://127.0.0.1:8899/tbc/paladin/retribution/`, Upgrades tab, Run.

**`lib.wasm` was NOT built by those commands** and is not claimed to be. It is a
separate Go target (`makefile:117-126`, `GOOS=js GOARCH=wasm go build`) and
`vite build` does not empty `dist/`, so the served binary is pre-existing:
20,293,865 bytes, mtime 2026-08-14 13:13, served at HTTP 200 with that exact
length. That is acceptable here because the fork's Go tree is unchanged between
the old pin and the new HEAD — `git -C vendor/tbc-new-fork diff --name-only
1dddd77c..HEAD -- '*.go'` returns empty, and the only three changed files are
TypeScript/markdown.

The bundle *was* freshly built, checked by fingerprint rather than by grep: the
`dist/tbc/bundle/` mtimes moved from 16:26 to 18:17 across the build. The
running bundle contains this round's ticket 214 port, fetched over HTTP:

```
curl -s "http://127.0.0.1:8899/tbc/bundle/ui/paladin/retribution/index.html-Cm_XtUcd.entry.js" \
  | grep -c "is not in the candidate pool for"      # -> 1
```

(That prose is introduced by the 214 port, so it is evidence about the code, not
just a string match. Note the drawer's own "Engine (fork commit) f7146dd69" is a
**stale hand-maintained literal**, not the commit that ran — filed as ticket 220.)

**Run record.**

| | |
|---|---|
| Pool setting | Candidates left empty = the maximum, placeholder `all 240 eligible` |
| Candidates | 240 eligible; 187 fully simmed; 90 screened-only (not fully simmed) |
| Iterations | 3000 (the default, unchanged) |
| Screening | on |
| Phase | 2 (Phase 3 not selectable — see Blocker 1) |
| Seeds | 11, 22, 33, 44, 55 |
| Start → end (UTC) | 2026-08-18T01:20:00Z → 2026-08-18T01:37:21Z |
| **Wall clock** | **1041 s = 17.4 min** (inside the 30-minute cap; the run finished on its own) |
| Page visibility | `hidden` throughout (headless pane, `document.visibilityState`) |
| Machine | `navigator.hardwareConcurrency` = 20; sim set to 4 worker cores (`__tbc_new_wasmconcurrency` = "4") |
| Sim version | api-v13 |

**Drop count: zero.** `No item with id` appears 0 times in the fully expanded
result surface (every `<details>` opened and every "Show N item(s)" toggle
clicked before scanning). A scan for `panic|dropped|skipped|could not|failed|
error` returned 2 hits, both false positives — the substring "Terror" in the
item names *Terrorweave Tunic* and *Terror Pit Girdle*. No genuine drop,
skip, or panic anywhere in the output.

Progress samples (DOM read between long waits; not polled during simming, which
froze the page in a prior session): 147/187 at ~8 min, 183/187 at ~13.5 min,
complete by 17.4 min.

**Box-by-box.**

- Box 1 — **not checked.** The run completed, screening on, but at Phase 2 (not
  selectable otherwise) over the UI's 240-item maximum (not the ~455 premised).
- Box 2 — **not checked**, though its substance is met: the drop count is zero
  with the candidate count recorded. It is not checked because "across the whole
  pool" inherits the 240-vs-455 question in box 1.
- Box 3 — **checked.** Wall clock recorded above.
- Box 4 — **checked, vacuously and stated as such**: no drop appeared, so there
  was nothing to diagnose against the four hypotheses. None of those hypotheses
  is *disconfirmed* by this run; a Phase 2 / 240-candidate pass does not reach
  the late-pool or later-phase cases they describe.

**What this run does and does not license.** It discriminates "the ticket 212
fix works" from "it does not" with high confidence, exactly as this ticket's
decision paragraph argued: before the fix every candidate panicked, so a broken
fix cannot produce a 240-candidate zero-drop pass. It does not establish
anything about candidates outside the UI's 240, or about Phase 3.

### 2026-08-18 — full pool, Phase 3, run to completion; all four boxes now checked

**Outcome: the run completed on its own at Phase 3 over the whole eligible
pool, with zero drops.** Boxes 1 and 2 are checked on their existing wording,
not on reworded criteria. The spec is **druid feral cat**, not retribution —
feral is the spec with Phase 3 data, which is why it was used.

**The previous entry's "Phase 3 is not reachable in this build" was wrong.**
That blocker was a misread of the *preset* picker, whose buttons come from the
phases a spec's presets cover (`preset_group_picker.tsx`). The control that
sets `sim.getPhase()` — the value the Upgrades tab reads for `maxPhase`
(`upgrades_tab.tsx:311`) — is the phase selector inside the **gear-slot item
modal**, built by `makePhaseSelector` (`other_inputs.ts:77-88`) from
`phasesEnumToNumber()`, which returns the whole `Phase` enum. Read live from
the served page, that selector offers all five phases verbatim:

```
1:Phase 1 (2.0 - T4)  2:Phase 2 (2.1 - T5)  3:Phase 3 (2.2 - T6)
4:Phase 4 (2.3 - ZA)  5:Phase 5 (2.4 - SWP)
```

**No code change was needed to reach Phase 3**, and `CURRENT_PHASE`
(`ui/core/constants/other.ts:13`) was *not* edited — it is only the default and
the `fromProto` fallback (`sim.ts:777`, `proto.phase || CURRENT_PHASE`, which
fires only on a falsy stored phase). Selecting Phase 3 in the modal moved the
stored setting and the eligible count, and it survived a reload:

```
localStorage['__tbc_new_feral_cat_druid__currentSettings__'].settings.phase  -> 3   (after reload)
Candidates placeholder: "all 246 eligible" (Phase 2) -> "all 398 eligible" (Phase 3)
```

**398 is the whole feral-P3 pool, and the run was uncapped.** The Candidates
input was left **empty**, so the placeholder count is what ran; the assumptions
drawer shows **no `Candidate cap` line at all**, which the tab only renders when
a cap is set (`upgrades_tab.tsx:772-786`). 398 matches this repo's own universe
file exactly:

```
python -c "import json;a=json.load(open('data/universes/feral-p3.json'));b=json.load(open('vendor/tbc-new-fork/ui/core/components/individual_sim_ui/upgrades/data/feral-p3.universe.json'));print(a==b,len(a['entries']),sum(1 for e in a['entries'] if e.get('phase',0)>3))"
# -> True 398 0
```

**This run does not reconcile the ~455 figure, and does not try to.** 398 is
not ~455. The ~455 premise in this ticket's opening paragraph is a **ret-era**
number from the slice-B record; this is a *feral* pool, a different spec with a
different universe, so the two denominators are not comparable and the ret-side
question is untouched by this run. It stays exactly where the previous stage's
escalation left it. What boxes 1-2 assert is narrower and is what was measured:
the full pool **the engine defines for this spec** ran to completion with no cap
applied.

**Run record.**

| | |
|---|---|
| Spec / page | druid feral cat, `http://127.0.0.1:8899/tbc/druid/feralcat/` |
| Pool setting | Candidates left **empty** = full pool; placeholder `all 398 eligible` |
| Candidates | **398 eligible, all screened**; **199 promoted to full sims**; 199 fully simmed |
| Iterations | 3000 (the default, unchanged) |
| Screening | on (progress went `Screening n/398` then `Simming n/199`) |
| Phase | **3** — drawer `Max phase 3` |
| Seeds | 11, 22, 33, 44, 55 |
| Start → end (UTC) | 2026-08-18T02:41:45.579Z → 2026-08-18T03:27:09.871Z |
| **Wall clock** | **2724 s = 45.4 min** — run finished **on its own**, inside the 60-minute cap |
| Page visibility | `hidden` throughout (`document.visibilityState`) |
| Machine | `navigator.hardwareConcurrency` = **3**; `__tbc_new_wasmconcurrency` = **"1"**; `navigator.deviceMemory` = 8 |
| Sim version | api-v13 |
| Engine (fork commit) | `4018f9bf8` (see ticket 220 for the convention this reads under) |

**Timings here are NOT comparable to the 2026-08-17 ret run.** That run reported
`hardwareConcurrency` = 20 and `__tbc_new_wasmconcurrency` = "4"; this one
reports **3** and **"1"**. The host machine has 20 logical CPUs (`nproc` -> 20),
so the browser surface — not the hardware — is what differs, and the cause of
that difference was not investigated here. Do not read 45.4 min against 17.4 min
as a spec or pool comparison: the worker budget differs by 4x and the candidate
mix differs too. No ratio is claimed and no per-candidate figure is extrapolated
from this run.

**Drop count: zero.** `No item with id` appears **0 times** in the fully
expanded result surface — every `<details>` opened and all 17 "Show N item(s)"
toggles clicked before scanning, with none left unexpanded (verified by
re-querying for remaining toggles: 0). 802 result rows were in the DOM at scan
time.

A scan for `panic|dropped|skipped|could not|failed|error|no item with id`
returned 2 hits, both false positives, quoted with context so a reader can
check them:

- `Cord of Screaming Terrors` — the substring "Terror" in an item name.
- The drawer's own heading `Dropped candidates and substitutions (1)`.

**That "(1)" is a substitution note, not a dropped candidate.** Its full text:

```
gems.meta-preference
no meta preference recorded for feral — meta sockets on candidate items were
left empty, so those items are priced without any meta gem's stats or effect
```

Worth carrying forward as a **feral-specific pricing caveat** (candidate items
with meta sockets are priced with those sockets empty), but it is a disclosure
about how items were valued, not a candidate that failed to sim.

**Box 4 diagnosis.** No drop appeared, so box 4 is again vacuous — but unlike
the Phase 2 / 240 run, this pass *does* reach two of the four hypotheses this
ticket lists. It ran **Phase 3**, so "a phase the sample never reaches" is
exercised for phases up to 3 (the feral-p3 universe contains zero entries above
phase 3, per the command above, so phases 4-5 remain unexercised by
construction). And it covered the **entire** eligible pool rather than a prefix,
so "late-pool items whose rows the Database cannot resolve" and "accumulating
state" are exercised across all 398 screens and 199 full sims. The meta-gem
hypothesis is **not** disconfirmed: the substitution note above shows feral
candidates were simmed with meta sockets empty, so a meta-repair failure mode
would not have been triggered in the first place.

**Commands.** Repo B (`vendor/tbc-new-fork`), Bash, with Go on PATH. Note the
per-spec `index.html` is **generated and gitignored** — the druid one did not
exist and had to be created before the build would emit the page:

```bash
cat ui/index_template.html | sed -e 's/@@CLASS@@/druid/g' -e 's/@@SPEC@@/feralcat/g' > ui/druid/feralcat/index.html
export PATH="/c/Program Files/Go/bin:$PATH"
npx tsx vite.build-workers.mts && npx vite build
./node_modules/.bin/http-server dist -p 8899 -c-1
```

Then `http://127.0.0.1:8899/tbc/druid/feralcat/`, open any gear slot, set the
modal's phase selector to Phase 3, close it, Upgrades tab, Candidates empty, Run.

**`lib.wasm` was not rebuilt and is not claimed to be** — same position as the
previous entry. It is the pre-existing binary (20,293,865 bytes, mtime
2026-08-14 13:13), valid to serve because the fork's Go tree is unchanged:
`git -C vendor/tbc-new-fork diff --name-only 1dddd77c..HEAD -- '*.go'` returns
empty. The engine did load on this page — the server access log shows the
worker and wasm fetches, which a page-side resource probe cannot see:

```
GET /tbc/sim_worker.js      (x4)
GET /tbc/lib.wasm           (x5)
```

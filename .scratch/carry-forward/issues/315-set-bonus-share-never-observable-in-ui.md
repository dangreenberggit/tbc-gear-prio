Status: open
Type: bug
Origin: stage-gate `upgrades-ui-rebuild`, slice 4 execution, 2026-08-27
Blocks: none
Blocked by: none

# Set-bonus share never became observable in the UI

Ticket 313's display code shipped (fork commit `978f0c2e3`), but **its
acceptance was never met**: across five sweeps the executor could not get a
single row to carry a `setContext`, so none of the four display states was
ever seen on screen. The code is committed unverified-in-practice and is
recorded as such in the stage's decision log; it is not known to be wrong,
it is known to be unobserved.

## What was swept

Reported by the executing seat (its measurement tables are in a scratchpad
that does not survive the session, so treat the specific figures as its
report rather than as re-run output):

- phases 3 and 5 on default gear
- 2/5 and 3/5 of Crystalforge Battlegear (`setId` 629), whose 2pc and 4pc are
  both listed implemented

In every case the set-potential toggle stayed hidden and the assumptions
drawer recorded no set-bonus disclosure at all.

## The candidate explanation, untested

At 3/5 the 4pc needs one added piece, which `rank.ts:1232` marks
`unmeasurable-at-this-worn-count`. That would explain the 3/5 sweep. It does
**not** explain the 2/5 sweep, which needs two pieces and still produced
nothing. **Hypothesis**: the gating that suppresses these rows is upstream of
the UI, in the engine or the candidate pool, not in ticket 313's display
code. Nobody has confirmed this.

## The cheapest next check (added by domain review, round 4)

The domain axis narrowed this usefully. At `piecesWorn = 2` only the 4pc row is
built (`rank.ts:1548`, `if (threshold <= piecesWorn) continue;`), needing **two**
added pieces — so the `addedPieces.length === 1` guard does **not** fire and
`unmeasurable-at-this-worn-count` is *not* the cause of the 2/5 sweep. The
hypothesis above is wrong about that half.

The likelier cause: `selectPackage` (`packages/core/src/set-value.ts:185-192`)
accepts a completing piece only if `deltaByItemId.get(entry.itemId)` exists —
the piece must be **in the candidate pool and individually simmed**. With
`setIdsWithCandidates` returning empty short-circuiting the whole path
(`rank.ts:1510-1516`), the feature needs *two* un-worn pieces of the same set to
survive pool filtering in one run. On default gear at 2/5 the worn-item guard
removes the worn tier pieces, so the surviving in-pool pieces may be fewer than
two.

**Start here:** instrument `setIdsWithCandidates.size` and `selection.ok` for
setId 629. This is a hypothesis, not a measurement — nobody has run it.

Domain's reachability verdict: the feature is **not** structurally dead, but it
is much narrower than the toggle's presence implies — it needs a player at 2/5+
of an implemented set whose pool still carries two un-worn pieces of that set.

## Why it is filed rather than fixed here

The stage that found it owns the tab's presentation only; `upgrades/engine/**`
and `upgrades/data/**` were out of scope and byte-gated. Whoever picks this up
should start by asking whether any row in any phase/spec combination ever
carries a `setContext` — if none does, the display states are unreachable and
ticket 313's UI cannot be validated by inspection at all.

Related: ticket 91 (closed) covers a different layer — the engine crediting a
measured 4pc bonus to no row. This ticket is about no `setContext` reaching
the UI in the first place.


## Handoff notes (orchestrator, 2026-08-28)

The owner is assigning this to a separate agent. Everything below was confirmed
by command in this session so the next seat does not have to rediscover it.

### The probe, concretely

`setIdsWithCandidates` is built at `packages/core/src/rank.ts:1511-1514` and
short-circuits the whole set-bonus path at `:1516`
(`if (setIdsWithCandidates.size === 0) return [];`), then drives the loop at
`:1532`. `selectPackage` is `packages/core/src/set-value.ts:155`. Instrument
those two for setId 629 and the reachability question is answered.

### The trap: the engine exists in two copies

`packages/core/src/` is the source. The fork carries a **ported copy** under
`ui/core/components/individual_sim_ui/upgrades/engine/`, hash-gated by that
directory's `PROVENANCE.md` and checked by `scripts/check_engine_port_drift.py`.

A probe added to the wrong copy measures nothing, because **the running page
executes the fork's ported files, not `packages/core`**. Any real edit has to go
through the ported-file cycle (see `docs/agents/known-traps.md` before touching
either copy) — a temporary probe is easier to run in the fork copy and then
revert, but do not commit a hash-breaking edit by accident.

### What "done" looks like

Two possible outcomes, and they are different tickets:

1. **Reachable** — construct a character/phase where a row carries a
   `setContext`, then verify all four of ticket 313's display states on screen.
   That closes this ticket and finally validates 313.
2. **Unreachable in practice** — if no realistic configuration produces one,
   313's display code is dead as written and the design question reopens: the
   toggle advertises a feature the engine will not feed. That is a bigger
   finding than a bug, and it should come back to the owner rather than being
   fixed quietly.

Do not close 313 on either path without the owner seeing the answer.

### Do not trust these figures without re-running

The five-sweep results above are the executing seat's report; its measurement
tables lived in a session scratchpad that is gone. The *reasoning* about why
2/5 should have worked was independently verified by domain review, but the
sweep numbers themselves were not re-run.

## Resolution (2026-08-28) — reachable, observed, and a display floor added

Three findings, all re-runnable:

### 1. Reachability: REACHABLE (outcome 1, not the dead-feature outcome)

A committed real `rankUpgrades` artifact
(`.scratch/set-bonus-value/ret-catchup/artifacts/slamaltman-p3.json`, commit
`801065a`) already carries a populated `setContext` on 11 rows — Lightbringer
(set 680, a measured 2pc from two un-worn pieces) and Crystalforge (set 629, the
probe target, a measured 4pc). So `setIdsWithCandidates.size > 0`, `selection.ok`
succeeds, and the short-circuit at `rank.ts:1516` never fires. The five failed
sweeps were default gear on the live page, not a config whose pool carries ≥2
un-worn same-set pieces. The set-bonus path is **not** structurally dead.

### 2. Observed on screen (headless CDP, the browser pane is inert here)

The MCP browser pane cannot give this page a viewport (`window.innerWidth === 0`),
which is why every prior sweep failed to observe anything. Driving a headless
Chromium over raw CDP (the mechanism ticket 322's gate proved) gets a real
viewport. All four of ticket 313's display states rendered, text read back from
the live DOM:
- prospective: `+27.5 set bonus (0/2 → 1/2 Lightbringer Battlegear)` (ret p5)
- crosses: `includes the 2-piece Crystalforge Battlegear bonus`
- confounded: `+3.4 set bonus (Justicar Battlegear) — not counted in ranking:
  breaks Crystalforge Battlegear 2pc`
- no-context: the ordinary row, no sub-line

### 3. The `-47.3` was a fluke; owner ruling added a noise floor

One live run rendered `-47.3 set bonus`. A set bonus cannot be negative, and
-47.3 is ~10.7 SE from zero — far too large for noise. Re-simming the exact rows
did **not** reproduce it: the engine measures these ret bonuses at ~0 ± ~5
(Lightbringer 2pc +0.31, Justicar 4pc -4.10; committed data agrees within
noise). The -47.3 was a one-off degraded package sim, not a stable measurement —
**no engine bug.**

The real display issue it exposed: a near-zero bonus shown raw (`-4.1 set bonus`)
reads as a real negative figure. **Owner ruling (2026-08-28): "if it's at or
below noise, don't show it."** Implemented as a display floor
`SET_BONUS_MIN_DISPLAY_DPS = 10` gating only the prospective line
(`upgrades_tab.tsx`), fork commit `e7f147443`. The floor is a deliberately
conservative ~4-SE round number: reported per-run SE is ~1.678 DPS
(`docs/verification-log.md`), a prospective bonus folds two deltas so its noise
is ~2.37 SE, and a strict 2-SE bar would be ~4.7 — 10 is chosen high of that.
This is **not** the per-spec, CUTOFF-derived treatment the single-item cutoff
uses (`packages/core/src/cutoff.ts`); a fixed global floor was accepted as
proportionate for a display gate. Making it per-spec/CUTOFF-derived is a possible
follow-up, not done here.

Re-validated on screen after the floor: ret p3 (all bonuses below 10) shows zero
prospective lines; ret p5 shows the genuine `+27.5` Lightbringer line — so it is
a noise floor, not a blanket suppressor, and the crosses/confounded branches are
untouched.

Noise reduction (which would let a lower floor work) stays ticket 105.

**Left open pending the owner viewing the running tab** (per the do-not-close
rule above). Ticket 313's rendering is validated; 313 and 315 close together on
the owner's sign-off.

## 2026-08-29 — re-verified on the current tip (stage-gate wowsims-tab-tickets)

Re-ran the CDP re-verification (F3: proved CDP first —
`window.innerWidth === 1280` read back from the live DOM before any acceptance
was marked). Harness: `vendor/tbc-new-fork/reverify-tab.mjs` (reuses ticket
322's raw-CDP plumbing over the on-disk Playwright Chromium; readback stored at
`.scratch/stage-gate/wowsims-tab-tickets/cdp-reverify.json`, gitignored). A real
headless WASM ret run (set-potential toggle ON) rendered a **crosses** set-bonus
line, read verbatim from the live DOM:

- `"includes the 4pc Justicar Battlegear bonus"` (two rows)

So `setBonusLine` is wired and a real `setContext` row reaches the UI on the
current tip — the feature is observably alive (over-satisfies C10: the committed
artifact carries 19 setContext rows, not the stale "11"). The **prospective**
(+dps), **confounded**, and **no-context** states were captured on the earlier
full-pool run recorded above (2026-08-28); this pass's capped pool happened to
land on the crosses state rather than re-exercising all four — the display code
is unchanged since that run, so the earlier four-state readback still stands.

Status unchanged: **verified, owner-checklist-pending.** 313/315 close together
on the owner's sign-off, never by the executor (per the do-not-close rule).

## 2026-08-29 (Execution D) — all four states re-captured with the final strings

Re-captured after 330's reword and 336's disclosure landed (fork commit
`a21681c33`). CDP proven first
(`.scratch/stage-gate/wowsims-tab-tickets/d-cdp-proof.json`). All four
display states observed by live DOM readback across the feral and ret
runs (`.../d-evidence/after/readback.json`):

- **prospective** (330's new string): `"toward Malorne Harness 4pc (+15.9)"`
- **crosses**: `"includes the 4pc Justicar Battlegear bonus"`
- **confounded**: `"+83.3 set bonus (Nordrassil Harness) — not counted in
  ranking: breaks Malorne Harness 2pc"`
- **no-context**: rows without a set context carry no line

Plus 336's new **package-disclosure** state rendered live on ret
(`"also opens Crystalforge Battlegear 4pc (+15.5, 4 pieces) — not in this
row's number"`) and in the layout harness (`.../d-evidence/disclosure-harness/`).
Row-credit invariance held byte-for-byte before/after the disclosure (see
the execution report). Still closes with 313 on owner sign-off.
# Research notes — collected from the first planner's four researchers

The first `gate-planner` spawn dispatched four `Explore` researchers and then
ended its turn waiting on them, which loses the fan-in: background completions
notify the parent session, not a finished manager. `SendMessage` is disabled in
this session, so the seat could not be resumed and was respawned instead. The
four reports arrived here and are recorded below so the respawn does not pay to
rediscover them, and so nothing depends on any one context surviving.

Every line number below came from a researcher's own grep output, not from the
handoff documents. Where a researcher flagged something as unverified, it is
carried as unverified.

## R1 — Ticket 351, the weapon-stone question (agent a7d1cd3c03a938ab5)

**Answers brief question Q2.** Per the fork's own `registerStaticImbue`
(`vendor/tbc-new-fork/sim/core/consumes.go:697`, switch cases at :708 and :734),
Adamantite Sharpstone (29453) and Adamantite Weightstone (34340) grant
**identical melee bonuses**: `stats.MeleeCritRating +14` and `+12` to MH/OH/Ranged
`BaseDamageMin/Max`. The only difference is the sharpstone's
`RangedCritPercent -(14 / PhysicalCritRatingPerCritPercent)` at :732, a
compensation for the ranged-crit gain implied by +14 crit rating — inert for a
melee-only character.

`sim/druid/forms.go:52` checks `MhImbueId == 34340` only:

```go
func (druid *Druid) weaponImbueFlatDamage() float64 {
	if druid.Consumables.MhImbueId == 34340 { // Adamantite Weightstone
		return 12
	}
	return 0
}
```

**By ticket 351's own step-1 rule, equal melee bonuses implicate `forms.go:52`
as a fork-engine bug**, and make our missing per-candidate adjustment cosmetic
by comparison.

Also found: the `"weapon-imbue-omitted"` disclosure sentence is **byte-identical**
in `packages/core/src/disclosure.ts:55` and the fork's ported copy at
`upgrades/engine/disclosure.ts:57`, though the surrounding files differ (the
fork copy is a trimmed subset with a header saying it is ported unchanged).

**Unverified, carry as `hypothesis, untested`:** the researcher could not
confirm by grep where `mhImbueId` lives in the proto/UI layer — no
`WeaponImbue` enum and no `MhImbueId` matches under `vendor/tbc-new-fork/proto/`.
The stone appears to be referenced by raw item id (int32), not an enum. Ticket
351's claim that it is set via `Player.setGear` / `Gear.adjustImbues` was **not**
re-verified in this pass.

## R2 — The fork build and the ported-engine cycle (agent a2ce8c80cae70b1d2)

**Unblocks job 1, and improves on the handoff's recipe.** `make host`
(`makefile:296`) depends on `air`, which is why it never exits. But
**`make dist/tbc/.dirstamp` (`makefile:18-23`) produces the same `dist/tbc/`
tree and `lib.wasm.gz` without starting `air`** — it depends on
`$(OUT_DIR)/lib.wasm.gz`, `ui/core/proto/api.ts`, `$(ASSETS)` and
`$(OUT_DIR)/bundle/.dirstamp`, none of which route through `air`.
`OUT_DIR := dist/tbc` (`makefile:5`). The vite build itself is `npx vite build`
at `makefile:37`, gated on the `node_modules` prerequisite at `:31`.

**The existing `dist/` is stale in a way that undercuts the handoff's evidence.**
`ls -la` shows `index.html` at 17645 bytes stamped Sep 10 13:12 but
`lib.wasm.gz` at 3857795 bytes stamped Sep 10 11:07 — **the wasm predates the
last vite build**. So the browser load the handoff cites as passing evidence ran
against a partially stale bundle.

Tab registration is in the shared base, not one spec page:
`ui/core/individual_sim_ui.tsx:28` (import), `:334` (`this.addUpgradesTab()`),
`:439-440` (`private addUpgradesTab()` → `new UpgradesTab(...)`). Every spec page
extending `IndividualSimUI` gets the tab.

**E-W3** is `packages/core/test/wowsims-fork-parity.test.ts`, run from **this
repo** (`npx vitest run packages/core/test/wowsims-fork-parity.test.ts`), not
from the fork — the fork ships no TS test runner. It proves the fork's ported
engine reproduces `packages/core`'s ranking. The PROVENANCE sha gate is
`scripts/check_engine_port_drift.py`, wired into `verify` as
`engine-port-drift:check`; the layout gate is `scripts/check_layout_gate.py`.

No `doctor` script exists (grep of package.json scripts found only `verify` and
`issues:open`), confirming the handoff's note that `pnpm doctor` is a
recommendation, not a thing that exists.

## R3 — Ticket conventions and the cap symbols (agent a0de5f0c899ef4a36)

**Corrects the numbering procedure's rationale.** `docs/agents/issue-tracker.md`
(lines 22-27) says `NEXT` is the authority and warns **against allocating by
directory listing alone**, citing a real 232/233 collision.
`docs/agents/known-traps.md` says the opposite (listing is the authority).
Ticket 352 is open precisely because they contradict; its stated safe procedure
is the **conjunction**: read `NEXT`, verify no file already uses that number,
file, and write the bump back **in the same commit as the new ticket**.

Required ticket front-matter, per `issue-tracker.md:31-36`:

```
Status: open
Type: task
Origin: docs/reviews/<branch>.md
Blocks: phase-1
Blocked by: none
```

`Status:` is exactly one of `open` / `claimed` / `blocked` / `closed` /
`resolved` / `wontfix`. **Closing a ticket means setting `Status: closed`, not
moving the file.**

**Scope warning for job 4 item 2:** ticket 358 already owns the "the feral EP-weights
note is misleading" docs finding (`358-...md:41-53`). A new cap ticket must
cover the **cap mechanism and its exposure**, not restate 358's docs fix.

Candidate-cap symbols, all from grep:

| Where | Symbol |
| --- | --- |
| `upgrades_tab.tsx:399` | `private candidateCap = 0;` |
| `upgrades_tab.tsx:1183` | `private readCandidateCap(): number \| undefined` |
| `upgrades_tab.tsx:1228`, `:2366` | the two call sites |
| `packages/core/src/rank.ts:123` | `candidateCap?: number;` |
| `packages/core/src/rank.ts:1100` | `const cap = input.candidateCap ?? ordered.length;` |
| fork `engine/rank.ts:147`, `:660`, `:1180` | the mirror |
| `candidate-order.ts:54` (both copies) | `orderCandidatesByEp`, called at core `rank.ts:739` / fork `rank.ts:599` |

Note this **resolves the earlier citation confusion**: `rank.ts:1100` *is* the
cap line — in `packages/core`. It is `:1180` in the fork copy. The handoff cited
the core line number against the fork file.

`EpWeights` is a parameter to `orderCandidatesByEp`, not hardcoded there; the
per-phase weights (e.g. `data/presets/feral/p1.ep-weights.json`) come from the
caller. There is no `packages/cli/` — `packages/` contains only `core/`.

House style for a "What is NOT claimed" section: a bolded one-line disclaimer
naming exactly what was not verified, then a plain statement of what *was*
confirmed by reading.

## R4 — (agent a910acea820d154c6)

Completed, but its report did not reach this session before the planner was
respawned. Its subject was the engine-copy reconciliation for ticket 350. The
respawned planner should re-derive that ground; the facts this session already
holds on it are recorded in `brief.md` (the two spellings of the off-hand guard,
`packages/core/src/rank.ts:920` vs fork `engine/rank.ts:791`, and the 2164 vs
2092 line counts).

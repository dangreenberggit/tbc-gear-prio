# Options: how far to take "add wowsims specs to the Upgrades tab"

**Status:** decision-support, pre-planning. No production code changed by this
document. This is a menu of scope options with tradeoffs, not a plan.

> **Superseded by the probe — read this first.** This menu was written before the
> trustworthiness probe and guesses healers are the _clean_ subset and tanks the
> hard one. The probe ([`trustworthiness-probe.md`](trustworthiness-probe.md))
> found the **opposite**: tanks are trustworthy, and **healers are blocked upstream**
> (wowsims does not implement TBC healing — see
> [`healer-support-blocked.md`](healer-support-blocked.md)). The live product is
> **DPS + tanks** ("C-minus-healers"). Option B (healers) is not buildable now.
> The option _structure_ below still holds; its healer-vs-tank difficulty read does not.

**Ground truth:** [`foundation.md`](foundation.md) (the factual investigation)
and [`../ep-weights-from-sim.md`](../ep-weights-from-sim.md) (EP-weight
derivation constraints). This document cites those sections rather than
re-deriving their facts. Every causal claim points at one of them, at a
re-runnable command, or is labelled **hypothesis** / **untested**.

**The decision.** Six specs could be added — 3 healers (Resto Druid, Holy
Paladin, Resto Shaman) and 3 tanks (Bear Druid, Prot Paladin, Prot Warrior);
no healer/tank priest exists in TBC wowsims (foundation §2). The question is
how far down that list to go, and it is dominated by one fact: **the objective
refactor (foundation §3) costs the same whether you then ship one non-DPS spec
or all six.** So the real fork is not "how many specs" but "do we cross the
objective boundary at all, and if so do we stop at healers (one clean objective,
HPS) or also take on tanks (multiple ambiguous survival objectives)."

The options nest: **A ⊂ B ⊂ C**. Each section below gives what ships, the
incremental work over the cheaper option, hard-blocker exposure, main risks,
and a rough S/M/L size (relative, not hours — hours are not measurable here).

---

## The boundary that structures the whole menu

The engine ranks gear by a **simmed DPS delta**, and the sim seam collapses the
rich result to a single scalar literally named `dps` at three choke points
(foundation §3: `seams/sim-runner.ts:20-25`, `seams/cli-sim-runner.ts:73-77`,
`rank.ts`). The sim **already emits** `hps`, `tmi`, `dtps`, `threat` next to
`dps` in the same message (foundation §3, `proto/api.proto:317-328`); the engine
is simply deaf to them.

Confirmed while writing this: the noise-floor type is `Cutoff = { absDps: number;
pct: number }` (`cutoff.ts:14`) — the objective's name is baked into the _type_,
and `CUTOFF_BY_SPEC` is total over `SpecId` with all specs but ret and feral
inheriting ret's `absDps 3.4` untested (`cutoff.ts:67-87`). This is one concrete
face of the §3 refactor: HPS could reuse this shape with a renamed field, but
**TMI is not a throughput unit at all** and needs its floor re-derived in its own
units, not merely re-measured (foundation §4, cutoff row).

**Anything past DPS pays the §3 refactor once.** That is the fixed cost that
separates Option A from B and C, and it is why B and C differ from each other
only at the margin (the tank objective), not at the core.

Two structural facts that apply to B and C equally:

- **Two-copy engine** (foundation §5). The engine exists twice: `packages/core/
src/` and a fork copy under `upgrades/engine/`. The refactor lands in both, or
  the copy relationship is resolved first (consume `packages/core` as a package).
  A planner should settle this _before_ writing the refactor, or pay for it twice.
- **The tab is already spec-agnostic** (foundation §5). It renders on every
  spec's page today and drives sims off the live page with no spec branching.
  What gates ranking is one data allow-list, `SPEC_ID_BY_PROTO_SPEC`
  (`upgrades_tab.tsx:63-78`), which is `Partial<Record<Spec, SpecId>>` on
  purpose and yields an `unsupported-spec` message for any absent spec
  (`upgrades_tab.tsx:63` comment, verified).

---

## Option A — DPS only (status quo)

**What ships:** exactly today's product. All 11 DPS specs rank on the tab. The
six non-DPS specs get the `unsupported-spec` message on their pages.

**Incremental work over "do nothing":** none for ranking. The only work in A is
the **UX sub-choice** below.

**Hard-blocker exposure (the §3 objective refactor):** **none.** This is the
entire reason A is cheap — it never crosses the objective boundary.

### The UX sub-choice: leave the message, or suppress the tab

Today a healer or tank visitor sees the Upgrades tab present on their page, and
opening it shows `unsupported-spec` (`upgrades_tab.tsx` `RunState` includes
`{ kind: 'unsupported-spec' }`, verified at line 117; the map deliberately omits
tanks/healers, `:63` comment). So "DPS-only" is **present-but-unsupported**, not
hidden.

Is anything **broken or misleading** for a non-DPS visitor today? From the code,
the tab renders a clean "this spec isn't supported" state rather than erroring or
showing wrong numbers — so it is **honest, not broken**. The cost is cosmetic: a
healer sees a tab that looks like it should work and does not. **Untested:**
whether the current `unsupported-spec` copy names _why_ (no healer/tank ranking
yet) or is generic; worth a glance before deciding, but it does not change the
option's shape.

- **A1 — leave the message (status quo).** Zero work. A visitor on an
  unsupported spec gets a truthful dead-end.
- **A2 — suppress the tab on non-DPS pages.** Hide the tab entirely for specs
  absent from `SPEC_ID_BY_PROTO_SPEC` instead of rendering the message. **Cost
  of the polish (hypothesis):** small and localized — the tab is added
  unconditionally in the shared base class (`individual_sim_ui.tsx:355-356,
448-450`, foundation §5), so suppression means gating that one injection on
  the allow-list, or having the tab remove/hide itself on the unsupported branch.
  This is a fork-UI change in `vendor/tbc-new-fork`, which arms the ported-engine
  /generated-file traps (see `docs/agents/known-traps.md` before editing). Risk:
  low, but it touches the site's tab strip, so it wants a visual check on a
  supported spec (tab still present) and an unsupported one (tab gone).

**Which A sub-choice:** A2 (suppress) is the more honest end state — a tab that
can't do anything for you shouldn't sit there looking clickable — but it is
**polish on a dead end**. If there's any intent to do B or C later, A1 is the
better holding position: the `unsupported-spec` message is exactly the seam B/C
fill in, and suppressing it is throwaway work. Pick A2 only if non-DPS support is
firmly _not_ coming.

**Size: S** (A1 is zero; A2 is a small fork-UI change).

---

## Option B — healers, not tanks

**What ships:** A, plus HPS-ranked gear for the 3 healer specs (Resto Druid,
Holy Paladin, Resto Shaman). A healer opens the tab and sees items ranked by
simmed **HPS delta** instead of DPS.

**The bet:** healing ranks cleanly as HPS — a throughput unit like DPS — while
tank ranking is genuinely harder and more ambiguous (multiple survival metrics,
unmodeled caps). B buys "the clean subset" and defers the messy one.

**Incremental work over A:**

1. **The §3 objective refactor, in full.** `SimObservation` carries the selected
   objective; the CLI/WASM parser reads the objective the run asked for; the
   `*Dps` vocabulary across `rank.ts`, `set-value.ts`, `cutoff.ts`, `view.ts`,
   `rank-report.ts` becomes a neutral "objective delta" (foundation §3). DPS is
   the first objective and must rank **byte-identically** afterward — that is the
   regression gate (foundation §7 step 3). **This is the bulk of B's cost, and B
   pays all of it.**
2. **Resolve the two-copy question** (foundation §5) before writing the refactor.
3. **One healer objective end to end** as the proving spec (foundation §7 step 4):
   read `hps` from the sim, an HPS cutoff (reuses the `Cutoff` shape with a
   renamed field — HPS _is_ a throughput unit, so the five-seed method transfers),
   HPS EP weights, a healer preset and universe.
4. **The remaining two healers** drop back toward the mechanical §4 groove
   (per-spec table rows + data), once the objective is proven.
5. **Spec detection** for the three healer trees (foundation §4) — though for the
   _tab_ path detection is less critical, since the tab knows its spec from
   `player.getSpec()` (foundation §5). Matters for the WCL/standalone path.

**Hard-blocker exposure:** **yes — B requires the full §3 refactor.** There is
no partial version. This is the price of admission past DPS.

### Are healers really the clean subset? (skeptical read)

The bet is only good if healers don't carry their own hidden complexity. Honest
assessment:

- **HPS is genuinely throughput-shaped.** Unlike TMI, HPS is a per-second rate,
  so the `Cutoff`/five-seed noise-floor machinery and the DPS-delta ranking logic
  transfer with a rename, not a rethink (foundation §4 cutoff row; `cutoff.ts:14`
  confirmed). This part of the bet holds.
- **But healing has a throughput-vs-longevity axis DPS lacks.** A healer's gear
  value depends on whether the encounter is throughput-bound (heal as much as
  possible) or mana/longevity-bound (sustain without going OOM). Which one the
  sim rewards is set by the **encounter and duration**, which is _data_ (the
  preset skeleton, foundation §4) — but authoring a _meaningful_ healer encounter
  is a real judgment call, not a mechanical decodelink. A too-short fight prices
  mana/regen at zero; a too-long one over-weights it. **This is where B's hidden
  complexity lives** — not in the engine, in the encounter data.
- **Mana/regen/spirit stats** must be priced by the healer EP weights, and the EP
  question is exactly the open one (see below).

### The trustworthiness question (could sink B regardless of engineering)

**Do the fork's healer sims produce stable, meaningful HPS numbers, and are the
EP presets real?** This is the load-bearing unknown for B and it is **only
partly answerable from the foundation**:

- **EP source looks favorable.** The tab runs on the fork's WASM build, which
  exports `statWeightCompute`, and `StatWeightsResult` holds a separate `hps`
  weight vector; each healer spec declares its own `epReferenceStat`
  (foundation §5, `proto/api.proto:699-703`; e.g. holy paladin
  `ui/paladin/holy/sim.ts:18-20`). **Hypothesis, untested** (foundation §5):
  the tab could source correct HPS EP weights from WASM `statWeightCompute`
  rather than transcribing or finite-differencing. If true, this collapses the
  EP-authoring cost. If false, healer EP falls back to finite-differencing over
  `sim` runs, which for a mana-constrained metric is noisier and needs the
  encounter pinned first.
- **What must be checked before committing to B** (none of this is settled in the
  foundation — it is the first thing a B plan must probe):
  1. Run a healer `sim` on the tab's WASM path for one preset and confirm HPS
     comes back **stable across seeds** at a workable iteration count (the DPS
     five-seed spread found ret SE ≈1.678, feral ≈1.774 at 5000 iters,
     `cutoff.ts`; healer HPS variance is **unmeasured**).
  2. Confirm `statWeightCompute` actually returns a usable `hps` weight vector
     for at least one healer spec (resolve the §5 hypothesis).
  3. Confirm the fork ships a real healer EP preset upstream (foundation §4 says
     healer presets "exist upstream and transcribe the same way" — verify per
     spec, don't assume).
  4. Confirm a role-appropriate healer encounter exists or can be authored
     (heal targets, sensible duration) — the throughput-vs-longevity point above.

If HPS comes back noisy or `statWeightCompute` doesn't yield healer weights, B is
in trouble **even with the refactor done**, because you'd be ranking gear against
numbers you can't trust. That risk is independent of engineering effort and is
the single biggest thing to resolve before choosing B over A.

**Size: L** (dominated by the §3 refactor and the two-copy resolution; the three
healer data sets are M on top, but the refactor is the wall).

---

## Option C — all specs (healers and tanks)

**What ships:** B, plus survival-ranked gear for the 3 tank specs (Bear Druid,
Prot Paladin, Prot Warrior).

**Incremental work over B:**

1. **Add the tank objective end to end** (foundation §7 step 5) — the harder one:
   - **Pick a tank objective** (TMI, DTPS, chance-of-death, threat/TPS). The
     sim emits all of them (foundation §3).
   - **Re-derive the noise floor in the objective's own units.** TMI is not a
     throughput unit, so the `Cutoff.absDps` shape and the five-seed-in-DPS
     method do not transfer — the floor must be built from first principles for
     the chosen metric (foundation §4 cutoff row; `cutoff.ts:14` type confirmed).
   - **Tank cap profiles.** `CapProfile` has **no vocabulary for defense/
     avoidance/uncrit caps** (foundation §4 cap-profile row). A tank row plus a
     possible type extension. This affects only advisory `hitDriven`-style flags,
     **not** the ranking number (foundation §4) — so it degrades gracefully if
     deferred, but a tank without an uncrit/defense notion is advising blind on
     the stat that most defines tank gear.
2. **The remaining two tanks** drop back toward the §4 groove once the objective
   is proven.
3. **Promote `feral-tank`** from a detect-only sentinel to a full `SpecId`
   (foundation §4) — it already exists as a `DetectedSpecId` (`types.ts:40`).
4. **Spec detection** for the tank trees (prot pal, prot warr; bear via
   `classifyFeralForm`, foundation §4).

**Hard-blocker exposure:** **yes — same §3 refactor as B.** C adds no _new_ hard
blocker; it adds a harder _objective_ (TMI/survival) on top of the refactor B
already pays for.

### The sub-question: should the tab offer a choice of ranking metric?

The owner raised this: tanks have multiple survival metrics clearly present in
wowsims (TMI, DTPS, chance-of-death, threat/TPS, all in the sim result,
foundation §3). Should the tab let the user pick "rank by TMI vs. DTPS vs. TPS"?

- **Is per-metric ranking a small addition or its own project?** **Hypothesis:**
  _once the objective is parameterized_ (which the §3 refactor does by
  construction — the run already carries a selected objective), exposing a
  **picker** that switches which metric the run ranks by is a **small** addition:
  a UI control feeding the objective the engine already threads, plus a cutoff
  per selectable metric. The expensive part is **not** the picker — it is that
  **each offered metric needs its own trustworthy noise floor** (a TMI floor and
  a DTPS floor are different derivations, per the cutoff point above). So: the
  _mechanism_ is cheap once §3 lands; the _data_ (a defensible floor per metric)
  is M per metric. Offering three metrics ≈ three floor derivations.
- **Which tank metric is the sensible default?** **TMI** (Theck-Meloree Index).
  It is wowsims' own purpose-built survival index — it folds spike damage and
  death risk into one number the way the tank community already reasons about
  gear, and it is the metric the tank specs' own EP presets reference
  (`tankRefStat`, foundation §5). DTPS is a reasonable _secondary_ (simpler,
  more intuitive) but under-weights spike/burst survival, which is where tank
  gear actually earns its value. Threat/TPS is a _throughput_ concern, not
  survival — a useful third option but the wrong default. **Recommendation:**
  ship TMI as the default; offer DTPS (and optionally TPS) only if the per-metric
  floor work is judged worth it. Do **not** make metric-choice a blocker for
  shipping tanks — a single-metric (TMI) tank tab is a complete product.

### Tank trustworthiness (could sink the tank half of C)

The same skepticism as B, sharper for tanks:

- **TMI is a more fragile number than HPS.** It is a survival index built on the
  _tail_ of a damage-taken distribution, so it needs **more iterations** to
  stabilize than a mean-throughput metric, and its noise floor is a first-
  principles derivation, not a re-measurement (foundation §4). **Untested:**
  whether the tab's WASM sim produces stable TMI at a workable iteration count.
  This is the tank analogue of B's check #1 and must be probed before committing.
- **EP for tanks against the right reference.** Tank specs declare `tankRefStat`
  and `StatWeightsResult` carries a `tmi` weight vector (foundation §5) — so the
  WASM `statWeightCompute` path _should_ yield tank EP, same hypothesis as
  healers, **untested**.
- **Cap modeling gap is most acute for tanks.** Defense/uncrit/avoidance is _the_
  tank gearing axis and `CapProfile` can't express it (foundation §4). A tank
  ranking that ignores the uncrit cap can rank a piece that pushes you over/under
  a cliff as a smooth delta. This is a **correctness** concern for tank advice,
  not just a missing advisory flag, if the cap sits inside the item pool's range.

**Size: L** (the §3 refactor is shared with B; the tank objective, TMI floor
derivation, cap-profile extension, and per-metric picker push C to the larger end
of L — but the _marginal_ cost over B is M-to-L, concentrated entirely in "tanks
are a harder objective," not in any new hard blocker).

---

## Size summary

| Option            | Crosses §3 refactor? | New objective(s)                        | Marginal size over cheaper option          | Total size |
| ----------------- | -------------------- | --------------------------------------- | ------------------------------------------ | ---------- |
| **A** (DPS only)  | No                   | none                                    | —                                          | **S**      |
| **B** (+ healers) | **Yes (full)**       | HPS (throughput-shaped)                 | L (all of §3 + 3 healer data sets)         | **L**      |
| **C** (+ tanks)   | Yes (shared with B)  | TMI/survival (+ optional metric picker) | M–L (harder objective, TMI floor, cap gap) | **L**      |

The step from A to B is a cliff (the refactor). The step from B to C is a slope
(a harder objective on the same foundation). **There is no cheap middle** between
A and B: you cannot ship one healer without the whole §3 refactor.

---

## Recommendation and why

**Recommended: gate on a trustworthiness probe, then commit to C but sequence it
as A → B → C.**

Reasoning:

- **A is a dead end if non-DPS is ever wanted.** A2 (suppress the tab) is
  throwaway work the moment B is on the table, and the `unsupported-spec` message
  is exactly the seam B/C fill. So A is the right _holding_ position (prefer A1,
  don't polish A2) but a poor _destination_ if there's any appetite for healers/
  tanks.
- **B and C share their expensive half.** The §3 objective refactor is the wall,
  and it costs the same for one non-DPS spec or six (foundation headline). Once
  you've decided to pay it, stopping at healers leaves the tank specs
  present-but-unsupported for a fraction of additional cost that is _slope, not
  cliff_. So "B but never C" is rarely the right long-run answer — it pays the
  wall and then declines the cheaper marginal specs.
- **But the whole thing is gated on a question the foundation could not answer:**
  do the fork's healer/tank sims produce **stable, meaningful** HPS/TMI numbers,
  and does WASM `statWeightCompute` yield **real** non-DPS EP weights? (B checks
  #1-4; C's tank analogue.) All of this is **untested** in the foundation
  (foundation §5 marks the EP path an explicit hypothesis). If those numbers are
  noisy or the EP path doesn't deliver, **B and C both fail regardless of
  engineering effort** — you'd rank gear against numbers you can't trust.

**So the sequencing is:**

1. **Probe first, cheaply, before any refactor.** Run one healer and one tank
   `sim` on the tab's WASM path, measure HPS/TMI stability across seeds, and
   confirm `statWeightCompute` returns usable `hps`/`tmi` weight vectors. This is
   a bounded investigation (foundation §7 step 1's prerequisite), not the
   feature. Its output decides everything downstream.
2. **If the probe is green:** do the §3 refactor once (with the two-copy question
   resolved up front), prove one healer end to end (B's proving spec), then one
   tank (C's proving spec, TMI default), then fill the rest. Ship the tank metric
   picker only if per-metric floors earn their keep — TMI-only is a complete
   product.
3. **If the probe is red for healers:** stop at A1 and record why (untrustworthy
   sim), because the wall buys nothing.
4. **If the probe is green for healers but red for tanks:** B is the honest
   destination — ship healers, leave tanks present-but-unsupported.

### The single biggest open question

**Do the fork's healer and tank sims, on the tab's WASM path, produce
stable HPS/TMI numbers and real non-DPS EP weights (via `statWeightCompute`)?**
This is untested (foundation §5), it is cheap to probe _before_ the expensive
refactor, and it is the one answer that decides whether the §3 wall is worth
scaling at all — and therefore whether the choice is A, B, or C.

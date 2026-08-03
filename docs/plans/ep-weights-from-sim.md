# Plan: sim-derived EP weights

**Status:** plan, pre-implementation. No production code changed by this document.
**Branch context:** written on `phase-1/five-seed-spread`.
**Sibling plan:** [`docs/plans/compute-topology.md`](compute-topology.md) — being written
concurrently. Several options below are gated on its outcome; those are marked
**[blocked on compute-topology]**.

Every causal claim here either names a command you can re-run, or is labelled
**hypothesis** / **untested** in the same sentence. This topic has a history of
overclaiming; treat unlabelled prose as claims the author believes are backed by
the adjacent command, and re-run it if it matters.

---

## 1. What EP weights are, here

`data/presets/ret/p2.ep-weights.json` — a 9-entry sparse map from
`proto.Stat` index to weight. It is hand-maintained: no script in this repo
writes it. Verified absent from every generator:

```bash
grep -rn "p2.ep-weights.json" scripts/ packages/ --include=*.py --include=*.ts | grep -v /dist/
```

At time of writing that returns three **readers** (`scripts/assemble_universe.py:25`,
`packages/core/src/cli.ts:191`, and the comment at `scripts/assemble_universe.py:117`)
and zero writers.

Its self-declared provenance is upstream's UI preset:

```json
"source": "wowsims/tbc-new ui/paladin/retribution/presets.ts P2_EP_PRESET",
"pin": "8aa378b3"
```

### 1.1 The provenance claim is true, and incomplete

Fetch the upstream source at the pinned commit:

```bash
gh api "repos/wowsims/tbc-new/contents/ui/paladin/retribution/presets.ts?ref=8aa378b3671a0923fd11fb34b4b3753e53f20c9b" \
  --jq '.content' | base64 -d | sed -n '62,80p'
```

`P2_EP_PRESET` is built from **two** maps passed to `Stats.fromMap`:

| upstream key                           |    value | `proto.Stat` index (`data/proto/common.proto:170-200`) | in our file? |
| -------------------------------------- | -------: | -----------------------------------------------------: | ------------ |
| `StatStrength`                         |      1.0 |                                                      0 | yes          |
| `StatAgility`                          |     0.75 |                                                      1 | yes          |
| `StatSpellDamage`                      |     0.17 |                                                      5 | yes          |
| `StatAttackPower`                      |     0.41 |                                                     17 | yes          |
| `StatMeleeHitRating`                   |     2.15 |                                                     20 | yes          |
| `StatMeleeCritRating`                  |     0.77 |                                                     21 | yes          |
| `StatMeleeHasteRating`                 |     1.17 |                                                     22 | yes          |
| `StatArmorPenetration`                 |      0.1 |                                                     23 | yes          |
| `StatExpertiseRating`                  |     2.14 |                                                     24 | yes          |
| **`PseudoStat.PseudoStatMainHandDps`** | **5.34** |                       _(pseudo-stat, no `Stat` index)_ | **NO**       |

The nine `Stat` entries transcribe correctly. The tenth term —
`PseudoStatMainHandDps: 5.34`, the **largest coefficient in the preset** — is
silently dropped, because our `epScore` (`packages/core/src/stats.ts:22-37`)
indexes a dense `Stat` array and has no pseudo-stat concept at all.

This is the same defect already filed independently from the other direction in
`.scratch/carry-forward/issues/27-ep-score-blind-to-weapon-damage.md` ("EP has
no weapon-damage term"). Ticket 27 frames it as a missing feature of
`ep_score`. It is more precisely a **lossy transcription of a source that has
the term**: upstream priced main-hand weapon DPS at 5.34 and we did not copy the
number across.

**Note on the mitigation already applied:** `SLOTS_WITH_EP_SIGNAL` in
`scripts/assemble_universe.py:140` was narrowed to `{feet, waist, hands, wrist}`
so the junk filter no longer drops weapons on the blind score. That is a
containment, not a fix — the score is still wrong for weapons, it is just no
longer load-bearing for weapon _membership_.

---

## 2. Blast radius — with file:line

The headline claim to establish or refute: **do bad EP weights fabricate the
per-item ΔDPS numbers the tool reports?**

**No. They do not.** The reported `deltaDps` for every ranked item comes from two
real sim runs differenced:

- `packages/core/src/rank.ts:210` — baseline `deps.sim.run(request, runOpts)`
- `packages/core/src/rank.ts:258` — candidate `deps.sim.run(candReq, runOpts)`
- `packages/core/src/rank.ts:272` — `const deltaDps = candObs.dps - baselineDps;`

No EP term appears in that arithmetic, in `deltaPct` (`rank.ts:297`), in `se`
(`rank.ts:309`), or in the sort (`rank.ts:322`). Confirm mechanically:

```bash
grep -n "epWeight\|epScore\|gemEp" packages/core/src/rank.ts
```

Every hit is a gem-selection argument being threaded, never a term in a delta.

### 2.1 Where EP weights _do_ enter — three sites

**(a) Gem fill on candidate items** — `packages/core/src/candidate-gems.ts`.
`rank.ts:462` calls `fillEmptyCandidateGems`, which routes through
`gemFillWeights` (`candidate-gems.ts:103`, zeroing hit/expertise as a softcap
proxy) into `bestGemForSocket` (`candidate-gems.ts:203`, `epScore` picks the
gem) and `layoutScore` (`candidate-gems.ts:245`, EP decides colour-matched vs
free layout, including whether the socket bonus is worth keeping).

**(b) Meta repair** — `packages/core/src/meta-repair.ts:196-198`. The repair
move's cost is `gemEp(from) - gemEp(candidate)`, plus `socketBonusEp` when the
recolour breaks a match. `bestRepairMove` (`meta-repair.ts:208`) picks
strictly-minimum cost, so the weights choose _which of the player's gems gets
sacrificed_ to switch the meta on. Invoked twice: once on the baseline
(`rank.ts:166`) and once per candidate swap (`rank.ts:436`).

**(c) Universe assembly `curationHint`** — `scripts/assemble_universe.py:568`
(`ep_score(stats, w)`), used to sort (`:580`), to slice (`:367`) and — for the
four slots in `SLOTS_WITH_EP_SIGNAL` (`:140`) — as a **membership filter** at
`:391` (`pct < 0.10` → dropped). This is the only site where EP can remove an
item from the ranking entirely.

### 2.2 So what is actually corrupted

**Corrupted by wrong weights:**

- Which gems get socketed into candidate items, and whether a socket bonus is
  taken. Since the gemmed item is then _simmed_, a bad gem choice produces a
  **genuinely lower ΔDPS for a genuinely good item** — the number is honest
  about a set-up we chose badly. This is the real harm: not fabricated numbers,
  but systematically under-gemmed candidates.
- Which of the player's existing gems is destroyed by meta repair, which shifts
  the **baseline** — and the baseline is subtracted from every candidate, so a
  bad repair biases the whole board by a constant.
- `curationHint` ordering, and membership for feet/waist/hands/wrist.

**Not corrupted by wrong weights:**

- `deltaDps`, `deltaPct`, `se`, `rank`, `belowCutoff`, `baseline.dps` (given a
  fixed gem set) — all from `deps.sim`.
- Pool membership for every slot outside `SLOTS_WITH_EP_SIGNAL`.
- Meta gem _identity_: `PREFERRED_META_IDS` (`candidate-gems.ts:47`) hardcodes
  Relentless Earthstorm Diamond ahead of the EP comparison, precisely because
  stat EP mis-ranks metas (ticket 20, closed).

**Honest summary of severity:** "extremely faulty EP weighting" is a real
problem with a narrower mechanism than "the rankings are made up". The rankings
are simmed. What EP corrupts is the _configuration handed to the sim_ and a
four-slot membership gate. That is a serious quality bug and a defensible "big
deal" — items are compared while wearing gems chosen by a scorer that, for the
weapon slot, does not know what a weapon is — but it is not fabrication.

### 2.3 Independent evidence on how weak the EP signal is

`.scratch/handoffs/pool-redesign/ep-vs-sim-measurement.md` (2026-07-28)
measured Spearman ρ between linear EP and simmed ΔDPS over 191 candidates:
overall **ρ=0.183**; trinkets **−0.247**; librams undefined (EP is 0.0 for all
8). Re-runnable per that document via `.scratch/ep-vs-sim/assemble_candidates.py`,
`.scratch/ep-vs-sim/measure.ts`, `.scratch/ep-vs-sim/analyze.py`.

**Caveat, load-bearing:** that measurement scored EP with `generate_pool.py`'s
`ep_score` against this same weapon-blind weights file, so it measures _this
implementation of_ EP, not linear EP in principle. How much of ρ=0.183 is the
missing 5.34 main-hand-DPS term versus a genuine limit of additive stat scoring
is **untested**.

**Superseded prior figure:** a memory record cites "2/16 ret pool EP membership
failure" from a pipeline that has since been deleted. Do not carry it forward.
The measurement doc above also flags a related unreconciled discrepancy (30 vs
36 distinct BiS item IDs). Both are **historical**; neither is a current fact.

---

## 3. Availability verdict — can we compute stat weights today?

### 3.1 The RPC exists in our pinned protocol

`data/proto/api.proto` (~line 517) defines `StatWeightsRequest`,
`StatWeightsStatData`, `StatWeightsStatRequestData`, `StatWeightsCalcRequest`,
`StatWeightsStatResultData`, `StatWeightsResult`. Already generated into
TypeScript:

```bash
grep -n "StatWeightsRequestSchema\|StatWeightsResultSchema" packages/core/src/proto/api_pb.ts
```

Upstream's WASM build exports four entry points for it:

```bash
gh api "repos/wowsims/tbc-new/contents/sim/wasm/main.go?ref=8aa378b3671a0923fd11fb34b4b3753e53f20c9b" \
  --jq '.content' | base64 -d | grep -n 'statWeight'
```

→ lines 35-38 register `statWeights`, `statWeightsAsync`, `statWeightRequests`,
`statWeightCompute`; implementations at 185, 205, 223, 243.

### 3.2 Our pinned CLI cannot reach it — VERDICT: NO

```bash
./vendor/wowsimcli-v0.0.101-win32-x64/wowsimcli-windows.exe --help
```

Output (2026-08-02, verbatim):

```
Available Commands:
  completion  Generate the autocompletion script for the specified shell
  decodelink  decode wowsims link/url
  help        Help about any command
  sim         simulate items & settings
  version     prints version information
```

Corroborated upstream — the command directory has no statweights file:

```bash
gh api "repos/wowsims/tbc-new/contents/cmd/wowsimcli/cmd?ref=8aa378b3671a0923fd11fb34b4b3753e53f20c9b" --jq '.[].name'
# basic_sim.go  decode_link.go  root.go  version.go
```

**Therefore: "just call StatWeights" is not available through the `SimRunner`
seam as it exists.** `SimRunner` (`packages/core/src/seams/sim-runner.ts:27-30`)
is `version()` + `run(req, opts) -> SimObservation`; `SimObservation` carries
`{dps, stdev, iterationsDone, simVersion}` and has no channel for a weight
vector. Any option below that produces weights also requires either a second
method on this seam or a separate offline generator.

Also relevant: `go` is not on PATH in this environment
(`go version` → `command not found`), so any Go-build option starts from a
toolchain install.

### 3.3 Ranked options

| #   | Option                                                                                                                                                                 | Cost                                                                                                                                                                                                                                               | Risk                                                                                                                                       | Verdict                                                                                                                           |
| --- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------- |
| 1   | **Vendor upstream's preset weights, completely** — copy all ten terms including `PseudoStatMainHandDps: 5.34`, and teach the scorer a synthetic weapon-DPS pseudo-stat | Low. One data file + one scorer change (`stats.ts`, `assemble_universe.py`)                                                                                                                                                                        | Low. Weights are hand-tuned by upstream, not sim-derived, and are P2-specific — but they are the same numbers the upstream UI ships        | **Do this now.** Fixes the known concrete defect; unblocks nothing else                                                           |
| 2   | **Finite-difference weights from our own `sim` calls** — perturb one stat at a time on the preset gear via `compose`, sim, divide ΔDPS by Δstat                        | Medium. N+1 sim runs per spec/tier (~10 stats → 11 runs at 3000 iters); pure orchestration over the existing seam, no new binary                                                                                                                   | Medium. Step size and iteration count drive noise; needs enough iterations that the signal exceeds SE. Is _our_ number, fully reproducible | **Best available today.** Only option that yields genuinely sim-derived weights with the current toolchain                        |
| 3   | **Build our own Go binary exposing StatWeights** — add a `statweights` cobra command against the pinned upstream, vendor the built exe                                 | High. Go toolchain (absent here), a fork/patch to maintain, per-platform builds, and a new vendored binary that CI's `sync:wowsims:restore` explicitly does _not_ handle (`docs/workflow.md`: "no secrets and no native binary")                   | High. Breaks the "CI has no native binary" property                                                                                        | Defer                                                                                                                             |
| 4   | **Drive the WASM export** (`statWeights` / `statWeightCompute`) from Node                                                                                              | Medium–High, and **[blocked on compute-topology]** — the wasm artifact is not vendored (`ls vendor/wowsims/` shows only `db.json`, `constants_other.ts`, three gear jsons, one apl json), and running Go-WASM needs upstream's `wasm_exec.js` shim | Medium. Upstream-authored algorithm, so the numbers match the UI. But it introduces a fourth execution surface                             | **Revisit after compute-topology.** If that plan lands a WASM runtime for other reasons, this becomes the cheapest correct answer |

Options 1 and 2 are **not exclusive**: 1 is the immediate correctness fix and
the fallback/comparison baseline, 2 is the durable generator. Ship 1, then
build 2 against it as a cross-check.

---

## 4. Design — a generated, pinned, regenerable artifact

### 4.1 Shape and location

Replace the single hand-edited file with per-spec/tier generated artifacts:

```
data/presets/ret/p2.ep-weights.json      # generated, committed
data/presets/ret/p3.ep-weights.json      # generated, committed
```

Same path as today, so `cli.ts:191` and `assemble_universe.py:25` need only a
tier parameter, not a relocation. Proposed content:

```jsonc
{
  "epVersion": "ret-p2-fd-1", // feeds contentHash (PLAN.md §7)
  "method": "finite-difference", // or "upstream-preset"
  "generator": "scripts/gen_ep_weights.ts",
  "simVersion": "v0.0.101",
  "wowsimsCommit": "8aa378b36...",
  "baseline": {
    "gearPreset": "ret_p2.gear.json",
    "seed": 42,
    "iterations": 30000,
  },
  "steps": { "0": 100, "17": 200, "20": 50 }, // per-stat perturbation used
  "weights": {
    "0": 1.0,
    "1": 0.75,
    "5": 0.17,
    "17": 0.41,
    "20": 2.15,
    "21": 0.77,
    "22": 1.17,
    "23": 0.1,
    "24": 2.14,
  },
  "pseudoWeights": { "mainHandDps": 5.34 }, // the term we currently drop
  "se": { "0": 0.03, "17": 0.02 }, // per-weight standard error
}
```

Two things this buys that the current file cannot: `epVersion` is a real
identifier rather than a git blob, and `se` makes "is this weight
distinguishable from zero?" answerable — which is what the sanity check in §5
needs to avoid false alarms on genuinely tiny weights.

### 4.2 Regeneration

`scripts/gen_ep_weights.ts`, run explicitly (never inside `pnpm verify` —
it needs the native binary and tens of thousands of iterations):

```bash
pnpm gen:ep-weights --spec ret --tier p2
```

Method (option 2): load the tier's gear preset, `compose` a request, sim the
baseline, then for each stat in the ret stat set sim a perturbed copy with
`+Δ` of that stat, and take `w_i = (ΔDPS_i / Δ_i)` normalised so
`w[StatStrength] = 1.0` (matching upstream's convention, which anchors on
Strength — see the table in §1.1). Main-hand DPS gets the same treatment via
weapon-damage perturbation rather than a `Stat` index, and lands in
`pseudoWeights`.

**Untested:** whether 30000 iterations is enough for the smaller weights
(ArmorPenetration at 0.1, SpellDamage at 0.17) to separate from noise. The
first task of implementing this is to measure the SE at a candidate iteration
count and raise it until `se < 0.1 * weight` for every emitted term, or to emit
the term as `0` with a recorded reason. Do not ship weights whose SE is unknown.

### 4.3 Interaction with `contentHash` (PLAN.md §7)

§7 already reserves `epVersion` in the hash, with the stated rationale that "a
change to the EP weights changes which items got simmed at all". That rationale
is **partly stale under the current code** — the only EP-driven membership
filter today is `assemble_universe.py:391` over four slots, and that runs at
_universe build_ time, upstream of `rankUpgrades`, so it is already captured by
`poolId`/`poolVersion`. But EP still changes gem fill and meta repair, which
change the composed `RaidSimRequest`, which changes every delta. So `epVersion`
belongs in the hash for a _different and stronger_ reason than §7 states.

Concretely: `epVersion` from the artifact goes into `contentHash`. Bumping the
weights invalidates cached rankings, which is correct — the numbers really do
move.

### 4.4 Interaction with "every number is reproducible" (PLAN.md §2)

Today the weights fail that constraint: no command reproduces them, and their
declared source turns out to be transcribed lossily (§1.1). Under this design
the artifact records generator, sim version, upstream commit, seed, iterations
and perturbation steps — so `pnpm gen:ep-weights --spec ret --tier p2` is
expected to reproduce the committed file byte-for-byte.

**Hypothesis, must be verified during implementation:** that wowsimcli is
deterministic for a fixed (request, seed, iterations) triple, so the
finite-difference weights are reproducible rather than merely stable-ish. The
`RecordedSimRunner` fixture design (`seams/sim-runner.ts`) assumes this for
replay, which is suggestive but is not a proof for a _live_ binary on a
different host. Verify by running the generator twice and diffing, and on at
least one non-Windows host before claiming cross-platform reproducibility.

### 4.5 Verification

A `--check` mode (`pnpm gen:ep-weights --check`) regenerates into a temp file
and byte-compares against the committed artifact, mirroring the existing
byte-compare discipline in AGENTS.md § Durable claims. It **cannot** run in
`pnpm verify` (needs the native binary, which CI does not have). It is a manual
pre-merge step whenever the artifact or generator changes, and its output goes
in the commit message.

---

## 5. Detection — how we would have caught this automatically

This is the highest-value part of the plan, because the failure was silent for
months and neither the type system nor any test objected.

### 5.1 Why nothing caught it

The weights are `Record<string, number>`. Every value is a valid number.
`epScore` (`stats.ts:22`) sums `stats[i] * w` and returns a number for any input,
including `{}` (returns 0.0 for everything) or sign-flipped weights. There is
no assertion anywhere that the weights are _sane_ — only that the code that
consumes them runs.

Worse, the specific defect here is a **missing key**, and `epScore`'s documented
contract is "missing weight → 0". Silently pricing the single largest term at
zero is the designed behaviour of the scorer. A missing-key check would have
caught it; nothing performs one.

### 5.2 Proposed check: `packages/core/test/ep-weights-sanity.test.ts`

A pure unit test over the committed artifact — no sim, no binary, no network, so
it runs in `pnpm verify` and in CI. It asserts **invariants of the physical
class**, not specific values, so it does not need updating when a regenerated
weight moves from 0.77 to 0.81.

For a melee physical DPS spec (ret), against `data/presets/ret/*.ep-weights.json`:

**Tier A — completeness (catches the actual bug).**

1. Every stat in the spec's declared required set is **present as a key**. For
   ret: Strength, Agility, AttackPower, MeleeHit, MeleeCrit, MeleeHaste,
   ArmorPenetration, Expertise. A missing key fails with the stat name — not a
   silent 0.
2. The declared pseudo-stat set is present. For ret: `mainHandDps`. **This one
   assertion, written any time in the last several months, fails today** on
   `data/presets/ret/p2.ep-weights.json`.

**Tier B — sign and magnitude.** 3. Every listed offensive weight is `> 0`. A negative Strength weight for a
melee spec is never correct, and negative weights are exactly how a
finite-difference generator reports "my SE swamped my signal". 4. Every weight is finite and `< 100` in Strength-normalised units — a runaway
division in the generator produces absurd magnitudes, and a hard ceiling
catches it without pinning any real value. 5. `weights[Strength] === 1.0` — the normalisation anchor. If it drifts, the
whole vector is on an unknown scale and cross-tier comparison is meaningless.

**Tier C — ordering (the domain judgement).** 6. `Strength > Agility`. Ret gets 2 AP per Strength and Agility contributes
only crit and a small amount of AP; a vector where Agility leads Strength is
a caster/rogue vector in a paladin file. _(Holds upstream: 1.0 vs 0.75.)_ 7. `MeleeHit > AttackPower` and `Expertise > AttackPower` **while below the
respective caps**. A miss is a 100% damage loss; raw AP is linear. _(Holds
upstream: 2.15 and 2.14 vs 0.41.)_ Guard this one behind an explicit
"uncapped" flag on the artifact, since a hit-capped preset legitimately
prices hit near zero — that is what `gemFillWeights`
(`candidate-gems.ts:103`) already models by zeroing hit and expertise, and
the test must not contradict its own codebase. 8. **Caster stats must be absent or strictly dominated.** Intellect (3),
Spirit (16), MP5 (14) and Spell Crit (10) must each be either absent or
`< 0.1 * weights[Strength]`. SpellDamage (5) is deliberately exempt with a
ceiling instead: it must be `<= 0.5 * weights[Strength]`, because ret
genuinely scales a little from spell power (0.17 upstream) but must never
approach a melee stat. 9. `pseudoWeights.mainHandDps > weights[Strength]`. On a two-hander, weapon DPS
is the dominant term. _(Holds upstream: 5.34 vs 1.0.)_ This is the assertion
that keeps §1.1 from silently regressing after it is fixed.

**Tier D — cross-tier drift, when a second tier exists.** 10. For any stat present in both p2 and p3, the ratio must sit within
`[0.5, 2.0]`. Tier-over-tier gear changes shift weights; they do not
triple them. A transcription error in one file surfaces as a violation.

**Fail message contract:** each assertion names the stat, the observed value,
the bound, and the file — the failure has to be actionable by someone who has
never read this plan.

### 5.3 A second, cheaper guard

`epScore` currently returns `0` for a missing weight with no signal. Add a
strict variant used only by the generator's self-check and by the sanity test:
given a declared required-key set, throw on a missing key. Keep the lenient
runtime behaviour — items legitimately carry stats we do not price — but stop
letting _the weights file itself_ be silently incomplete. **Untested design
note:** this is a test-only seam and must not change `epScore`'s production
signature, or every caller in §2.1 becomes a change site.

### 5.4 What this does not catch

Sanity invariants catch _broken_ weights. They cannot catch _mediocre_ weights —
a vector that is internally coherent but 20% off the true gradient passes every
assertion above. That is what §4.2's `se` field and a periodic re-run of the
ρ measurement in `.scratch/ep-vs-sim/` are for. Do not oversell the test.

---

## 6. Phasing

**Now — unblocked, no compute-topology dependency.**

- **P0-a.** Write the §5.2 sanity test _first_, red. Tier A2 and Tier C9 should
  fail against the current `p2.ep-weights.json`. That failing test is the
  durable artifact of this whole investigation.
- **P0-b.** Green it via option 1: add `pseudoWeights.mainHandDps: 5.34` and
  teach `epScore` a weapon-DPS term (synthetic pseudo-stat), plus the matching
  path in `scripts/assemble_universe.py`. Closes
  `.scratch/carry-forward/issues/27-ep-score-blind-to-weapon-damage.md`.
- **P0-c.** Re-run the `.scratch/ep-vs-sim/` measurement with the corrected
  weights and record the new overall and per-slot ρ. **Hypothesis:** the weapon
  slot and the overall figure improve; trinkets and librams do not, since their
  value is structural, not stat-borne. Untested — the point of running it.
- **P0-d.** Reconsider returning `weapon` to `SLOTS_WITH_EP_SIGNAL`
  (`assemble_universe.py:140`) **only if** P0-c shows it earned. Default is to
  leave it out.

**Next — option 2, still unblocked.**

- **P1-a.** `scripts/gen_ep_weights.ts` + `pnpm gen:ep-weights`, emitting the
  §4.1 shape with `se`. Determine the iteration count empirically (§4.2).
- **P1-b.** Verify determinism (§4.4) by double-run diff, and on a second host
  before any cross-platform reproducibility claim.
- **P1-c.** Wire `epVersion` into `contentHash` (PLAN.md §7).
- **P1-d.** Compare generated weights against the upstream preset. **They will
  differ** — upstream's are hand-tuned against their own preset gear, ours are
  measured against the caller's logged gear — so decide deliberately which
  ships, and record the decision. Divergence is not automatically a bug.

**Blocked on [`compute-topology.md`].**

- **P2-a.** Option 4 (WASM `statWeightCompute`). If compute-topology lands a
  WASM runtime, this becomes the cheapest way to get upstream-identical weights
  and probably supersedes P1's finite-difference generator. Do not build a WASM
  path _for this reason alone_ — the cost only makes sense amortised across
  whatever else that plan needs it for.
- **P2-b.** Per-character weights. Weights measured against the _player's_
  logged gear are strictly more correct than tier presets, but multiply sim cost
  by ~11 per ranking run. Whether that is affordable is exactly the
  compute-topology question.

**Explicitly not doing:** option 3 (custom Go binary). It breaks the "CI has no
native binary" property recorded in `docs/workflow.md` § CI, for a result option
4 gets without a fork.

---

## 7. Open questions

- Is `wowsimcli` bit-deterministic for a fixed (request, seed, iterations)
  across hosts? **Untested.** Gates §4.4's reproducibility claim.
- How much of ρ=0.183 is the missing main-hand-DPS term? **Untested.** P0-c
  answers it.
- Should the ret weights be hit-capped or uncapped at the source, given
  `gemFillWeights` zeroes hit/expertise downstream anyway? Currently the
  artifact is uncapped and the caller caps. That split is undocumented and the
  Tier C7 assertion has to know which convention it is asserting against.
- The 30-vs-36 distinct BiS item ID discrepancy noted in
  `.scratch/handoffs/pool-redesign/ep-vs-sim-measurement.md` remains
  unreconciled. Not blocking this plan; flagged so it is not treated as closed.

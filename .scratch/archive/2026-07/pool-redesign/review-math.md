# Math critique — pool-formation redesign (Options A & B)

**Author:** Math critic (adversarial / quantitative)  
**Inputs:** `pool-redesign-external-brief.md`, `option-a.md`, `option-b.md`; grounded against PLAN §8.3 / §8.3.3, `.scratch/handoffs/pool-composition-audit.md`, current generate/curate shape.  
**Non-goals:** No implementation, no `ret.json` regen, no land/merge.  
**Naming:** “Sovereign Nightseye” is one purple gem — not two gems.

**Owner premise (accepted as design constraint, not debated here):** linear reference EP as membership is **absolutely** inadequate. If the same poison EP is used in generate **and** rank-time prefilter, **both stages are doomed**. Cap-clipped / player-aware EP (PLAN §8.3.3) is a better *local* filter in theory but is **not** assumed to rescue membership; this review treats “less wrong EP” as insufficient unless proven otherwise.

---

## 1. Scope / axes of critique

| Axis | What it means for pool formation |
|------|----------------------------------|
| **Approximation quality** | How well the membership score / rule approximates the offline quantity we actually care about: “items that can produce large positive ΔDPS as single-slot swaps for *some* competent ret gear point in the product’s phase band.” Not: “items that are BiS in a full combinatorial set.” |
| **Selection bias** | Systematic over-/under-inclusion relative to that target: editorial fashion, shell geometry, structural proxies (ilvl, white DPS), hardbands, plate/leather gates, phase quotas. |
| **Determinism / reproducibility** | Same pinned inputs → same pool; sensitivity to human transcription, sim noise, seed, iteration count, gem-fill path, shell recipes. |
| **Cost** | Offline build cost vs rank-time sim budget; scaling with phase, slot count, shells, iterations. |
| **Correlated failure** | Shared blind spots across stages (classic: same EP in generate + prefilter). Also: correlated errors across shells, across list sources, or between membership proxy and final high-iter ranking. |

**Framing reminder:** Product ranking authority remains high-iter wowsimcli ΔDPS. Pool formation only chooses who enters the budget. A “perfect” pool still produces negative deltas on some characters (set break, caps) — that is not a membership failure. Membership fails when chase pieces never enter, or when sim budget is dominated by items that are near-certain losers under any reasonable shell.

**Empirical anchor (repo):** pool-composition audit — Twinblade ~74 ref EP vs hit-heavy rares ~125–140 EP; P2 weapon pool survivors at −186…−276 ΔDPS; those losers sit at EP ranks 3–7 of 69 and survive any global top-80 EP cut. Of 36 unique IDs in vendored ret gear sets, only 9 appear in committed `ret.json` (Option A claim — treat as re-runnable regression, not myth). That is absolute membership failure, not softcap noise.

---

## 2. Critique of Option A (lists-first)

### 2.1 Approximation quality

**What A approximates:** the *editorial consensus set* of chase / alt items, not a measured DPS surface.

That is a **category change**. Approximation error is no longer Taylor residual of a linearization; it is:

1. **Bias of the guide toward whole-set BiS** — guides optimize (approximately) for complete sets with planned set bonuses, consumables, and often a specific hit/expertise budget. Product ranks **single-slot swaps** on *this* logged set. The membership universe from BiS tables is still a strong prior for “items humans chase,” but it is **not** an unbiased sample of “items with large single-swap Δ on arbitrary mid-sets.” Set pieces that win only as a package may look weak in-product (expected); worse, **sleeper single-swap upgrades** that guides omit (badge craft, odd trinket, previous-tier stick that still wins on a starved shell) are invisible to membership.

2. **Union ≠ coverage of the ΔDPS frontier.** Union of BiS + Alt rows expands recall vs BiS-only, but Alt rows are still editorial. There is no guarantee that the ΔDPS-maximizing swap for a weird logged set sits in any transcribed table. A’s EP-shadow “high EP not in list” queue is an escape hatch that **reintroduces the poison metric as a discovery aid**. Used carefully (human accept/reject), it is a bias check; used as auto-admit, it recreates EP membership through the back door.

3. **Provenance trim as secondary filter.** If density blows past budget and A trims by `wowsims∪Wowhead-bis > alt > community > stale-seed`, that is a **discrete priority approximation**, not a continuous score. It is deterministic and EP-free — good — but it systematically prefers “famous” over “high Δ on this player.” That matches A’s thesis; mathematically it is **biased toward social consensus**, which may be exactly what the owner wants for a mid-gear upgrade tool, or may starve mid-tier alts that only appear in one weak layer.

**Verdict on approx quality:** Strong for “does the shortlist look like a ret chase list?” Weak as a claim that membership ≈ argmax single-swap Δ. A does not pretend otherwise; the math risk is **overclaiming** that list union is the same as principled narrowing of the DPS surface.

### 2.2 Selection bias (guide consensus)

Concrete bias modes:

| Bias | Mechanism | Failure mode |
|------|-----------|--------------|
| **Publisher monoculture** | Anniversary Wowhead + few peers | Shared wrong meta after patch; union of agreeing wrong sources ≠ truth |
| **Phase fashion** | Guides overweight current tier | Underweight competitive previous-phase / badge pieces unless Alt + carryover are mandatory and dense |
| **Set-centric editing** | Tables built for BiS sheets | Over-include tier tokens that lose as single swaps; under-include non-BiS hit sticks for starved players |
| **Armor-path fashion** | Leather BiS enters only if guides cite it | Better than plate-only EP — but if Anniversary guide lags Classic leather picks, leather vanishes again **without FORCE theater**, silently |
| **PvP / craft visibility** | Default-off PvP; craft only if listed | Systematic holes for players whose best upgrade is arena/craft |
| **Survivorship of transcription** | Humans copy what is easy to see in tables | Footnotes, “also consider,” patch notes get dropped → density gate may pass on incomplete Alts |

**Guide consensus as Bayesian prior:** Treating lists as a high-quality prior over “items worth simming” is defensible given the audit (lists beat EP top-12). Treating consensus as **ground truth membership** imports **correlated editorial error** into every rank run until someone re-transcribes. That is a different risk class from EP: slower, human-paced, but **global** (all users see the same hole).

### 2.3 Coverage holes

Mathematical coverage of Stage-0 universe (~thousands) by list union (~150–250 after filters) is intentionally tiny. Holes that matter:

1. **Recall hole for unlisted positive-Δ items** — false negatives. Severity scales with how “weird” player gear is relative to guide shells. Product is *relative upgrades for this set*; mid-progression characters are exactly where guide BiS and player shell diverge most.
2. **Phase-band hole for P3–P5** — wowsims `tbc-new` sets stop at P2; A leans on Wowhead transcription. Coverage quality becomes **human-process-dependent**, not pin-dependent. Math: regenerability from vendor pin alone is lost above P2.
3. **Density gate (0–2 block, 3–5 warn)** — good for empty slots; does **not** detect “wrong 8 items.” A full slot of wrong Alts passes the gate. Gate is a **cardinality** check, not a **quality** check.
4. **Kael / libram / 2H rules** — hard filters are high-precision for known product constraints; low risk if ID lists stay current. Polearm INCLUDE-by-default changes support vs today’s generate; that is policy, not math, but it changes the measure of the universe lists can pull from.

### 2.4 Determinism of human transcription

| Source of non-determinism | Severity | Notes |
|---------------------------|----------|-------|
| Wrong `itemId` / slot | High | CI can catch id∉db and slot mismatch; cannot catch “right slot, wrong alt of same name family” without golden diffs |
| Incomplete Alt capture | High | Silent; density may still look fine |
| Guide URL / patch drift | High | `retrievedAt` helps audit; does not auto-update |
| Disagreement protocol (union both) | Medium | Deterministic if rule is fixed; pool size and composition jump when a second source is added |
| Stale-seed from old `wowsims/tbc` | Medium | Deterministic from pin, but **biased to 2021 meta** — false confidence of “automated” |
| EP-shadow review queue | Low–medium | If humans inconsistently promote high-EP misses, pool becomes path-dependent on curator mood |

**vs EP generate:** EP top-12 is *machine*-deterministic and *content*-wrong. A trades wrong determinism for **human-process** determinism. For CI, A is reproducible **iff** manifests are committed and assembly is pure. The math critique: **reproducibility of the build ≠ correctness of the measure.** A scores well on the former once manifests exist; correctness tracks editorial freshness.

### 2.5 Cost

| Cost center | Assessment |
|-------------|------------|
| Engineering | Low–moderate (union script, kill EP prefilter) — not the binding constraint |
| Human curation | Dominant OPEX — transcription + refresh. Underestimated if Anniversary guides churn or Alts are deep |
| Rank-time | Full phase-filtered list (~80–180) at high iter — same order as today’s `--full-pool`. Acceptable **if** membership is high-precision. Waste shifts from “simming EP garbage” to “simming editorial Alts that lose on this character” — better waste, still O(n) |
| Provenance trim under budget pressure | Cheap, but reintroduces a discrete approximation with consensus bias |
| Optional EP shadow report | Near-free; **political** cost if someone later wires it into a gate |

**Cost–quality coupling:** A’s sim budget is spent on a high-recall-of-fame set. That is efficient for SME-looking shortlists; inefficient for discovering unlisted sleepers (by design).

### 2.6 Correlated failure under A

- **Not** double-poison EP — A correctly banishes EP from membership and default prefilter. Good.
- **Correlated editorial failure:** wowsims sets + Wowhead often share community consensus; union does not give independent samples of truth. Disagreement is rare; when both are wrong, A has no quantitative backstop except the optional EP-shadow queue (poison) or a later SME audit.
- **Rank-time full list:** if membership is wrong, high-iter ranking cannot invent missing IDs — same structural limit as today, different missing set.
- **Shadow EP as “QA”:** any pipeline that auto-flags “admit if EP high” recreates correlated failure with historical generate. Keep shadow **report-only** or the option collapses toward today’s dual use.

### 2.7 Strongest failure modes (A) — ranked

1. **Stale / incomplete transcription** → systematic false negatives on real chase pieces (especially leather, mid-tier alts, post-patch).
2. **BiS-set prior ≠ single-swap prior** → wasted sims on package BiS; missed sleepers.
3. **Cardinality gates ≠ quality gates** → green CI, wrong pool.
4. **Temptation to EP-trim or EP-admit** under budget / FOMO → return of poison.
5. **P3+ coverage entirely human** → non-pin regenerability failure; Anniversary drift.

---

## 3. Critique of Option B (quant-first / sim-anchored)

### 3.1 Approximation quality

**What B approximates:**  
\[
\operatorname{score}(i) \approx \max_{s \in \mathcal{S}} \Delta_{\text{low-iter}}(i; s)
\]
or the related **union of per-shell top-K**, then keep top-K per slot.

This is a **far better class of approximation** to the product’s ranking quantity than linear EP: same model family (wowsimcli DPS), same swap algebra, gem fill closer to production. Remaining gaps are statistical and geometric, not “wrong feature vector.”

**Still an approximation trap — “not EP” ≠ “not approximate”:**

1. **Shell geometry ≠ player geometry.** Membership is “good for at least one pinned shell,” not “good for this player.” That is intentional (offline pool), but it is the same *kind* of distribution shift PLAN §8.3.3 worried about for reference EP — now in sim space. A hit-starved shell helps; a finite shell set still leaves **open sets of gear points** where the true top-K differs.
2. **Single-swap on shell ≠ combinatorial BiS** — shared with product; B correctly refuses full set solve. Set-break shell + set hardband mitigate under-sampling of tier; they do not eliminate multi-piece interactions.
3. **Stage-1 structural narrow** is a **second approximation** in front of the sim. `white_dps + 0.02·ilvl` and `ilvl + 8·sockets + …` are sparse proxies. They are not `p2.ep-weights.json`, but they **can still systematically exclude** items whose value is almost pure effect / unusual budget (unless hardbanded). Mail −5 bias is a soft prior; small but explicit selection bias.
4. **Low-iter Δ** is a noisy estimator of high-iter Δ. Cutoffs at K induce **rank-flip error** near the margin (see §3.3).
5. **Gem-fill EP for local socketing** — B argues this is fill heuristic, not membership. Strictly: fill errors **bias** Δ, which **is** membership. Softcap-aware fill reduces but does not eliminate correlated under-rank of socket-heavy leather if the fill policy is wrong. Double-poison risk is **weaker** than ref EP in generate+prefilter, but **score leakage** through gem weights is real (see §3.6).

**Verdict:** B’s membership objective is aligned with the product metric up to shell coverage and Monte Carlo error. That is the strongest quantitative thesis on the table. It is not “exact”; claiming “sims decide membership so approximation is solved” would be false confidence.

### 3.2 Shell bias

Concrete shell failure modes:

| Failure | Math shape | Consequence |
|---------|------------|-------------|
| **All shells hit-capped plate** | Support of \(\mathcal{S}\) misses starved / leather-friendly points | Leather / hit pieces rank out despite real player value |
| **Weapon tier locked** | Mid shell always same stick | Weapon Δ distribution compressed; alt sticks near cutoff flip with noise |
| **Set-break under-specified** | Only one partial set | Other `setId`s undervalued; hardband must carry them or they die in Stage-1 |
| **Shells too similar** | Correlated \(\Delta(i,s)\) across \(s\) | `max_s` ≈ single-shell; multi-shell marketing without multi-shell information |
| **Shells too extreme** | Starved shell overweights hit trash | Hit rares re-enter top-K the way EP did — via a different door |
| **Scripted “max white_dps ≤ phase” mid shell** | Optimizes for white DPS construct | May not resemble any real logged mid-progression set; membership optimizes for synthetic geometry |

**Union of per-shell top-K vs `max Δ`:**

- **`max Δ`:** one noisy spike on one shell can admit an item; favors variance and shell-specific weirdness.
- **Union top-K:** admits if stably good on any shell’s ranking; still admits shell-specific winners, but requires placing in top-K not merely large positive Δ on a weak baseline.
- Neither estimates \(\mathbb{E}_{s \sim \text{players}}[\Delta]\). Both estimate a **robustness-to-pinned-anchors** surrogate. Golden ID hit rate is the right empiric check; asymptotic unbiasedness is not claimed.

**N = 3 starting shells:** under-powered for a 5-phase, multi-cap, multi-armor surface. Information-theoretically, three points cannot span hit×expertise×weapon-tier×set-state. B’s own open questions admit this; math critic: **prototype must measure shell ablation** (drop one shell → which goldens die?) before trusting N.

### 3.3 Low-iter noise

Rough model: for iterations \(I\), SE of mean DPS scales ~ \( \sigma / \sqrt{I} \). Δ between two correlated configs has SE depending on pairing; B proposes independent low-iter runs → **independent** noise on candidate and (if re-simmed) shell, so  
\[
\mathrm{SE}(\hat\Delta) \approx \sqrt{\mathrm{SE}_c^2 + \mathrm{SE}_s^2}
\]
(order-of-magnitude; not a substitute for measuring ret σ at 500 iter).

Implications:

1. **Near-K cutoff items** have non-trivial P(flip in/out) across seeds → **pool churn** on regen unless widen-band / dual-seed / commit proxy table with sticky inclusion.
2. **Trinkets / librams / procs** have heavier-tailed DPS → need **higher I** or wider K than weapons for stable top-12. B’s open question (500 vs 1500) is load-bearing, not polish.
3. **Fixed seed** → deterministic given pin, but **biased** to that seed’s noise realization. Dual-seed “keep if either in top-K” reduces false negatives, increases false positives and pool size — classic precision/recall tradeoff.
4. **Correlation with final high-iter rank:** low-iter top-K is a noisy screen. Items deep in top-K (large Δ) are likely stable; margin items may be reshuffled at 5k iter. That is acceptable if K is wide enough that true high-Δ items are rarely below K − margin.

**Falsifiable claim to demand in prototype:** for weapons + waist, Spearman / top-K Jaccard between 500-iter membership order and 5k-iter order on the same shells exceeds a stated threshold (e.g. top-12 Jaccard ≥ 0.8 across 3 seeds).

### 3.4 Cost of multi-shell sims

B’s Stage-2 estimate (~25–90 min offline for ~500 × N × ~1s) is the **central economic claim**. Adversarial checks:

1. **Slot-parallelism** helps wall clock; total CPU-seconds still ~ O(|C| · N · cost(I)). Pin bumps force full regen — operational cost, not one-time.
2. **Effect hardbands** (all librams + effect trinkets + set pieces) can dominate |C| if phase-banding is loose → Stage-2 cost spikes without struct top-M helping.
3. **Rank-time cheap re-sim prefilter** (~150 × 500) adds user-facing latency on every rank unless cached carefully; `contentHash` must include prefilter policy. Preferring `fullPool` of ~180 at Phase-1 density is often cheaper *in engineering complexity* than a second sim layer — B already says this; math agrees: **don’t pay twice for approximation** unless |pool| grows.
4. **vs A:** A pushes cost into humans and rank-time list sims; B pushes cost into offline sim farm. For a solo repo, **offline 25–90 min per pin bump** is acceptable if automated; **fragile** if Stage-2 is manual or flaky.

### 3.5 Stage-1 structural filter — “not EP” still a trap

Banned: `p2.ep-weights.json`. Still present:

- **Ilvl** as armor/jewelry score — correlates with power, fails for low-ilvl high-effect, classic leftovers with high ilvl relative to dead content, and socket-poor high-ilvl plate vs socket-rich leather.
- **White DPS** for weapons — **correct direction** vs current stats-only EP (audit). Still ignores strength/AP/hit on the weapon, expertise, and procs. A pure white-DPS top-M can drop a lower-DPS stick that wins on stats+gems in Stage-2 **if it never enters Stage-2**. Hardbands do not cover most weapons.
- **Socket count × 8** — favors leather; good for known BiS story; can flood Stage-2 with socketed trash if quality floor is weak.
- **Per-phase quotas** — necessary to stop P1 classics crowding P3; quota sizes are **tuning knobs with no unique optimum**. Wrong quotas → coverage holes that look like “sim said no” but were Stage-1 starvation.

**Strongest Stage-1 attack:** any scalar that is not ΔDPS can recreate “Twinblade loses to hit rare” **in a different coordinate system** (e.g. if white DPS fudge is wrong, or a high-white low-stat stick crowds out a mid-white high-stat stick before Stage-2). B must prove Stage-1 **admits** golden weapons/leather **before** celebrating Stage-2.

### 3.6 Double-poison / score-leakage risks

| Leak path | Is it double poison? | Severity |
|-----------|----------------------|----------|
| Store `simProxy` then prefilter rank-time by **reference EP** | Yes — classic; B forbids | Critical if someone “temporarily” re-enables |
| Prefilter by **stored `simProxy` score** (shell max Δ) | Soft poison: membership and prefilter share **shell geometry**, not player geometry | High — demotes player-specific winners that were only mid on shells |
| Player-local finite-difference / scale factors at rank time | Not generate poison; still linear local approx | Medium — PLAN §8.3.3 class; better than ref EP, worse than cheap re-sim for procs/sets |
| Gem fill uses `p2.ep-weights.json` in Stage-2 | Membership Δ contaminated by EP | Medium — especially sockets/meta; mitigate with production softcap fill + fill ablation |
| Stage-1 secretly reintroduces clipped EP “just to shrink” | Full poison return | Critical — B correctly bans; process must enforce |
| Golden FORCE list used as **admission** not oracle | Curation theater return | Medium — political regression |

**Player cheap re-sim prefilter** is the cleanest rank-time narrow: same metric family, player point, no ref EP. Cost is the objection. Using **shell simProxy to prefilter player ranks** is the subtle failure — it looks “sim-based” and “not EP” while recreating **correlated shell bias** at both stages.

### 3.7 Determinism

Given pinned: db, wowsimcli, skeleton, shells, seeds, I, gem palette, Stage-0/1 rules → pool should be regenerable. Weak points:

- Floating / OS variance in sim (if any) → need CI tolerance or sticky inclusion bands.
- Shell recipes that embed “strip hit from gems” depend on fill path — version those recipes.
- `simProxy` in `contentHash` / `poolVersion` — B’s open Q9 is mandatory; otherwise cache lies.

### 3.8 Strongest failure modes (B) — ranked

1. **Shell coverage hole** → systematic false negatives (leather/hit/set) that look like “objective sim truth.”
2. **Stage-1 structural exclusion** → goldens never reach Stage-2; sim never gets a vote.
3. **Low-iter cutoff noise** → unstable pools, false confidence in committed proxy tables.
4. **Rank-time prefilter by shell `simProxy`** → correlated double approximation (shell×shell).
5. **Gem-fill EP leakage** → socketed BiS under-ranked.
6. **Cost / pin-bump churn** → pressure to shrink N, I, or revive EP Stage-1.

---

## 4. Head-to-head on math axes

| Axis | Option A | Option B | Edge |
|------|----------|----------|------|
| **Approx quality vs single-swap Δ** | Editorial prior; weak formal link to Δ | Same model as ranking; shell+noise gap | **B** (conditional on shells + Stage-1 admitting candidates) |
| **Approx quality vs “chase list” credibility** | Directly optimizes social consensus | Indirect; may miss famous BiS if shells wrong | **A** |
| **Selection bias** | Guide monoculture, BiS-set prior | Shell geometry, struct proxies, hardbands | Different; **A** bias is human-correlated, **B** bias is synthetic-geometry |
| **False negatives on famous BiS** | Low if transcription fresh + wowsims union | Depends on goldens + shells; risk of “objective” miss | **A** for fame recall; **B** must buy recall with goldens/hardbands |
| **False positives (sim waste)** | Editorial Alts that lose on player | Struct-top + shell winners that lose on player | **Comparable**; B may admit more “shell weirdness” |
| **Determinism** | Pure given manifests; manifests are human | Pure given pins; noise needs sticky rules | **B** slightly better for machine regen; **A** better for “no Monte Carlo” |
| **Cost offline** | Low compute, high human | High compute, lower ongoing human (sources still) | Depends on labor vs CPU |
| **Cost rank-time** | Full list default | Full list or cheap re-sim | Similar if both ~180 |
| **Correlated failure / double poison** | Avoids EP; editorial correlation remains | Avoids EP if disciplined; shell/`simProxy`/gem EP are leak paths | **A** simpler to keep EP-clean; **B** higher vigilance load |
| **Regenerability from pin alone (P3+)** | Weak (needs Wowhead manifests) | Strong (db + sim) | **B** |
| **PLAN §8.3.3 player-aware EP** | Out of critical path | Explicitly rejected as membership; optional inferior prefilter | Both align with owner “EP inadequate”; B closer to replacing the *role* of prefilter with sims |

**Neither dominates all axes.** A maximizes **recall of consensus chase pieces** with minimal Monte Carlo theory. B maximizes **metric alignment** with residual **shell and Stage-1 approximation risk**. The owner’s “EP is absolutely inadequate” is satisfied by both **if and only if** neither reintroduces ref EP as a gate; B can fail that socially under cost pressure; A can fail it via “shadow EP admit.”

**Hybrid temptation (math view):** use A lists as a **hardband / golden recall set** inside B Stage-1, and B sims to fill/rank beyond lists — improves B’s false-negative profile without making lists the sole membership engine. That is not either option as written; flag for compiler. Pure A refuses EP re-rank of lists (correct). Pure B refuses Wowhead membership (correct for its thesis). A hybrid is a third design, not a free lunch (editorial correlation enters B’s hardband).

---

## 5. What would falsify each option

### Option A — falsifiers

1. **Fresh, complete Wowhead+wowsims union pool** still misses multiple SME-agreed chase IDs that appear as large positive Δ on fixture ranks (list prior fails recall).
2. **Transcription process** cannot keep `retrievedAt` within an agreed freshness window without unacceptable labor (operational falsification).
3. On a panel of mid-progression fixtures, **fraction of top-5 high-iter upgrades absent from the list pool** exceeds an agreed threshold (e.g. >20%) while present in Stage-0 equip universe — sleeper rate too high for list-only membership.
4. Provenance trim / budget pressure causes **measurable** drop of items that win high-iter full-pool ranks (trim policy falsifies “lists already curated → keep all”).
5. Any merge that sorts or cuts membership by `p2.ep-weights.json` — **policy falsification** (collapse to status quo).

### Option B — falsifiers

1. **Prototype Stage-1** (struct + hardbands, no FORCE) fails to admit Twinblade / Gorehowl-class weapons and Belt of One-Hundred Deaths into Stage-2 candidates (structural proxy falsified).
2. **Stage-2 @ 500–1000 iter**, starved+capped shells, weapons+waist: top-12 **Jaccard vs 5k iter** below threshold, or golden weapons lose to audit-class −200 Δ sticks (noise / shell falsified).
3. Adding the third/fourth shell **does not** change membership but goldens still miss — indicates need for different shell recipes, not more of the same (coverage falsified).
4. Committed pool from B still requires a growing **FORCE/golden admit list** to pass SME gate — quantitative path bankrupt in practice (same admission as today’s EP).
5. Rank-time or generate path **sorts by reference EP or by shell simProxy as player prefilter** and drops player-best items that fullPool would keep — double-approximation falsified in production.
6. Offline Stage-2 wall time or pin-bump cost causes team to restore EP Stage-1 “temporarily” — **economic falsification**.

---

## 6. Prototype measurement suggestions (no implement)

Shared discipline: fix fixtures (e.g. slamaltman + one hit-starved synthetic), fix seeds, bound log output, compare **sets and ranks**, not vibes. Do not regenerate committed `ret.json`.

### 6.1 Measurements for Option A (≤1 week shape)

1. **Recall@lists:** `|wowsims_set_ids ∩ scratch_pool| / |wowsims_set_ids|` (expect ≪1 on current `ret.json`; expect ≈1 on A scratch assemble).
2. **FORCE necessity:** count golden chase IDs in A union **without** legacy FORCE vs with — A should not need FORCE for leather if Wowhead rows exist.
3. **Sleeper probe:** run high-iter fullPool on current wide universe **or** on EP-legacy ∪ A-union difference set for 1–2 slots; count how many top-Δ items are outside A manifests (sleeper rate).
4. **Budget waste:** on one fixture, fraction of A-pool sims with Δ < −50 (or below cutoff) — “editorial false positive” rate.
5. **Transcription error injection:** flip 3 itemIds in a scratch manifest; confirm CI catches id/slot; confirm density gate does **not** catch “plausible wrong alt.”

### 6.2 Measurements for Option B (≤1 week shape)

1. **Stage-0/1 admission:** binary — 30106, Twinblade, Gorehowl, key librams present in Stage-1 dump **without FORCE**.
2. **Weapon inversion test:** Stage-2 top-12 weapons must outrank Hellscream / Burning Crusader cluster; report Δ and ranks at 500 vs 5k iter.
3. **Noise study:** 3 seeds × 500 iter; top-12 Jaccard per slot; width of inclusion band needed for sticky pool.
4. **Shell ablation:** build with {starved}, {capped}, {both}; list which goldens appear only on one shell.
5. **Stage-1 ablation:** remove socket term / mail bias / white DPS; see who falls out of top-M — quantify proxy fragility.
6. **Gem-fill ablation:** Bold-heavy vs softcap fill on waist leather; Δ membership rank change.
7. **Cost sample:** wall-clock for weapons+waist+ranged × 2 shells @ 500 iter — extrapolate to full Stage-2; decide go/no-go before boiling ocean.
8. **Prefilter poison check:** if experimenting with rank-time narrow, compare top-80 by (ref EP | shell simProxy | player 500-iter | full list) — report disagreements on fixture; **reject** any scheme that matches ref EP’s known weapon mistakes.

### 6.3 Comparative prototype (highest information per hour)

On **weapons + waist + ranged** only:

| Artifact | Build |
|----------|--------|
| A-scratch | wowsims sets ∪ FORCE ∪ one Wowhead slice for those slots |
| B-scratch | Stage-0/1 + 2-shell Stage-2 |
| Legacy | current `ret.json` rows for those slots |

Score each on: golden recall, audit-loser exclusion, 5k-iter top-5 agreement with “oracle” full sim of Stage-0∩(A∪B∪legacy) for those slots (bounded universe), and engineer minutes.

**Decision rule (math-oriented):**  
- If B fails Stage-1 admission or weapon inversion → B not ready; do not “fix EP weights.”  
- If A has high sleeper rate on fixtures the product cares about → A insufficient alone.  
- If both pass slot pilots → choose on regenerability/ops (B) vs fame-recall/labor (A), or compile a hardband-hybrid.

---

## 7. Math critic bottom line

1. **Owner premise stands:** reference linear EP membership is the wrong estimator class; dual use in generate + prefilter is correlated failure. Neither option should keep that gate.
2. **Option A** replaces a bad quantitative filter with a **strong social prior**. Math quality hinges on transcription completeness and the mismatch between set-BiS editing and single-swap Δ — not on variance formulas. Main risks: stale/incomplete lists, sleeper false negatives, and EP creeping back as shadow-admit or trim.
3. **Option B** replaces EP with a **aligned but shell-conditioned Monte Carlo filter**, plus a non-EP Stage-1 that can still starve the sim. Main risks: shell bias presented as objectivity, low-iter cutoff noise, Stage-1 exclusion, and `simProxy`/gem-EP leakage recreating double approximation without using the word “EP.”
4. **On pure approximation-to-Δ:** B wins **if** Stage-1+shells are validated. **On deterministic fame recall and P2 wowsims closure:** A wins. **On pin-regenerable P3+ without human BiS labor:** B wins. **On keeping EP poison out under schedule pressure:** A is simpler; B needs explicit guardrails.
5. **Falsify with prototypes on weapons/waist/ranged before committing either as the membership engine.** Do not implement pool codegen in this pass.

---

*End of math review.*

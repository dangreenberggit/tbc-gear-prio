# Are tickets 117, 118, 119, 122, 222, 227, 257 needed for the wowsims Upgrades tab?

Read-only investigation, 2026-08-22, branch `dev`. No file outside this one
was modified.

The question is about **substance**, not wording: does each ticket's mechanism
affect, or need carrying into, the Upgrades-tab work? A prior session answered
by grepping the seven files for the string "upgrades tab", found nothing, and
declared no connection. That method is discarded here.

---

## 1. What the Upgrades tab is, and its current state

**It is a new top-level tab inside a personal fork of the wowsims TBC site**,
not a surface of this repo's CLI. Design: `docs/plans/wowsims-tab/plan.md`
(§0, §2, §4). Working copy: `vendor/tbc-new-fork/`, a **gitignored nested
clone with its own git**, recorded by the committed lockfile
`data/wowsims-fork.lock.json`.

Verify the clone is not tracked here:

```bash
git ls-files vendor/tbc-new-fork | wc -l     # 0
```

State of the clone as read on 2026-08-22:

| Fact | Value | Where read |
| --- | --- | --- |
| Fork branch | `feat/upgrades-tab` | `git -C vendor/tbc-new-fork branch --show-current` |
| Fork tip | `f35923957` "State a lag-tolerant rule for the engine commit literal" | `git -C vendor/tbc-new-fork log --oneline -1` |
| Lockfile commit | `f359239572c38af9acb24c1ee178088bfe44692c` | `data/wowsims-fork.lock.json` |
| `pushed` | `false` — nothing has left this machine | same file |
| Branched from | `cbf6b75a` (upstream `feature/backend-reforge`), **not** the engine pin v0.0.119 — open drift, ticket 251 | same file |

**Work state: substantially built, not shipped.** The plan header still reads
"approved direction, pre-implementation" (`plan.md:3-5`), which is stale — the
tab, its ported engine, its adapters and its bundled data all exist on disk:

```bash
ls vendor/tbc-new-fork/ui/core/components/individual_sim_ui/upgrades_tab.tsx
find vendor/tbc-new-fork/ui/core/components/individual_sim_ui/upgrades -type f | wc -l   # 53
```

### What code the tab runs

Per plan decision **D3** (`plan.md:47`), the engine the tab runs is a **port
into the fork**, not a dependency on `packages/core`. The port lives at
`vendor/tbc-new-fork/ui/core/components/individual_sim_ui/upgrades/engine/`
— 33 files including its own `rank.ts`, `set-value.ts`, `view.ts`,
`meta-repair.ts`, `candidate-gems.ts`. `plan.md` §3 names the resulting drift
as "real and accepted".

### What it renders

`upgrades_tab.tsx` (930 lines) is **its own renderer**. Its results surface is
a five-column table built in `rowsTable`/`resultRow` (lines 656-755):

> rank · item (+ `★ BiS` / `Alt`, `(owned)`) · slot · deltaDps · source

plus a below-cutoff expand, a **separate screened-rows expand**, an
assumptions drawer (seeds, iterations, maxPhase, candidate cap, fork engine
commit, sim version) and a substitutions list (`substitutionsContent`, lines
806-826).

---

## 2. The shared-vs-tab-only boundary

This is the crux, and it does **not** fall where "shared engine code" intuition
puts it. There are three zones.

### Zone A — ported engine (fixes here do reach the tab, if ported)

`packages/core/src/{rank,set-value,set-bonus,meta-repair,candidate-gems,
gems,meta,pool,compose,view,cutoff,stats,se,caps,enchants,...}.ts` each have
a fork twin under `upgrades/engine/`. A fix in core reaches the tab **only if
someone ported it**; nothing does this automatically. `engine/PROVENANCE.md`
maps file to source commit, and plan §3 mitigation 1 names an E-W3 fixture
parity harness as the drift alarm.

### Zone B — core-only renderer (fixes here do NOT reach the tab)

```bash
ls packages/core/src/rank-report-rules.ts packages/core/src/rank-report.ts packages/core/src/rank-report-css.ts
ls vendor/tbc-new-fork/.../upgrades/engine/ | grep -i report    # no match, exit 1
```

**No report module is ported.** The fork's `view.ts` says so in its own header
(lines 5-13):

> `setPotentialIsConfounded` is inlined here rather than imported from a ported
> `rank-report-rules.ts`: that file is packages/core's CLI/HTML report renderer
> … which is out of scope per plan §2.1 — the fork's tab is its own renderer

So the ~30 exported formatters in `rank-report-rules.ts`
(`formatSetBonusLine`, `formatBreaksPrefix`, `formatSelfConfoundPrefix`,
`formatPackageDelta`, `formatPackageContents`, `formatPackageMembershipLine`,
`formatCuratedPackagePointer`, `packageSetPotentialDps`,
`weightedSetPotentialDps`, `setBonusEntry`, `GEM_POLICY_QUALIFIER`,
`wowsimsItemIdsJson`, …) have **exactly one consumer: the CLI's HTML report**.
Exactly one predicate crossed the line, copied by hand.

Consequence, measured not inferred:

```bash
grep -c -i "setBonus" vendor/tbc-new-fork/.../upgrades_tab.tsx   # 0
grep -c -i "package"  vendor/tbc-new-fork/.../upgrades_tab.tsx   # 0
grep -c -i "tie"      vendor/tbc-new-fork/.../upgrades_tab.tsx   # 0
```

The fork engine **computes** set bonuses (`buildSetBonuses`, `memberPackages`,
`applySetContext` at `engine/rank.ts:1170-1709`) and **computes** tie groups
(`assignTieGroups`, 7 hits in `engine/view.ts`). The tab displays **none of
it**. That data is produced and dropped on the floor.

### Zone C — fork-only behaviour (no core twin at all)

The boundary runs both ways. Racing/screening was **deleted from core** on
2026-08-19 and **kept in the fork**:

```bash
git ls-files packages/core/src/promotion.ts        # empty — untracked, deleted
ls vendor/tbc-new-fork/.../upgrades/engine/promotion.ts   # exists, 4490 bytes
grep -c "screened" packages/core/src/rank.ts       # 0
grep -c "screened" vendor/tbc-new-fork/.../engine/rank.ts # 21
```

Commit `28b00f9` "Remove racing; full-sweep every eligible candidate"
(2026-08-19, on `dev` — `git merge-base --is-ancestor 28b00f9 dev` succeeds)
says this in its own body:

> The fork parity harness keeps `fullPool: true` on the fork's side only.
> The fork still races (its rank.ts:554 reads `input.fullPool !== true`)
> and porting the removal is not this ticket's job.

And the tab never sets `fullPool`, so racing is always on in the browser.
`engine/rank.ts:554` is `const racing = input.fullPool !== true;`, and
`upgrades_tab.tsx:776-781` states it deliberately:

> Racing IS shipped and is always on here: the tab never sets `fullPool` …
> The CLI is the surface that never races (`cli.ts` hardcodes `fullPool: true`)

**Where the line falls, in one sentence:** the tab shares the *ranking
arithmetic* with core only where a human ported it, shares *none* of core's
report formatting, and runs a screening stage that core no longer has at all.

Note on stale artifacts: `packages/core/dist/promotion.js` still exists.
It is build output from before the deletion; the source is gone. Do not read
`dist/` as evidence about core's behaviour.

---

## 3. The seven-ticket verdict

| # | Status | Verdict |
| --- | --- | --- |
| 117 | resolved | **RELEVANT — ALREADY COVERED** |
| 118 | resolved | **RELEVANT AND OUTSTANDING** (renderer half unported) |
| 119 | open | **RELEVANT AND OUTSTANDING** (both halves) |
| 122 | resolved | **RELEVANT — ALREADY COVERED** |
| 222 | resolved | **RELEVANT AND OUTSTANDING — the tab is the only live host** |
| 227 | wontfix (parked) | **NOT RELEVANT** to tab-specific work |
| 257 | open | **RELEVANT AND OUTSTANDING** (mechanism live, conclusion unsettled) |

### 117 — repairMeta bypasses the rare cap on coloured sockets — COVERED

**Mechanism.** The meta-repair pass re-gemmed *coloured* sockets from the
uncapped (epic-inclusive) palette while the fill step was capped at rare.
Fix (owner option 1): pass `GemContext.fillPalette` at both `repairMeta` call
sites.

**Reaches the tab?** Yes — gem fill and meta repair run on every browser
candidate; the tab's numbers depend on which gems get seated. Pure Zone A.

**Is it ported?** Yes, verified by reading both sides. Both call sites in each
`rank.ts` pass `palette: gems.fillPalette`:

```bash
grep -n "repairAndMinimize" -A 6 packages/core/src/rank.ts                    # :632, :1989
grep -n "repairAndMinimize" -A 6 vendor/tbc-new-fork/.../engine/rank.ts        # :483, :1851
```

`repairAndMinimize` itself is character-identical between
`packages/core/src/meta-repair.ts:238-251` and the fork's
`engine/meta-repair.ts:175-187` (fork drops the doc comments only).

Caveat: the *disclosure* text for this policy, `GEM_POLICY_QUALIFIER`
(`rank-report-rules.ts:306`), is Zone B and does not render in the tab — but
that is a shared gap covered under 118/119 below, not a defect in 117's fix.

### 118 — package display mode is a no-op when every package is negative — OUTSTANDING

**Mechanism.** Two halves. (a) **Data:** `setContext.package` (single,
largest threshold) became `setContext.packages` (every measured threshold,
smallest first) via `memberPackages`. (b) **Renderer:** row detail lines
reading "2pc package +11.31 (2 pieces) / 4pc package −6.83", chip markers
"pkg 2pc +11.31 / 4pc −6.83", `packageSetPotentialDps` taking the best
positive figure to drive Package-mode sort, and the reworded ticket-96 curated
pointer.

**Reaches the tab?** The data half **is** ported —
`vendor/tbc-new-fork/.../engine/rank.ts:1638 memberPackages`, `:1707-1708`
attaching `setContext.packages`, and `:329 setContext?: SetContext`. Verified
identical in shape to `packages/core/src/rank.ts:1680-1697`.

The renderer half is **entirely Zone B**: `packageSetPotentialDps` and every
package formatter live in `rank-report-rules.ts`, which is not ported, and
`upgrades_tab.tsx` contains zero occurrences of "package" or "setBonus".

**Verdict: RELEVANT AND OUTSTANDING.** The fork computes every per-threshold
package figure on every run and shows the user none of them. There is no
Package display mode in the tab to be a no-op — the whole feature is absent.
Tab-side work is needed if package value is meant to be visible there.

### 119 — self-set 2pc multi-charge at threshold−1 worn — OUTSTANDING

**Mechanism.** Anomaly B (done in core): a completion package needing exactly
one piece is zero by construction, now flagged
`unmeasured: "unmeasurable-at-this-worn-count"` instead of printed as a
measured `0.00 ± se`. Anomaly A (still open everywhere): `bonusDps` at
threshold−1 is `4pc − 2·2pc`; ticket 127 added a `selfConfound` qualifier but
the arithmetic is untouched, and suppress-vs-qualify-vs-correct is unmade.

**Reaches the tab?** Yes, and asymmetrically. The **data** half is ported:

```bash
grep -c "unmeasurable-at-this-worn-count" vendor/tbc-new-fork/.../engine/set-value.ts  # 1
grep -c "unmeasurable-at-this-worn-count" vendor/tbc-new-fork/.../engine/rank.ts       # 1
grep -n "selfConfound" vendor/tbc-new-fork/.../engine/rank.ts   # :362, :1606, :1620
```

The **reason text** is Zone B — core carries it in
`rank-report-rules.ts` (3 hits for the unmeasured reason, plus
`formatSelfConfoundPrefix` at `:242` and the drawer line at `:404-407`).
None of that is ported, and the tab renders no set-bonus surface at all.

**Verdict: RELEVANT AND OUTSTANDING on both halves.** Anomaly A is an
arithmetic defect that is live in the fork engine byte-for-byte, so whatever
the owner decides applies to two copies. Anomaly B's fix means the fork
*records* the unmeasured reason and the tab *shows nothing*, which is
harmless today only because the tab shows no set bonuses whatsoever.

### 122 — effect-only class restrictions admit cross-class items — COVERED

**Mechanism.** `30892 Beast-tamer's Shoulders` (hunter-locked in Go only,
`classAllowlist: null` in the pinned db) enters the ret universe; its swap sim
panics. Resolution was **option 2**: accept drop-and-disclose. The engine drops
the candidate, finishes the ranking, and records it in
`ranking.substitutions`.

**Reaches the tab?** Yes on both counts, and it is covered.

The item is in the tab's bundled data:

```bash
grep -c "30892" vendor/tbc-new-fork/.../upgrades/data/ret-p3.universe.json   # 1
grep -c "30892" data/universes/ret-p3.json                                   # 1
```

The drop-and-disclose engine path is ported — `substitutions` appears 8 times
in each `rank.ts`. And unusually for this investigation, **the tab does render
it**: `substitutionsContent` (`upgrades_tab.tsx:806-826`) lists every
substitution's `field` and `detail` in the assumptions drawer. Its doc comment
names ticket 156 as why it was added.

**Verdict: RELEVANT — ALREADY COVERED.** This is the one resolved ticket whose
*disclosure* survived the Zone B cut, because the tab grew its own renderer for
it rather than inheriting one. Nothing to port.

### 222 — within-slot ordering below the argmax is ungated — OUTSTANDING, and the tab is now its only host

**Mechanism.** With screening on, only the per-slot argmax (and the global
top-K) reach a full-iteration sim. Every other row is finished as a `screened`
row whose `deltaDps` is a 1000-iteration observation, and those rows are sorted
against each other by that noisy delta. The ticket measured a 0.67% inversion
rate, took a `trust-with-caveats` SME verdict, decided "accept and document",
and spun the presentation concern out as ticket 224.

**Reaches the tab?** It is the **only** place it reaches. Racing was deleted
from core on 2026-08-19 (`28b00f9`) and deliberately left in the fork. The tab
never passes `fullPool`, so `engine/rank.ts:554`'s `racing` is true on every
browser run — stated as fact in the tab's own comment at `:776-781`.

So 222's entire mechanism — the thing the ticket describes — no longer exists
on the CLI and runs on every single tab run.

The tab does part of the job: `resultRow` (`:734-741`) labels a screened row's
delta with a distinct i18n string rather than a bare `+N`, and `rowsTable`
(`:656-690`) gives screened rows their own expand, separate from below-cutoff,
with a doc comment explaining why conflating the two would mislead. That is
222's "document it" half, honoured tab-side.

What is **not** there is 224, the SME's caveat: tie groups by measurement
resolution so a flat trinket or finger slot reads as a tied set, not an ordered
list. The fork's `view.ts` computes `tieGroupId` (7 hits for
`assignTieGroups`) and `upgrades_tab.tsx` renders zero tie markers.

**Verdict: RELEVANT AND OUTSTANDING.** Both because the ticket's premise now
holds only in the tab, and because its follow-on (224) is unrendered there.
Note 222 is marked `resolved` on the strength of measurements taken against
core at `70174a0`, before racing left core — re-read its numbers as facts about
the fork, since that is where the code now lives.

### 227 — healer-role items score above the feral cutoff — NOT RELEVANT

**Mechanism.** Ten healer-statted items price above the feral cutoff on the
feral-p3 fixture. Not a tab question — it is a pool-composition and
role-relevance question about the ranking's inputs, and it would appear
identically on the CLI report and in the tab because both read the same
universes.

**Status is decisive.** `Status: wontfix`, parked 2026-08-22 by owner ruling,
alongside ticket 234. The file says:

> **If you are an agent reading this: stop here.** Do not run sims, do not
> re-measure, do not "just add the caveat". … Only the owner may move this
> ticket.

**Verdict: NOT RELEVANT** to Upgrades-tab work. There is no tab-side artifact
to port, no renderer asymmetry, and no permitted work. If the owner ever
unparks it the fix would land in shared pool/universe data (Zone A or the
`data/` copies), and the tab would inherit it via the normal universe refresh —
so it would still never become tab-*specific* work.

Related note, no action: `upgrades_tab.tsx` has no role filter and the fork's
bundled universes are copies of this repo's, so any 227 rows are on the tab
too. That is a consequence of 227, not a separate tab defect.

### 257 — meta-socket candidates underpriced against a repaired baseline — OUTSTANDING

Handled carefully: another agent is concurrently working this ticket's
technical validity and may be editing the file. Its conclusions are treated as
unsettled; only the relevance question is answered here.

**Mechanism as filed.** The `gems.meta-preference` substitution leaves meta
sockets empty on **candidate** items while the **worn** item's meta is repaired
before the baseline sim — a scoring asymmetry that would systematically
underprice meta-socketed candidates (i.e. heads).

**Reaches the tab?** Yes, directly and entirely in Zone A. The substitution is
emitted from `rank.ts` on both sides:

```bash
grep -rn "meta-preference" packages/core/src/rank.ts                   # :2041
grep -rn "meta-preference" vendor/tbc-new-fork/.../engine/rank.ts      # :1892
```

Same emitter, same field name, same position in the pipeline. If the asymmetry
is real, it is real on every tab run, and it lands on `deltaDps` — the one
number the tab's table actually shows. There is no renderer dependency, so no
Zone B escape.

One tab-side amplifier worth noting: the tab renders `substitutions` in its
drawer (`:806-826`), so the `gems.meta-preference` note *is* visible to a tab
user today, unlike most disclosures.

**Verdict: RELEVANT AND OUTSTANDING.** Whatever the concurrent investigation
concludes, the conclusion applies to two engine copies, and any code change
needs porting into the fork. If it closes works-as-designed, nothing to port —
but that determination has not been made, so it cannot be booked as covered.

---

## 4. Things the owner did not ask about

### 4.1 The biggest one: the tab computes set-bonus data and shows none of it

Not a single ticket names this, and it silently voids the tab-side value of
several closed tickets. The fork engine runs `buildSetBonuses`, attaches
`setContext` with per-threshold `packages`, computes `selfConfound`, and marks
`unmeasurable-at-this-worn-count` — then `upgrades_tab.tsx` renders a table
with columns rank/item/slot/delta/source and no set surface at all.

So the tab-side effect of **118** (per-threshold package figures), **119**
(both the unmeasured reason and the selfConfound qualifier), **90/127**
(confound disclosure), **96** (curated-package pointer), **112** (chip
contract) and **100** (set-potential panel) is: none of them render. Each is
a live sim cost paid on every browser run for output nobody sees. The set
bonus sims are the expensive ones.

This is not a bug in any of those tickets. It is a scope fact from plan §2.1 —
`rank-report-rules.ts` was declared out of scope — that nothing has since
revisited now that the tab is largely built.

### 4.2 Racing exists in exactly one place, and it is the user-facing one

The CLI full-sweeps; the browser screens at 1000 iterations and promotes.
Every closed measurement about screening — 222's inversion rates, 221's recall,
205/206/208/224/225/232 — describes behaviour that now runs **only** in the
tab. Anyone reading those tickets as history of a removed feature will be
wrong. `28b00f9` is explicit that porting the removal was out of scope, so the
divergence is deliberate; it just is not flagged anywhere a ticket reader would
see it.

Corollary: `packages/core/dist/promotion.js` still exists on disk as stale
build output. Ticket 222 cites `packages/core/src/promotion.ts:32` and
`DEFAULT_PROMOTE_TOP_J = 1`; neither the file nor that constant exists on
either side today (`grep -rn "PROMOTE_TOP_J"` over both engines finds nothing).
222's line citations are dead references.

### 4.3 The plan header is stale

`docs/plans/wowsims-tab/plan.md:3-5` says "approved direction,
pre-implementation. Nothing here is implemented." Fifty-three files of tab code
exist. Any agent starting from the plan will mis-scope the work.

### 4.4 The fork's base and the engine pin have diverged

`data/wowsims-fork.lock.json` records `branchedFrom: cbf6b75a`
(`feature/backend-reforge`) while decision D2 intended the fork to sit on the
pin, now v0.0.119. The lockfile's own comment says not to reconcile by editing
the field and points at ticket 251. Live, open, and it sits underneath every
"does core's fix reach the tab" question in this document.

### 4.5 Ticket 168's obligation may be undischarged

168 (`resolved`) required that whichever of `feat/sweep-tab-tickets` /
`feat/sweep-ret-tickets` merged second must make the fork's
`EP_WEIGHTS_SOURCE_BY_SPEC` resolve weights per spec **and phase**, from
`data/presets/ep-weights-by-phase.json`, rather than a fixed per-spec constant.
Not verified in this pass — flagged as a thing to check, not as a finding.
The fork's `upgrades/data/` currently holds `ret-p2.ep-weights.json` and
`feral-p1.ep-weights.json` only, with universes through `ret-p5`, which is
suggestive but is not a measurement of the resolver.

---

## 5. Method note

Verdicts rest on reading both copies of each mechanism, not on one. Where this
document says a fix does not reach the tab, it names what the tab renderer
does (`upgrades_tab.tsx` line ranges, zero-hit greps) as well as what the CLI
renderer does. Where it says a fix does reach the tab, it shows the ported call
site with its argument.

Not established here, and left as such: whether the fork's E-W3 parity harness
currently passes; whether ticket 168's resolver landed; and whether ticket
257's asymmetry is real. Each would need work beyond a read-only pass.

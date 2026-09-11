# Plan review — two-hander-clears-offhand

Written by `gate-reviewer` (Opus) 2026-09-10 against `brief.md`, `plan.md` and
`decision-log.md`. Plan base `d4fdca5b`; repo HEAD at review time `b7e224f`
(the orchestrator's ticket-369 filing, not seat drift). Committed verbatim by
the orchestrator.

VERDICT: revise

## Findings

| ID | Severity | Where | What breaks | Evidence |
| --- | --- | --- | --- | --- |
| F1 | material | Step 2, T2 ("Dragonstrike and Gorehowl carry neither stat — C14"), and C14's stats clause | The **justification** for T2's expected numbers is false, and C14 misstates the item data. Gorehowl (28773) carries Str 49 / Agi 43 / Sta 51; Dragonstrike (28439) carries Sta 19. C14 also omits that Talon (30082) carries Agi 15 and **Armor 168**, both of which the clear debits. The two asserted values happen to survive (AP and melee hit are the two stats neither main-hander carries), but an executor who trusts the stated reason will not notice that `statDeltaBetween` also returns `{0: +49, 1: +28, 2: +32, 31: -168}`. If T2 is ever written as a whole-object `toEqual` on `delta` rather than two index reads, it fails. Settled by: `python -c "import json;i=json.load(open('data/items/index.json'));print({k:v for k,v in enumerate(i['28773']['stats']) if v})"` → `{0: 49, 1: 43, 2: 51}`; same for 28439 → `{2: 19}`; 30082 → `{1: 15, 17: 40, 18: 40, 20: 20, 31: 168}`. Full computed delta: `{0: 49, 1: 28, 2: 32, 17: -40, 18: -40, 20: -20, 31: -168}` | measured (above) |
| F2 | material | Paths manifest, line "one existing CLI-output test under `packages/core/test/` that already asserts `setBonusNote` text — executor names it by grep"; step 4 | **No such test exists.** `grep -rln 'set: ' packages/core/test/*.test.ts` returns only `pool-hardening.test.ts` and `rank-report.test.ts`, neither a CLI test. `cli-shortlist.test.ts` contains zero hits for `set:`, `gemSubstitutions`, `runCli`, `printShortlist` or `console.log` — it does not capture CLI stdout at all. Step 4's acceptance ("those tests green") is therefore vacuous for the CLI half: the executor will grep, find nothing, and either invent a new test harness (unplanned work) or silently ship the `cli.ts` render with no coverage. The plan must either name a real target or state that a new CLI-output test is being created and how it captures stdout. Settled by: `grep -rn "runCli\|printShortlist\|console.log" packages/core/test/cli-shortlist.test.ts` → no output | command above |
| F3 | material | Step 3 and step 5, "Add `removedItems?` … to `RankedItem` immediately after `gemSubstitutions`" | **Ambiguous across four insertion points.** Each copy declares `gemSubstitutions` **twice**: core `rank.ts` at the row type (with `itemId/socketIndex/from/to`) and again in the set-bonus/package type (with an extra `itemIndex`); the fork likewise at two sites. "Next to `gemSubstitutions`" names no unique location, and the second site is the package type, where the plan explicitly does *not* want the field (Out of scope: "A package-level (`SetBonusValue`) removal disclosure — unreachable (C21)"). The anchor must be the row type, identified by a neighbouring row-only field (`belowCutoff`, `emptyMetaSocket`), not by `gemSubstitutions`. Settled by: `grep -n 'gemSubstitutions' packages/core/src/rank.ts` → 289, 402; same grep on the fork file → 245, 297 | command above |
| F4 | material | Step 6 and C16; the Q3 gate | The plan says to add the schema property and "add it to that object's `required` list **if** the schema lists `results` keys as required — check the sibling `owned` key". It is not a conditional: `schemas/translation.schema.json`'s `upgrades_tab.results` object carries `required` listing **all 18** existing keys. So the `required` edit is mandatory, not optional, and an executor who reads the step as a conditional and skips it leaves the new key un-required — a silent hole in the gate, invisible to `test-locales.mjs` (AJV validates presence of required keys; an optional key that is missing validates fine). Separately, `assets/locales/` contains **only `en/`**, so the "breaks their i18n gate for other locales" worry does not arise — but adding to `required` while only `en` exists is still the file's convention. Settled by: the schema's `properties.upgrades_tab.properties.results.required` array (18 entries, ending `heading_count`); `ls vendor/tbc-new-fork/assets/locales/` → `en/` only | commands above |
| F5 | minor | Step 4, "the fork gates are untouched so far" | The stated reason is wrong even though the conclusion holds. `engine-port-drift:check` hashes **only** the fork's own files against the fork's `PROVENANCE.md` (`ENGINE_DIR / rel_path`, where `ENGINE_DIR` is under `vendor/tbc-new-fork/`); it never hashes core. Its *union* compare does read three core files (`packages/core/src/items.ts`, `slots-table.json`, `item-source-kinds.json`) — none of which steps 3–4 touch. And `equip-eligibility/ep-presets/meta-conditions` compare the clone's HEAD to the lock, which has not moved at step 4. So step 4's verify does pass, but not because "the fork gates are untouched" — it passes because nothing has moved the clone HEAD **and** core's `rank.ts` is not in any hash table. Worth correcting so the executor does not generalise it to step 7. Settled by: `scripts/check_engine_port_drift.py` (`ROW` regex matches only `ENGINE_DIR` paths; `check_unions` reads the three core files listed above); `scripts/check_equip_eligibility.py` docstring "Refuses (exit 2) when the clone's HEAD is not the commit `data/wowsims-fork.lock.json` pins" | files above |
| F6 | minor | Step 9, "`pushed` → `false` until step 12 flips it" | Harmless but adds a commit-visible lie for the duration of steps 9–11, and the lock's own `_comment` already documents the intended discipline ("a later fork commit moves `commit` ahead of the remote again, so re-verify with `ls-remote` rather than trusting the flag"). Setting `false` then `true` is consistent with that text, so this is advisory only — but step 11 commits `pushed: false` to the repo, and if the branch is abandoned between 11 and 12 the committed state is accurate, which is arguably the point. No change required; flagged so the executor does not treat the flip-back as optional. | `data/wowsims-fork.lock.json` `_comment` (read) |
| F7 | minor | Step 6 acceptance, "`git -C <fork> diff --stat` shows only the four fork files" | Off by one against the plan's own Paths manifest, which lists **five** fork paths (`engine/rank.ts`, `engine/PROVENANCE.md`, `upgrades_tab.tsx`, `translation.json`, `translation.schema.json`). Step 8 says "the four files … — five if the schema changed", and per F4 the schema **always** changes. The count is five; PROVENANCE moves at step 7, so at step 6 it is four. Minor wording, but an acceptance criterion stated as a count invites a miscount. | plan text vs Paths manifest |

**Q1's site choice survives the attack.** `candidateSwapWithRepairs` is the single composition entry point: the core loop (`runCandidate`), the core package loop, core's exported `equipmentForCandidateSwap`, and the fork's `screenCandidates` all funnel through it, and `screenCandidates` takes `outcome.equipment` directly (confirmed — it builds `attempts.push({ key, gear: outcome.equipment })` and hands those to `runBulkScreen`). A guard-site clear would leave the screening pass pricing 2H+OH while the loop priced a legal set, which is exactly the drift the shared `attemptEligibility` exists to prevent. **The `equipmentForCandidateSwap` caller worry is real but benign**: it is exported from `packages/core/src/index.ts` and used by `wowsims-fork-parity.test.ts` (for head/shoulder set-package swaps) and by `rank.test.ts` gem tests — all head/shoulder/belt slots, never `mainhand`, so a silent off-hand clear cannot fire there. It is also used by `.scratch` measurement scripts, which are not gated. Not a finding.

**Q2's conclusion survives.** No gem or stat stage reads the off-hand slot specifically. `sumStat` skips `!spec.id`; `applyRepairedGems` returns the spec unchanged for `!spec.id`; `fillOptsForSwap` iterates all indices generically and reads only `gems`. Nothing keys on dual-wield or weapon pairing in the gem path. The one place that reads a *weapon* hand type is `mainHandIsOneHanded`, computed from the **worn** main hand, which the clear does not touch.

**C8 is load-bearing and the plan is wrong to mark it `no`.** Verified: `swapItemAt` computes `fillOptsForSwap(equipment, slotIndex, gemCtx.spec)` from **its own input array**, and `candidateSwapWithRepairs` calls `swapItemAt(equipment, …)` as its first statement. So clearing the array *before* that call is what keeps the removed off-hand's gems out of `usedUnique`/`otherGemIds` — and the entire Q2 answer ("the change is correct") depends on that ordering. If the executor instead cleared *after* `swapItemAt`, gem output would be subtly wrong (a unique gem on the removed off-hand would still block the two-hander's socket) with no test catching it, since no test asserts gem internals on this path. **Reclassify C8 as load-bearing and make the ordering an explicit acceptance criterion of step 3.**

**C17 / E-W3 parity survives the type change, and the tree is not red between steps 3 and 5.** E-W3 compares hand-picked field subsets (`itemId, deltaDps, deltaPct, se, seMethod, rank, belowCutoff` for rows; a similar projection for set bonuses) — it never `toEqual`s a whole `RankedItem`. Its only whole-object `toEqual` is on **composed requests** (`expect(forkRequests).toEqual(thisRepoRequests)`), which carry equipment, not row fields. The ret fixture wears a two-hander with an empty off hand, so the clear cannot fire on either side and the requests stay identical. Adding the optional field to core (step 3) before the fork (step 5) therefore leaves E-W3 green throughout. **C13 stands, not as a hypothesis**: `warrior_p2_arms.gear.json` shows the shape, and the ret fixture's two-hander is what makes this safe — but note the plan's own C13 verification command is the wrong file (it names `test/fixtures/slamaltman.raw.json`; the parity test's fixture loading should be read instead).

**Nothing touches ruled-off-limits upstream code.** The Paths manifest's five fork paths are: two under `upgrades/engine/` (ours), `upgrades_tab.tsx` (ours outright — absent at the upstream base), and the two i18n files the orchestrator's Q3 ruling allowed. No `sim/`, no `ui/core/` outside `upgrades/`, no SCSS. **I do not object to the Q3 ruling** — it was measured, the namespace is ours, and the alternative (hard-coded English) would break `test-locales.mjs`, which I confirmed validates every locale file against its schema and fails if the globs match nothing.

**"Override" does not appear.** The word appears only in the plan's *prohibitions* ("It must not contain the word 'override'"; Out of scope: "describing this fix as an 'override'"). The verify recipe greps for it in the source files. Correct.

**The ported-engine cycle matches `known-traps.md` with nothing omitted, and in the right order.** Step 1 runs E-W3 green before any hash moves (trap step 1); step 7 updates the PROVENANCE sha with the Edit tool, not sed (trap step 2, and the CRLF trap); step 8 commits in the fork (step 3); step 9 re-pins the lock and runs `sim-implemented-effects:generate` (step 4); step 10 re-verifies (step 5). Step 5 also runs E-W3 after the port, which is more than the trap requires. The one thing that must happen **before** the first fork edit — E-W3 green — is step 1, which precedes step 5. Correct.

**The partition check does not apply**: the plan declares no slices, and the steps are strictly sequential on one fork clone.

**Tree state**: `git status --porcelain` empty in both the repo and the fork clone. Repo HEAD `b7e224f`, fork HEAD `0b50f402` — matching the lock's `commit` and `pushed: true`. Clean; nothing to report.

## Register verdicts

| Claim | Verdict | Evidence |
| --- | --- | --- |
| C1 | stands | `grep -n 'slotName === "offhand" && !mainHandIsOneHanded'` → core `rank.ts` one hit, a `continue` inside `runCandidate`; fork `engine/rank.ts` one hit, `return { kind: "skip" }` inside `attemptEligibility` |
| C2 | stands | `swapItemAt` body: `equipment.map((spec, i) => { if (i !== slotIndex) return spec; … })` |
| C3 | stands | `caps.ts`: `statDeltaBetween` loops `sumStat(after,[],stat) - sumStat(before,[],stat)` over `STAT_COUNT`; `sumStat` has `if (!spec.id) continue;` |
| C4 | stands | `pool.ts` mainhand admission rejects only `HandTypeOffHand`; two-hander maps to `["mainhand"]` only |
| C5 | stands | `grep -n 'swapItemAt'` → core: definition + one call inside `candidateSwapWithRepairs`; fork: same two |
| C6 | stands | core `grep -n 'candidateSwapWithRepairs('` → loop, package loop, `equipmentForCandidateSwap`, definition; fork adds `screenCandidates` |
| C7 | stands | fork `screenCandidates` body: `const outcome = candidateSwapWithRepairs(equipment, slotIndex, entry.itemId, gems); attempts.push({ key, gear: outcome.equipment })`, then `runBulkScreen({ baseRequest: composeForBulk(…) })` |
| C8 | **stands, but misclassified** | `candidateSwapWithRepairs` calls `swapItemAt(equipment, …)` first; `swapItemAt` passes `fillOptsForSwap(equipment, slotIndex, gemCtx.spec)`. The claim is true and **load-bearing** — see finding above; register says `no` |
| C9 | stands | `compose.ts` `if (!spec.id) return {};`; `logged-gear.ts` writes `{ gems: [] }` for an empty slot. Confirmed independently: `warrior_p2_arms.gear.json` index 15 is `{}` |
| C10 | stands | `meta-repair.ts` `if (!item) continue;` in `bestRepairMove`; `repairMeta` early-returns on an absent head item |
| C11 | stands | `rank.ts` `applyRepairedGems`: `if (!repaired || !spec.id) return spec;` |
| C12 | stands | `logged-gear.ts` `itemId: spec.id ?? 0`; `candidateSwapWithRepairs` maps `swapped` to `{ itemId: spec.id ?? 0, gems: [...spec.gems] }` before `repairAndMinimize` |
| C13 | stands (upgraded from hypothesis) | `warrior_p2_arms.gear.json` index 14 = `{id: 29993, …}` (handType 4), index 15 = `{}`. The ret fixture's empty off hand is what keeps E-W3 green; note C13's stated verification command names the wrong fixture path |
| C14 | **refuted in part** | Hand types and indices correct (`28439`→1, `30082`→2, `29993`→4; SIM_ORDER 14=mainhand, 15=offhand). Stats clause wrong/incomplete: Talon also carries Agi 15 and Armor 168; the derived claim that Dragonstrike and Gorehowl "carry neither stat" is true only of AP and hit. See F1 |
| C15 | stands | `28773` and `30103` both present in `data/universes/warrior-p2.json`; warrior-p2 two-hander count 55; rogue-p2 two-hander count **0** |
| C16 | stands | `upgrades_tab.tsx` absent at upstream base; both i18n files present upstream. Additional fact the plan missed: only `en/` exists, and the schema's `results.required` lists all 18 keys — see F4 |
| C17 | stands | `wowsims-fork-parity.test.ts`: whole-object `toEqual` only on `forkRequests` vs `thisRepoRequests`; rows compared via explicit field projections that do not include `gemSubstitutions` or any optional disclosure field. Adding an optional field cannot break it |
| C18 | stands | `package.json` `"engine-port-drift:check"` inside `verify`; `sha256sum` of the fork's `rank.ts` = `e2debacd…92a4`, matching its PROVENANCE row |
| C19 | stands | `git -C vendor/tbc-new-fork status --porcelain` empty; `rev-parse HEAD` = `0b50f402…`; lock's `commit` matches and `pushed: true` |
| C20 | stands | `packages/core/src/view.ts` `...item`; no `toMatchSnapshot` in `rank.test.ts` / `rank-report.test.ts` |
| C21 | stands | `28773` `setId: None`; no `handType: 4` item carries a `setId` (index scan) |
| C22 | stands | `.github/workflows/verify.yml` runs `sync:wowsims:restore`; `archetype-specs.test.ts` already reads `vendor/wowsims/*.gear.json` |
| C23 | stands, scope corrected | `check_equip_eligibility.py` docstring: "Refuses (exit 2) when the clone's HEAD is not the commit `data/wowsims-fork.lock.json` pins". The red window is steps 8→9 only — **not** step 4 or step 7, where the clone HEAD has not yet moved. See F5 |
| C24 | untestable as written | `ls vendor/tbc-new-fork/.prettierrc*` → none; the "whether prior tab commits ran lint" half is a claim about past developer behaviour that no command settles. Correctly marked `hypothesis, untested`; not load-bearing, since no repo gate runs the fork's lint |

## Answer

**Revise.** The approach is sound and survives the hardest attacks:
`candidateSwapWithRepairs` is genuinely the only site that covers the core loop,
the package loop and the fork's bulk screening pass, and the rejected guard-site
alternative would have left `screenCandidates` pricing illegal 2H+OH sets. Q2's
"the gem change is correct" holds — no stage reads the off-hand slot
specifically. The ported-engine cycle is complete and correctly ordered, E-W3
stays green across the split core/fork edit, and nothing touches code the owner
ruled off-limits.

Four things must change before execution:

1. **C8 is load-bearing, not incidental** (the register says `no`). The whole Q2
   answer depends on the clear running *before* `swapItemAt`, because
   `fillOptsForSwap` reads the input array. Make that ordering an explicit
   acceptance criterion of step 3 — clearing afterward would corrupt gem fill
   with no test catching it.
2. **T2's stated justification is false and C14's stats clause is wrong** (F1).
   The two asserted values are correct by luck; the reason given for them is
   not, and the real delta also carries `Str +49, Agi +28, Sta +32, Armor −168`.
3. **The CLI test the Paths manifest promises does not exist** (F2). Step 4's
   acceptance is vacuous for the CLI half.
4. **`RankedItem` is declared twice in each copy** (F3), so "next to
   `gemSubstitutions`" names four possible insertion points — one of which is
   the package type the plan explicitly excludes. Re-anchor on a row-only field.
   Also: the schema `required` edit in step 6 is mandatory, not conditional
   (F4).

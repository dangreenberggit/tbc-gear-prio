# R3 — Plan and ADR impact of pulling wowsims pins to `feature/backend-reforge`

Read-only scope check. Question: if the wowsims pins move to
`feature/backend-reforge` (153 commits ahead of our tag pin) and the content
tier moves 2 -> 3, which written decisions in this repo become wrong or need
revisiting?

All line numbers below were re-checked against the working tree at the time
of this research (dev, clean).

---

## 1. PLAN.md

### 1.1 (line 28-29) Content tier row

> "A user input, never a build target" ... "Currently 2"

The *shape* of the decision (user input, `maxPhase: 1-5` inclusive) is
unaffected by a tier bump — it already accommodates 1-5, including 3. Only
the **prose value "Currently 2"** goes stale the moment `DEFAULT_MAX_PHASE`
moves to 3. This is a known, self-describing kind of staleness: §8.5 (line
638) says the same thing ("the single source of `DEFAULT_MAX_PHASE`") and
already carries the mechanism to update it.

**Verdict: NEEDS-EDIT** (mechanical). Update "Currently 2" -> "Currently 3"
in the same commit that moves `DEFAULT_MAX_PHASE`, per §8.5's own rule. Not
a design change.

### 1.2 (line 41) Stage-vs-tier terminology rule

Unaffected. The rule distinguishes delivery "Stage N" from game "phase/tier"
regardless of which tier number is current. CONTEXT.md's glossary (see §3
below) is the canonical version of this rule and needs no edit either.

**Verdict: UNAFFECTED.**

### 1.3 (line ~168-172) `maxPhase` inclusive-filter semantics

> "`maxPhase` is inclusive... At `maxPhase: 2` the player still sees Karazhan
> drops... The same filter applies to the gem palette."

This is a semantics statement, not a value statement — it holds identically
at `maxPhase: 3`. No edit needed to the rule itself.

**Verdict: UNAFFECTED.**

### 1.4 (line ~274) "Ret has three curated sets in tbc-new and they stop at P2"

**This claim is already false today, independent of this pull.** Checked
directly:

```
grep -n "ret_p3" scripts/sync_wowsims.py data/wowsims.lock.json
```

`TRACKED` (`scripts/sync_wowsims.py:104`) lists `ret_p3.gear.json`, and
`data/wowsims.lock.json` has a `ret_p3.gear.json` entry (with its own
per-file `commit` field, `5c7491899b5d71...`, distinct from the top-level
pin's commit — a sign it was vendored from a *different* upstream commit
than the rest of the pin). Ticket `.scratch/carry-forward/issues/121-no-upstream-ret-p3-curated-gear-set-to-pin.md`
confirms the history: upstream shipped a real ret P3 curated set on
2026-08-13 (`5c7491899`), two days after the gap was first filed, and it was
vendored on `feat/ret-p3-data`. Ticket 153 records the same fix and the
residual display-side follow-up.

So PLAN.md line 274's factual premise ("nothing to pin" above `maxPhase: 2`
for ret) died in August, before this pull is even considered. This is a
pre-existing PLAN.md/reality drift, not something the reforge pull causes —
but the reforge pull's tier-3 bump makes the wrong sentence load-bearing in
a way it currently isn't (readers will look at exactly this passage when
`maxPhase: 3` becomes default, since it purports to describe ret's curated
sets "above `maxPhase: 2`").

**Verdict: NEEDS-EDIT, and pre-existing (not caused by this pull, but this
pull raises the cost of leaving it wrong).** The line needs to be corrected
to reflect ret_p3 (and note that the toggle's disable condition in §4.1 is
about *whichever* phase currently has no curated set, not fixed at P2).

### 1.5 (line 311-333) `data/` layout, `wowsims.lock.json`, `sync_wowsims.py`

The layout description is mechanism-level and does not encode a tier number
or a commit; it names `wowsims.lock.json` as "pinned upstream tag, commit,
per-file sha256, and CURRENT_PHASE" — all of which still exist in the new
pin, just with different values. No structural change implied by moving to
`feature/backend-reforge`, *provided* the executor uses `--update --ref`
rather than `--update --tag` (per PROCESS.md's own constraint that
`lock["tag"]` would stop naming a release tag). That is a Stage-2 planning
decision, not a PLAN.md correctness issue, but PLAN.md's description of the
lockfile fields ("pinned upstream **tag**") is written assuming `tag` always
names a git tag. If Stage 2 chooses `--ref`, this sentence becomes
technically imprecise (the field holds a literal ref, not a release tag).

**Verdict: NEEDS-EDIT only if Stage 2 picks `--ref`.** Otherwise unaffected.
Flag for Stage 2: whichever tagging strategy is chosen, PLAN.md's one-line
description of `wowsims.lock.json`'s `tag` field should match it.

### 1.6 (line ~506) Proto pin rule

> "Pin the `.proto` files from the same wowsims release as the binary."

Still correct as a rule. The current lockfile already has a separate
`proto.commit` block (`data/wowsims.lock.json:507-508`) equal to the main
pin's commit — so protos and binary track the same commit today. If the pin
moves to `feature/backend-reforge` via `--ref`, "the same wowsims release"
stops parsing literally (a branch tip is not a "release"), but the *intent*
(protos and binary from the identical commit) is unaffected as long as
`sync_wowsims.py --update --ref <sha>` moves both blocks together — worth
Stage 2 confirming it does (R2's brief specifically calls out the proto
situation as something to check).

**Verdict: UNAFFECTED in substance; NEEDS-EDIT in wording** only if "release"
is read literally and the branch is not tagged. Low priority, cosmetic.

### 1.7 (line ~238) Rating-conversion copy warning

> "...the file is level-scoped... and would silently change meaning if the
> pin ever moved to a later-expansion upstream."

This warns about a **later-expansion** upstream (i.e. a different game
version), not about moving within the same TBC-era repo/branch.
`feature/backend-reforge` is still TBC-scoped (same `CHARACTER_LEVEL = 70`,
`BOSS_LEVEL = 73` domain) — R1's job is to confirm this, but nothing in
R3's reading suggests `feature/backend-reforge` is a different expansion.
This warning does not fire for this pull.

**Verdict: UNAFFECTED**, contingent on R1 confirming `mechanics.ts` constants
are unchanged in substance on the branch (a Stage-2/executor-time check, not
an R3 finding — flagged for Stage 2's regen checklist).

### 1.8 Other pin/tier/upstream mentions found by search

- §9 (line 650) and ADR-0025's core sentence both hard-code "v0.0.101
  (`8aa378b3`)" as the current pin. **Already stale** — the live lockfile
  pins `v0.0.119` / `3267f8d`. This predates the reforge question entirely;
  see ADR-0025 section below, since it is a decision document, not just a
  reference.
- §7's `engineVersion` / `ENGINE_VERSION` bump requirement: any tier move
  needs an `engineVersion` bump per PLAN.md's own cache-correctness rule
  (also restated in ticket 337). Not a document that goes wrong, but a step
  Stage 2/3 must include; flagging so it isn't missed as "just a data
  regen."

---

## 2. `docs/adr/`

### ADR-0025 — Upstream has a gem optimizer; we stay pinned and borrow only its rules

**This ADR's Decision #1 is directly reversed by the premise of this pull.**
Quoting the decision verbatim:

> "1. **Stay pinned to tag `v0.0.101` for building.** The branch is reference
> material only. Re-pin when upstream tags a release..."

The whole ADR is built on a "build pin vs. reference-only branch" distinction
— point 2 says "Upstream's `socketBonusActive`... is an oracle to compare
predicates against, not a dependency," and point 5 explicitly frames
`feature/backend-reforge` as a **watched ref for drift detection**, not a
build source. Pulling the *build* pin forward onto `feature/backend-reforge`
collapses exactly the distinction this ADR draws. It doesn't automatically
mean the ADR's technical content (the socket-bonus rule, the prismatic rule)
is wrong — those are TBC game-rule findings that likely still hold — but the
ADR's stated *policy* ("stay pinned to a tag; branch is reference-only") is
falsified the moment the build pin becomes the branch itself.

There's a second staleness layer: the ADR's tag literal (`v0.0.101`) is
already three tiers behind the *current* build pin (`v0.0.119`), so this ADR
has been silently out of sync with reality since some earlier re-pin that
apparently didn't touch it. That prior drift is not this pull's fault, but
this pull is the second time the same class of drift would recur if the ADR
isn't updated.

**Verdict: NEEDS-ADR** (amendment, not a fresh one) — either:
(a) a new ADR superseding 0025's policy point 1 ("we now build on
`feature/backend-reforge`, tracked by ref, for reasons X"), or
(b) if Stage 1/2 conclude the pull should NOT happen (e.g. because the
reforge branch isn't actually released/stable), an ADR amendment is still
owed just to fix the stale `v0.0.101` literal and confirm the "stay pinned to
a **tag**" policy still holds for whatever the *next* tag pin is.
Either way, ADR-0025 cannot be left as-is once this question is resolved.

### ADR-0027 — The wowsims Upgrades tab is primary

Does not mention pins or tiers. It is about which of two front ends
(standalone shell vs. the wowsims-fork tab) is the product. A tier/pin move
does not touch that decision's substance.

**Verdict: UNAFFECTED.**

### ADR-0028 — Pool membership precedence (local universe primary, wowsims DB audits)

The precedence rule ("membership: local universe; phase: wowsims DB; zone
vocabulary: wowsims DB") is pin-number-agnostic — it is about *which system
wins*, not which commit is pinned. However, two operational details are
directly exercised by a pin move:

- `pnpm fork-universes:check` byte-compares this repo's `data/universes/*`
  against the **fork's** bundled copies (`vendor/tbc-new-fork/...`), which
  track the **fork pin** (`data/wowsims-fork.lock.json`), not the engine pin
  under discussion here. Per ticket 251 (below), the fork pin and the engine
  pin are *already* different commits. Moving the engine pin further without
  touching the fork pin widens that gap, but does not change ADR-0028's
  precedence rule itself.
- The "Consequences" section's example diff command reads
  `vendor/wowsims/db.json` vs `vendor/tbc-new-fork/assets/database/db.json` —
  this is a live re-runnable comparison, not a decision, so it just needs
  re-running post-pull if anyone wants updated numbers; it does not need
  editing.

**Verdict: UNAFFECTED** as a decision. Operationally it interacts with
ticket 211 (closed) and 251 (open, see below) but does not need new prose
of its own.

### ADR-0029 — Borrow the decision, derive with a gate, or justify the copy

This ADR's three dispositions ("borrow", "derive with a gate", "justify the
copy") are enforced by scripts that read the **fork** at "the pinned commit"
(`check_equip_eligibility.py`, `check_engine_port_drift.py`,
`check_ep_presets.py`, `check_meta_conditions.py` — all keyed to
`vendor/tbc-new-fork` / `data/wowsims-fork.lock.json`, not the engine pin
`data/wowsims.lock.json`). A tier/engine-pin bump does not itself invalidate
these gates' *logic*, but two things are worth flagging:

1. If the tier-3 content changes anything the "borrow" exporter reads (e.g.
   `canEquipItem`, capabilities data) in a way that differs between the fork
   pin and the new engine pin, the two pins now disagree about a *decision*
   this ADR says should be borrowed once. That's not new — ticket 251
   already names exactly this class of split ("cat and ret presets come from
   the engine pin, bear's from the fork clone... 'read it from upstream' has
   no single referent while the two disagree") — but a tier-3 pull is a
   second, independent way to widen it further, on top of the existing
   153-commit branch gap.
2. Nothing in ADR-0029 needs new prose for this pull. It is a policy about
   *how* to reuse fork material, not about which fork commit is current.

**Verdict: UNAFFECTED** as written, but its enforcement gates get a wider
input gap; see ticket 251/263 below — this is where the actual "which
document is now wrong" risk concentrates, not in ADR-0029's text.

---

## 3. CONTEXT.md — glossary and banned words

Read in full. The glossary defines `Stage`, `tier`, `phase` (the code
identifier), `maxPhase`, and the banned-word list (`"Phase N"` for delivery
steps, `"land"`). None of these definitions encode a specific tier value —
`maxPhase` is defined as "1-5" and the P1-P5/T4-T6 mapping table already
lists P3 = "T6 — head, shoulder, chest, legs, hands" and explains the T6
split across P3/P5. A tier bump to 3 exercises rows of this table that
already exist; it does not add or change a definition.

**Verdict: UNAFFECTED.** No term or default in CONTEXT.md changes.

---

## 4. Open tickets under `.scratch/carry-forward/issues/`

### Ticket 337 — "Content tier Phase 3 exists upstream; we stay Phase 2 until our PR target does"

This is the central ticket. Status: **blocked**, with the explicit trigger:

> "**The trigger:** when `feature/backend-reforge` itself flips to Phase 3,
> that is gear-prio's cue to re-pin and do the migration below."

This pull's premise — pull the pins forward to `feature/backend-reforge`,
tier moves 2->3 — **is** ticket 337's trigger condition, if R1 confirms the
branch tip is actually at `CURRENT_PHASE = Phase.Phase3` (ticket 337's own
body notes that as of 2026-08-30 the branch tip was *still* Phase 2 while
`master`/`v0.0.124` had already moved to Phase 3 — "still Phase 2 at its tip
... Phase 3 lives on `master`... reforge is 20 commits behind master"). So
before treating this as "the trigger fired," R1's re-measurement of
`CURRENT_PHASE` on the *current* branch tip is load-bearing — PROCESS.md
already says exactly this ("a prior read observed Phase3... treat that as
unverified").

Ticket 337 also names concrete downstream migration work that Stage 2/3 must
execute (regenerate item index/gem palette, curate the new tier's items with
`source`, bump `ENGINE_VERSION`), and a caveat: "reachable is not usable" —
prior tier work has hit missing vendored gear files at a new ref.

**Verdict: DECISION-REQUIRED-FROM-USER is too strong here — this ticket
already recorded the owner's decision and the trigger condition.** What the
research fan-out owes back to the user is: *does R1's measurement confirm
the trigger actually fired on `feature/backend-reforge`'s tip* (not on
`master`)? If yes, this pull **advances/closes** ticket 337 by design — it's
not a collision, it's the ticket's own planned next step. If R1 finds the
branch tip is still Phase 2 (as it was on 2026-08-30), then the "tier moves
2->3" half of this task's premise is false and ticket 337 remains blocked,
unaffected by a branch-drift-only pull.

### Ticket 211 — Fork-universes gate

**Closed** (2026-08-23, reopened/refixed through 2026-08-29, currently
green per its own log). Not reopened by this pull directly: 211's mechanism
(`pnpm fork-universes:check`) compares this repo's `data/universes/*` against
the **fork's** bundled copies, keyed to the **fork pin**
(`data/wowsims-fork.lock.json`), which this pull does not touch. However, if
the tier bump changes `data/universes/*.json` (new tier-3 entries, or
regenerated ret-p3/p4/p5 content), the gate will legitimately go red until
someone runs `sync_fork_universes.py --write` against the fork — this is the
gate doing its job, not a collision, but it is real follow-up work the
executor must not forget (211's history shows this exact gate has gone red
after every such regen so far).

**Verdict: UNAFFECTED as a decision; NEEDS operational follow-up** (a `--write`
refresh) once tier-3 universes regenerate — flag for Stage 3, not Stage 1/2.

### Ticket 350 — Two-hander swap leaves the worn off-hand item

Independent bug, found via ticket 342's upstream comparison. Its root cause
is a divergence between our engine and upstream's `bb4e77528` fix (present
on `feature/backend-reforge` at `cbf6b75a8`, which is *already* the ref our
`watchedRefs` entry points at — i.e. this fix is already inside the 153-commit
range this pull would pull forward). Pulling the pin forward does **not**
by itself fix 350 (350 lives in *our* `packages/core/src/rank.ts` and the
fork's mirrored copy, not upstream's Go code) — but the ticket cites the
exact upstream commit this pull would bring in-repo (as vendored Go source),
which the ticket author already read via `gh`/browsing, not via a local
checkout. Nothing here changes: 350 remains an independent, unstarted bug
regardless of whether the pin moves, because the fix has to be written in
our TypeScript engine.

**Verdict: UNAFFECTED / no collision.** Pulling the pin doesn't close, block,
or contradict 350. Note only: once vendored locally, 350's investigation
work (reading `bb4e77528`) becomes slightly easier (local grep instead of
`gh api`), but that's a convenience, not a document correctness issue.

### Ticket 351 — Weapon imbue does not follow candidate weapon

Same origin as 350 (ticket 342's comparison), same relationship to this pull:
independent TypeScript-side bug, references upstream commits already inside
the branch range, not resolved or invalidated by moving the pin.

**Verdict: UNAFFECTED / no collision.**

### Other tickets touched by search (`upstream`/`tier`/`pin`/`reforge`)

- **Ticket 251 — "The fork sits on `cbf6b75` while the engine pin is
  v0.0.119".** Status: **blocked**, explicitly "blocked by: owner decision at
  push or PR time." This is the ticket this whole pull most directly
  collides with: it already documents that the fork pin (`cbf6b75`, i.e.
  `feature/backend-reforge` at the date it was last fetched) and the engine
  pin (currently `v0.0.119`) have diverged, and it is waiting for exactly
  the kind of decision this task proposes to make ("we're only looking at
  one wowsims code repo on one branch"). **If the engine pin moves onto
  `feature/backend-reforge`, ticket 251 either closes (the two pins now
  agree on a branch) or needs its scope narrowed (if the fork pin isn't
  moved to the identical commit in the same pull).** This is the single
  ticket most likely to need an explicit disposition decision from Stage
  2's plan, and by extension from the user, because 251 says its own
  resolution is an "owner decision," and no owner decision has been
  recorded since it was filed.
- **Ticket 263 — "Derive the meta-preference table from wowsims, once
  upstream is one repo on one branch."** Explicitly `Blocked by: ` ticket 251
  (informally — 251's header says "Blocks: 263 (deferred until this is
  settled)"). If this pull resolves 251 (fork and engine pins agree on
  `feature/backend-reforge`), ticket 263's stated precondition ("we're only
  looking at one wowsims code repo on one branch") is satisfied and it
  should be **unblocked**, not merely advanced. This is worth surfacing to
  the user as a positive side effect, not just a risk.
- **Ticket 121 / 153** — already resolved (see PLAN.md line 274 discussion
  above); the reforge pull does not reopen them, but PLAN.md's stale
  sentence about them does need the fix noted in §1.4.
- **Ticket 239 / 244 / 245** — all closed. 244's `timeToNextEnergyTick` gap
  was the original reason `feature/backend-reforge` became a watched ref at
  all (ADR-0025 point 5). If this pull's target commit is at or past the
  commit that added `timeToNextEnergyTick` to the proto, this closes the
  underlying reason that gap existed — worth having R2 confirm the proto
  now carries the field, as a bonus outcome, though this doesn't change any
  document's correctness on its own (244 is already closed, its fix already
  shipped via the pinned-proto route it used at the time).
- **No other ticket's title/body match** `upstream|tier|pin|reforge` beyond
  what's listed above and in the ADR-0025/PLAN.md discussion (checked via
  `grep -rln` across all `.scratch/carry-forward/issues/*.md`).

---

## 5. `docs/workflow.md` and `docs/agents/known-traps.md`

- `docs/workflow.md` has no rule specific to moving the **wowsims engine**
  pin. Its pin-adjacent content is about the phase-N branch/tag convention
  for *this repo's* delivery phases (unrelated homonym, already covered by
  CONTEXT.md's glossary) and the `sync:wowsims:restore` command for
  refreshing gitignored vendor files from the lockfile. Neither says
  anything about `--ref` vs `--tag` semantics or about tier bumps.
- `docs/agents/known-traps.md` has a documented cycle for re-pinning the
  **fork** (`data/wowsims-fork.lock.json`) under "Before editing a ported
  engine file" (5 steps: E-W3 test, PROVENANCE.md update, fork commit,
  re-pin + regenerate sim-implemented-effects, `pnpm verify`). It has
  **no equivalent entry for re-pinning the main engine/build pin**
  (`data/wowsims.lock.json`) via `sync_wowsims.py --update`. That gap is
  itself worth naming: Stage 2's plan will effectively be writing the
  known-traps-equivalent checklist for an engine re-pin from first
  principles (ticket 337 sketches one), because no prior document
  codifies it.

**Verdict: NEEDS-EDIT (docs/agents/known-traps.md), but out of scope for R3
to write** — flag for Stage 2/3: once this pull's exact procedure is
executed once, its steps should probably be captured as a new known-traps
entry ("Before moving the wowsims engine pin") so the next re-pin doesn't
re-derive the checklist. Not a blocker for this pull; a follow-up.

---

## Summary table

| Document | Verdict | Line/ticket driving it |
|---|---|---|
| PLAN.md line 28-29 ("Currently 2") | NEEDS-EDIT (mechanical) | §8.5 line 638, ticket 337 |
| PLAN.md line 41 (Stage-vs-tier rule) | UNAFFECTED | — |
| PLAN.md line ~168 (`maxPhase` inclusive) | UNAFFECTED | — |
| PLAN.md line ~274 (ret sets "stop at P2") | NEEDS-EDIT (pre-existing, unrelated to this pull, but now higher-stakes) | ticket 121, 153; `data/wowsims.lock.json` `ret_p3.gear.json` entry |
| PLAN.md line 311-333 (lockfile/layout) | UNAFFECTED, unless Stage 2 picks `--ref` (then cosmetic edit) | PROCESS.md's `--update --ref` constraint |
| PLAN.md line ~506 (proto pin rule) | UNAFFECTED in substance | `data/wowsims.lock.json` proto block |
| PLAN.md line ~238 (mechanics.ts warning) | UNAFFECTED (warns about a different-expansion pin, not this branch) | — |
| PLAN.md §9 / ADR-0025 stale tag literal | NEEDS-EDIT, pre-existing | current lockfile v0.0.119 vs. cited v0.0.101 |
| ADR-0025 (stay pinned to a tag) | NEEDS-ADR (amendment) | Decision point 1, directly contradicted by pulling the build pin onto a branch |
| ADR-0027 (tab is primary) | UNAFFECTED | — |
| ADR-0028 (pool precedence) | UNAFFECTED as written; operational follow-up on `fork-universes:check` | ticket 211 |
| ADR-0029 (borrow/derive/justify) | UNAFFECTED as written; enforcement gap widens | ticket 251/263 |
| CONTEXT.md glossary | UNAFFECTED | — |
| Ticket 337 (tier 2->3 trigger) | Advances/closes IF R1 confirms branch tip is actually Phase 3; otherwise premise is false | ticket body, needs R1 |
| Ticket 211 (fork-universes gate) | UNAFFECTED as decision; operational re-run needed | — |
| Ticket 350 / 351 | UNAFFECTED, no collision | — |
| Ticket 251 (fork pin vs engine pin split) | **Central collision** — likely closes or needs explicit scoping | "owner decision at push or PR time" |
| Ticket 263 (derive meta table) | Likely **unblocked** as a side effect, if 251 resolves | Blocked by 251 |
| `docs/workflow.md` | No rule exists either way | — |
| `docs/agents/known-traps.md` | No engine-pin-move entry exists; worth adding after this pull, not before | — |

---

## Questions that need the human owner, not more reading

1. **Does ticket 251 close as part of this pull, or does the fork pin stay
   where it is?** 251 is explicitly waiting on "owner decision at push or PR
   time," and it names the exact "one repo, one branch" state this pull
   would create for the *engine* pin. If the fork pin (`data/wowsims-fork.lock.json`)
   is not moved to the same `feature/backend-reforge` commit in the same
   pull, the two pins still disagree — just at different distances — and 251
   is not actually resolved, only shrunk. This is a scope decision, not
   something more reading settles.

2. **Is ADR-0025's "stay pinned to a tag, branch is reference-only" policy
   being overturned, or is `feature/backend-reforge` being treated as a
   one-time exception?** The ADR's Decision #1 is a considered policy
   (guards against exactly the "reference material read as unavailable"
   mistake the ADR itself was written to fix). Reversing it needs an
   explicit owner call, not just a pin-move commit, because the *next*
   engineer reading ADR-0025 needs to know whether "stay pinned to a tag" is
   still the house rule going forward or was abandoned here.

3. **Given ticket 337's own measurement (2026-08-30) that the branch tip was
   still Phase 2 while `master` had moved to Phase 3** — does R1's fresh
   measurement actually show the trigger has now fired on the branch tip
   itself (`ec5c5f2`, 2026-09-03 per PROCESS.md), or is "the tier moved 2->3"
   half of this task's premise still unconfirmed? This is stated as an R1
   question in PROCESS.md already, but it gates whether ticket 337 is
   actually being closed by this work or whether the task is asking about a
   hypothetical that hasn't happened yet on this specific branch.

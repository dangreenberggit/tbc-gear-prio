## Corrections after independent review

An independent review checked the plan's load-bearing claims against source and against game rules. It upheld most findings, overturned one, and found errors in the checklist. **This comment supersedes the checklist in the previous comment** — use the corrected list at the bottom.

### Overturned: the prismatic gem item would have introduced a bug

The previous comment called our prismatic counting our "highest-confidence correctness bug" and told us to match upstream (credit prismatic gems with nothing toward meta activation). **That is backwards.** In TBC, prismatic gems count as all three colours for meta activation — that is the defining property of the colour. Our code matches the game; upstream's `default: return 0,0,0` in `metaGemActivationColorContribution` looks like *their* oversight. (Basis: community-documented game rule, not verifiable from either repo's data files — neither db.json carries activation prose.)

Why the divergence stays low-impact either way: the only two prismatic gems (Void Sphere 22459, Prismatic Sphere 22460) carry resistance-only stats — present in our palette, but with zero EP contribution, so an EP-driven fill or repair never selects them. The behavior only matters for a player already wearing one. Note the precise phrasing: they have **no EP-relevant stats**, not "no stats" — the reasoning survives only as long as resistances carry no EP weight.

Replacement work item: document the intentional divergence with a code comment at the prismatic mapping in `meta.ts` plus a test pinning our behavior; consider filing the bug upstream.

### Upheld, with corrections

- **Meta socket wrongly forfeits socket bonuses** — confirmed against both sources; promoted to the top-ranked fix. Also newly flagged: fixing it changes repair *cost pricing* (the repair cost adds the socket-bonus EP when a swap breaks a match), which changes which repairs get chosen on **every ranking**, not just meta-socket items. The fix needs a before/after comparison on real characters, not just a unit test.
- **Ranking-wide abort on repair failure** — confirmed, and there are **two** abort sites, not one: the baseline path and the per-candidate path. Fixing only the first leaves the second live.
- **"Unparseable" APL was the wrong word — the truth is worse.** The pinned binary is configured to silently drop unknown fields (`DiscardUnknown: true`). So feeding it the new feral rotation wouldn't produce an error — it would produce a **plausible-looking wrong number with no signal**, because the rotation's energy-timing conditions would silently vanish. This strengthens the case for the schema gate: it is the only thing that would catch this.
- **"Provably determinism-neutral" overstated** — the analysis is a strong static argument (byte-identical function bodies), not a proof. Defensible version: *no determinism-affecting change found by static comparison; the one identified risk (core-count-dependent float summation) predates the branch.* Note the first comment on this issue still says the concurrency change is "the highest-risk item for reproducibility" — that assessment is superseded by the static analysis; read the later comment as authoritative.

### Checklist hygiene the review caught

- **Line citations in the previous comment are unreliable** (e.g. `meta.ts:332-347` in a 204-line file; `socketsMatch` is at ~186, not 115). Cite **symbol names** when working the list; re-verify any line number against `feat/set-bonus-value` HEAD.
- **Ordering error:** the regem-minimization pass depends on the socket-match fix (the prose said so; the checklist ordered them as peers, dependency last).
- **A decision was filed as a fix:** "replace hardcoded `32409` meta preference with per-spec data" has no data source to draw from and EP cannot rank metas — that is design work, not a checkbox. Split into a spike (decide how metas get chosen when EP can't rank them) and a later implementation item.
- **A completed item was still listed as open:** "review our gem modules against upstream's" is *done* — the previous comment is its output. Closed; its findings are the items below.
- **The carry-forward bucket shrinks:** 117 and 116 are already fixed in-tree (the quality-cap chokepoint item is hardening, not fixing); 114 has its own item below. The other seven still need triage.

### Corrected Part B checklist (replaces the previous one; ordered)

1. - [ ] **Write failing tests first** for each behavioral fix below — this ticket exists because a wrong belief survived unchallenged; each fix gets a test that would have caught it
2. - [ ] **Fix both socket-match predicates** to skip non-coloured (meta) sockets when deciding socket-bonus forfeiture (`socketsMatch` in `meta-repair.ts`, `allSocketsMatched` in `candidate-gems.ts`) — then **measure the repair-choice blast radius** on ≥2 real characters before/after
3. - [ ] **Implement the regem-minimization pass** (after item 2; spec in previous comment): after repair, put the player's original gems back wherever the repaired layout permits, so recommendations use gems already owned; capture the pre-repair layout (currently overwritten in place); rewrite the user-facing swap report rather than appending
4. - [ ] **Separate "gave up" from "impossible"**: hitting the repair loop's max-attempts limit currently throws the same error as genuine infeasibility; make them distinct — and make both abort only the affected result, at **both** abort sites (baseline and per-candidate), instead of the whole ranking
5. - [ ] **Move the gem quality cap into the palette accessor** so no caller can bypass it (hardening; the two known bypass bugs are already fixed at call sites); close ticket 114 with a type guard (`null` quality passes a `<=` comparison in JS)
6. - [ ] **Spike: how should the meta gem be chosen when EP cannot rank metas?** (today: hardcoded `32409`, silently wrong for non-ret specs) — outcome is a design note, then an implementation item
7. - [ ] **Prismatic divergence**: code comment + pinning test documenting that we intentionally count prismatic gems toward all three meta colours (game-correct; upstream credits zero); consider filing upstream
8. - [ ] Triage remaining carry-forward tickets: 111, 107, 103, 29, 20, 06, 04

### Part A addition

- [ ] Doc corrections (`PLAN.md` §9 fix, ADR-0025) land **after** the Part B fixes settle — so the ADR documents the post-review conclusions (including the prismatic reversal), not the superseded ones
- [ ] Schema gate for skeleton generation: reject APL fields unknown to the pinned proto — now justified by silent-drop, not parse failure

### Unchanged and still highest measurement value

- [ ] **Feral five-seed spread; re-derive the tie-cutoff per spec.** The current cutoff was measured once on ret and applied to feral, whose rotation is noisier — feral rows may be treating noise as real differences *today*. Needs nothing from upstream.

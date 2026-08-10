# Plan review — spec.md (writing-for-agents rubric)

Reviewed: `.scratch/set-bonus-value/spec.md`. Rubric: `.claude/skills/writing-for-agents/SKILL.md`.

1. **§2.2 step 1, §2.2 step 3, §4 bullet 1, §4 bullet 4 — dangling pointers ("§9 symmetry invariant", "§10", "§12 rule", "§9 R7").** This document has sections 1–8; the cited sections do not exist in it, and the target document is never named. Pointer wording decides whether the agent reaches the material — these pointers cannot be followed at all, so the invariants they gate ("gem/enchant policy byte-identical", "rank never renumbered", "drawer honesty rule") rest on the agent guessing. Rewrite each as an explicit cross-document pointer, e.g. "the symmetry invariant in `docs/workflow.md` §9" (or wherever they live), or inline the one-line rule if the target is short.

2. **§5 V0 vs §2.2 — duplication of the synergy formula in different notation.** V0 restates the measurement as `synergy = D(A+B) − D(A) − D(B) + D(base)` while §2.2 defines `bonus(S,2) = packageDelta − Σ deltaDps`. Same meaning, two spellings — a future edit to one silently diverges the other, and an agent may treat them as two formulas. Keep §2.2 as the single source and have V0 say "compute §2.2's `bonus(S,2)` by hand for the two-piece package" (the current "a manual run of §2.2's own formula" framing is right; delete the re-derivation).

3. **§3 and Slice B — duplicated instruction "Bump `engineVersion`".** One meaning, two places (rubric: single source of truth). Keep it as the Slice B step (that is where the agent acts) and let §3 reference it or drop it.

4. **§2.3 and §3 — the `unmeasured` union is listed twice.** §2.3 says "the reasons are the `unmeasured` union in §3" and then enumerates them anyway with rationale. Keep the rationale in §2.3 (it is the *why*, which belongs there) but drop the literal value list from one side, or move the rationale to comments beside the §3 type so it is co-located with the source of truth.

5. **Slice B test — "assert: bonus ≈ X" has no bound (completion-criterion clarity).** "≈" is a vague done-condition an agent can satisfy with any tolerance, including one wide enough to pass a wrong formula. State the tolerance, e.g. "within 1e-6 of X for the synthetic runner (it is deterministic — exact equality is achievable)".

6. **§8 item 2 — "byte-identical … except the new additive fields and `engineVersion`" is not checkable as written.** "Byte-identical except X" names no procedure; an agent can eyeball a diff and declare it satisfied (premature completion). Rewrite with the check: "strip `setBonuses`/`setContext`/`engineVersion` from both JSON outputs and assert deep equality in a test" (or name the existing fixture-snapshot test to extend).

7. **Slice D — soft done-conditions.** "Short amendment in PLAN's own style, dated" is style guidance, not a bound; and "write the V0/V2 evidence … if not already done" duplicates §5 V0's own recording demand and reads as optional. Rewrite the slice's done-condition as a checklist: "PLAN.md §14 paragraph replaced with a dated pointer to this spec; `.scratch/set-bonus-value/verification.md` contains V0 command lines + four numbers and the V2 run pair" — and delete the "if not already done" clause.

8. **§1/§7 headings — negation framing ("do not rebuild it", "do not build").** Minor: §7 as a scope guardrail is legitimate, but §1's heading can be positive — "What is already true (build on it)" — and §7's items are fine as-is since they cannot be phrased positively.

## Executability check (§6)

- **Slice A**: startable. Inputs, file, test cases named; `set-bonus.ts` and pool/delta concepts are discoverable in-repo.
- **Slice B**: startable, modulo finding 5 (test tolerance) and finding 1 (the symmetry invariant it must hold is behind a dangling pointer).
- **Slice C**: startable; "Follow §4" is a clean pointer, but §4's own R7/§12 references are dangling (finding 1).
- **Slice D**: startable but its done-condition is the softest (finding 7).
- **§5 V0**: startable — binary named, fixture named, pass bound quantified, stop condition explicit. Good example of a demanding criterion.

**Verdict: fix 3 items first** (findings 1, 5, 6 — the dangling pointers and the two unverifiable done-conditions; the rest are prunes that can ride along).

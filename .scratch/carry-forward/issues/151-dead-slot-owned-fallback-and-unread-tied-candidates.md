Status: open
Type: cleanup
Origin: docs/reviews/feat-set-bonus-value.md round 6 (adversarial 6-A2, 6-A4)
Blocks: none
Blocked by: none

# The `owned` fallback is still the old proxy, and `tiedCandidates` is never read

Two loose ends from `cfc77c9`, both lower severity than ticket 150.

**6-A2 — the proxy fallback is still live.** `dead-slots.ts:141`:

    const candidates = owned.length > 0 ? owned : slotRows;

When no row carries `owned`, the classifier falls back to exactly the pre-fix
proxy. It is safer than before (two zeros now return `null` rather than picking
the first), but the originally-reported shape `[worn 0, clone 0, -300]` without
`owned` flags still yields no output and no warning.

Today `rank.ts:924` always sets `owned`, so the live path is covered. The
exposure is any other caller, or a re-render of a JSON artifact predating the
`owned` field — the same "old artifact" path `withSelfConfoundDisclosed` exists
to serve. Worth an explicit decision rather than a silent fallback.

**6-A4 — `tiedCandidates` has no consumer.** The field `cfc77c9` added to carry
the information the gap is "silent about by construction"
(`dead-slots.ts:95,183,226`) is read nowhere outside `dead-slots.ts` except one
assertion in `dead-slots.test.ts:164`. Neither `plausibility.ts`'s
`deadSlotMessage` nor any renderer reads it, so the tie count never reaches a
reader and the stated rationale is not delivered.

Related: with all candidates tied, `runnerUpGapDps` is 0 and the row classifies
`benign-nothing-better` with no warning — the exact suppression 2-A1 was about,
now resting on a field nobody reads.

## Fix

Decide whether the no-`owned` fallback should classify or refuse, and say so in
the code. Either surface `tiedCandidates` in the warning text or drop the field.

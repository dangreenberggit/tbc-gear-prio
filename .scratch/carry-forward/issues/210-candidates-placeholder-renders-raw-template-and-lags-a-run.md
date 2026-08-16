Status: resolved
Type: cosmetic + misleading indicator
Origin: ticket 156 slice C session, 2026-08-16
(`.scratch/carry-forward/plans/ticket-156/handoff-2026-08-16.md` §8 item 4, §4)
Blocks: none
Blocked by: none

# Candidates placeholder renders `{{count}} / {{count}}` on load, then lags a run behind

Two defects in one field, in
`vendor/tbc-new-fork/ui/core/components/individual_sim_ui/upgrades_tab.tsx`.

## 1. The raw template renders on a fresh page load

The string is `"{{count}} / {{count}}"`
(`assets/locales/en/translation.json`, `upgrades_tab.candidates_placeholder`).
It is read twice, and only one call passes the interpolation value:

```tsx
// construction — no values passed, so i18next has nothing to substitute
placeholder={i18n.t('upgrades_tab.candidates_placeholder')}

// inside run() — count supplied here, and only here
this.candidatesInput.placeholder = i18n.t('upgrades_tab.candidates_placeholder', {
  count: this.eligibleCount(specId, maxPhase),
});
```

So until the first run finishes the field shows the literal `{{count}} /
{{count}}`. Fixing it is a matter of passing the count at construction (or
choosing a placeholder that needs no interpolation).

Note also that the template repeats `{{count}}` twice, which renders the same
number on both sides of the slash — worth checking against whatever the field
was meant to say ("N eligible", "N / N"?).

## 2. It is a lagging indicator and must not be read as the pool a run will use

Corrected from an earlier description that called this purely cosmetic. The
placeholder interpolates **after a run completes**, and then shows the pool
size of the run that just **finished**. Change the phase and it still displays
the previous run's count until another run completes.

This matters because a measurement session naturally reaches for this field to
confirm "am I about to run against the Phase 3 pool?" — and it cannot answer
that question. Ticket 156's handoff records it as a trap that cost time. Verify
the pool from the run's own result rows instead.

## Resolution (2026-08-16)

Both halves fixed in the fork. `eligibleCount` is a pure synchronous filter
over the bundled pool, so the premise behind the old code's comment — that the
count "is not known until Run is clicked" — was simply false; the count is
knowable as soon as a spec and a phase are.

- New `refreshCandidatesPlaceholder()` writes the count, called once at
  construction and again from the existing staleness listeners, which
  `sim.changeEmitter` already fires on a phase change (the phase picker lives
  in the gear-slot item modal and routes through that emitter).
- The run-time write inside `run()` is removed: a value set there could only
  ever describe the run just started.
- The template `"{{count}} / {{count}}"` — which also repeated the same number
  on both sides of a slash — becomes `"all {{count}} eligible"`, with
  `"all eligible"` for a spec that has no pool rather than a misleading `0`.

## Acceptance criteria

- [x] A fresh page load shows a real number (or a placeholder needing no
      interpolation), never `{{count}}`.
- [x] The displayed count reflects the *current* spec/phase selection rather
      than the last completed run.
- [ ] Verified on a served production build, not just in source: this is an
      i18n string, so a source-only change proves nothing about what renders.
      **Left for the slice B run**, which rebuilds and serves anyway.

# Pre-merge review — feat/merge-ready-carry-forward

Diffed against: `dev...feat/merge-ready-carry-forward` (includes Phase 0 close
work this branch was cut from, plus the land / carry-forward workflow).

## Adversarial

Workflow slice only: `pnpm land` refuses dirty trees, `dev`/`main`, and
incomplete review/ticket state. No silent merge path.

## Domain

N/A for the workflow slice. Phase 0 deferrals live as carry-forward tickets
(`pnpm issues:open`).

## Standards + Spec

One door into `dev` (`pnpm land`), tickets as deferred-work source of truth,
matches `docs/workflow.md` “gates are scripts, not prompts.”

## Summary

| Axis             | Findings | Worst |
| ---------------- | -------- | ----- |
| Adversarial      | 0        | —     |
| Domain           | 0        | —     |
| Standards + Spec | 0        | —     |

## Disposition

| ID  | Axis | Disposition | Ticket / note                                                                                           |
| --- | ---- | ----------- | ------------------------------------------------------------------------------------------------------- |
| W1  | Spec | fixed       | `pnpm land` is the only supported merge into `dev`                                                      |
| W2  | Spec | fixed       | Phase 0 deferrals filed under `.scratch/carry-forward/issues/` and linked from `phase-0-close-gates.md` |

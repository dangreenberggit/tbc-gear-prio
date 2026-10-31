# Pre-merge review — chore/global-rules-split-rest

Reviewed range: `00bd849092d466aea3ef8421f36413828b8f1b80..471cdf488eee259d7bb6b9e97f8198c8eb0002cc`

Dispatch: no axes. The branch moves agent rules, skills and hooks from
this repo to the owner's global setup (staged in `docs/agents/home/`).
`python scripts/check_merge_ready.py --product-files` lists five files,
and each one only wires in agent tooling or cuts a stale pointer:

- `package.json`: drops the `foreground-hook:check` step, whose test
  moved to `docs/agents/home/hooks/tests/`.
- `eslint.config.js`: ignores `docs/agents/home/**`, the staged global
  skills, the way it already ignores `.claude/**`.
- `scripts/sync_wowsims.py`: a comment now points at
  `docs/agents/known-traps.md` § Before moving the wowsims engine pin.
- `docs/plans/ep-weights-from-sim.md`, `docs/plans/wowsims-tab/candidate-pool.md`:
  a dead pointer cut from each.

The owner's ruling for this case, 2026-10-30: "just dont do a full 3
axis product review just because we're in a product repo but not working
on product code. EZ. do something sensible". So each proposal on the
branch had one `instruction-review` instead, with every harm finding
fixed and re-checked before the owner approved the text, and a live
trial after each install. The reports are gitignored under
`.scratch/agent-reports/` (`2026-10-30-general-task-instruction-review-p*`
and `2026-10-31-general-task-instruction-review-p9-*`).

`pnpm verify` (with `TBC_VERIFY_WITHOUT_FORK=1`) passed at `14daeac1`
after one fix, `ed1e9925`, the eslint ignore above.

## Adversarial

Not dispatched (see Dispatch).

## Domain

Not dispatched: no game-domain content.

## Standards + Spec

Covered by the per-proposal `instruction-review` runs. The two harm
findings they raised are below; every other finding was a note, fixed
with a cut or a one-line change where one existed.

## Summary

The repo now keeps only its own values and pointers. The global
`AGENTS.md`, `model-policy.md`, two hooks and 47 skills hold the general
rules, and the owner installed each part. Tickets filed: 0. Tickets
closed: 0.

## Disposition

| ID  | Axis           | Disposition | Ticket / note                                                                                   |
| --- | -------------- | ----------- | ----------------------------------------------------------------------------------------------- |
| S1  | Standards+Spec | fixed       | item 7 text: "next" read as wait; reworded before commit `e116d3d3`                             |
| S2  | Standards+Spec | fixed       | item 7 text: merge-ask line dropped a finished branch's push; reworded before commit `e116d3d3` |
| S3  | Standards+Spec | fixed       | `pnpm verify` linted a staged skill's `.cjs`; eslint ignore in `ed1e9925`                       |

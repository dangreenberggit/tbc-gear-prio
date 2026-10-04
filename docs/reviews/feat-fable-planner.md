# Pre-merge review — feat/fable-planner

Reviewed range: `f01626f1c6f46fd9c6f980fa68c817b173d97481..2f75236f7e9bd7537280a2e3c9bcc4098c62392e`

Owner request (2026-10-04): "switch to fable planner now", at effort `low`,
as the current choice rather than a trial. The branch moves `gate-planner`
and `design-task` from Opus at effort `xhigh` to Fable at effort `low`
across the agent files, the stage-gate and parallel-phase skills (both
mirrors), `docs/agents/model-policy.md` and `AGENTS.md`.

Dispatch: four fresh `general-task` agents on Opus at effort `high`, run in
parallel in the foreground (adversarial, domain, standards, spec). Each was
told to write nothing and to spawn no subagents. `codex exec` was not used.

## Adversarial

No blockers. A1 (should-fix): the `design-task` respawn rule in
model-policy trusted the model named in a `WRONG_MODEL` return, so a session
holding the old definition ("expected Opus") would respawn a correct Fable
spawn on Opus. A2 (nit): the "contains Fable" check uses the wording that
once rejected a correct Opus spawn (ticket 252). A3 (nit): `model: fable`
in agent frontmatter is new to this repo. A4 (nit): the 2026-09-25 history
note read as if Fable is not the design lane. Checked clean: no text
outside history folders still sends the planner to Opus; mirrors match;
both Fable agents name a model on every spawn.

## Domain

**Domain: clean.** The diff states no TBC, WCL or wowsims fact. `gate-sme`
stays on Opus at effort `high`.

## Standards + Spec

**Standards.** No blockers. S1 (should-fix): the agent files said an
unnamed subagent "inherits" the planner's Fable with no source. S2
(should-fix): AGENTS.md repeated the name-the-model rule in the same
paragraph. S3 (nit): "This is the current choice, and the owner may change
it." adds nothing. S4 (nit): same as A4. S5 (nit): the subject says
"planner seats" but `design-task` is not a stage-gate seat.

**Spec.** No missing requirement and no scope creep. P1 (nit): same as A4.
P2 (nit): outside the repo, the owner's memory index still says "planner
Opus xhigh", and running sessions hold the old agent text.

Reviewed range: `2f75236f7e9bd7537280a2e3c9bcc4098c62392e..dc32d998e42c463db498f98819c0307c5d59a010`

Round 2, one fresh `general-task` (Opus, effort `high`) confirming the
fixes. A1, S1, S2 and A4/P1/S4 confirmed fixed. R1 (should-fix): the
stage-gate skill and model-policy § Stage-gate seats said "respawn with the
model named", which a stale return can misdirect the same way as A1. R2
(nit): new lines in model-policy were not wrapped.

Reviewed range: `dc32d998e42c463db498f98819c0307c5d59a010..6dad92dcea212141f29860d4291eb68a376a3933`

Round 3, same dispatch. R1 confirmed fixed. R2 not fixed (the long line
moved). T1 (nit): a new 116-character line in the stage-gate skill. T2
(nit): "the one the return expected" should match model-policy's "the model
the return says it expected".

Reviewed range: `6dad92dcea212141f29860d4291eb68a376a3933..8b32c69b9a4135324a119fd7e3eb8dd97bb4372d`

Round 4, same dispatch. T2 and the model-policy wrap confirmed. U1 (nit):
the stage-gate skill line was moved again, now 122 characters.

Reviewed range: `8b32c69b9a4135324a119fd7e3eb8dd97bb4372d..d313ce4425ab5ad7de72036e5ec26537862d9fa4`

Round 5 was checked by the authoring agent, not a fresh reviewer, because
the commit only splits one line. Evidence:
`git diff --word-diff 8b32c69b..d313ce44` shows no word change, and
`python scripts/check_skill_mirrors.py` exits 0.

## Summary

The switch is complete and consistent: nothing outside history folders
still sends a planner to Opus or `xhigh`. Every should-fix was fixed on the
branch. The remaining nits are wontfix with reasons below. `pnpm verify`
fails on this branch and on `dev` alike, in
`packages/core/test/fork-meta-repair.test.ts`, which reads a fork file
outside its `skipIf` guard (dev CI run 37177470204 fails the same way); every
other verify step passes.

## Disposition

| ID  | Axis        | Disposition | Ticket / note                                                                                                                                                   |
| --- | ----------- | ----------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| A1  | Adversarial | fixed       | model-policy respawns `design-task` on the agent-type table's model, not the return's (dc32d998)                                                                |
| A2  | Adversarial | wontfix     | The earlier Fable planner ran this same check clean (ticket 252); a second `WRONG_MODEL` goes to the owner                                                      |
| A3  | Adversarial | wontfix     | Every spawn names the model at the call site, which outranks frontmatter; https://code.claude.com/docs/en/sub-agents lists `fable` as a frontmatter model alias |
| A4  | Adversarial | fixed       | 2026-09-25 note now points to the 2026-10-04 note (dc32d998)                                                                                                    |
| S1  | Standards   | fixed       | Agent files say an unnamed subagent "can inherit" Fable and cite model-policy § Lane is per job, not per parent (dc32d998)                                      |
| S2  | Standards   | fixed       | Parenthetical cut from AGENTS.md § Models and walls (dc32d998)                                                                                                  |
| S3  | Standards   | wontfix     | The sentence records the owner's decision that this is not a time-boxed trial                                                                                   |
| S4  | Standards   | fixed       | Same fix as A4                                                                                                                                                  |
| S5  | Standards   | wontfix     | Subject already committed; rewriting history for a nit is not worth it                                                                                          |
| P1  | Spec        | fixed       | Same fix as A4                                                                                                                                                  |
| P2  | Spec        | wontfix     | Outside the repo; relayed to the session (memory line and fresh session)                                                                                        |
| R1  | Round 2     | fixed       | Stage-gate skill and model-policy respawn on the seat table's model (6dad92dc)                                                                                  |
| R2  | Round 2     | fixed       | model-policy lines rewrapped (8b32c69b)                                                                                                                         |
| T1  | Round 3     | fixed       | Stage-gate skill line rewrapped (d313ce44)                                                                                                                      |
| T2  | Round 3     | fixed       | Wording matches model-policy (8b32c69b)                                                                                                                         |
| U1  | Round 4     | fixed       | Stage-gate skill line rewrapped (d313ce44)                                                                                                                      |

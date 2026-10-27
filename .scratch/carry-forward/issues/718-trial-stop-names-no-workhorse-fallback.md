Status: open
Type: task
Origin: pre-merge review feat/usage-limit-fixes, A5, 2026-10-26
Blocks: none
Blocked by: none

# Stopping a trial type leaves no named workhorse type on cards without GLM

## What happens today

After `feat/usage-limit-fixes`, `discrete-task` and `modest-task` are the
only workhorse types on a card that does not list the GLM types
(`docs/agents/model-policy.md` § Workhorse jobs table, "Otherwise"
column). The trial rules (model-policy § Trial types, "Stopping and
review") tell every caller to stop spawning a type when its error rate
passes 1 in 10, and to tell the owner. They do not say which type takes
the stopped type's jobs.

## Why it matters

An overseer whose workhorse type is stopped has no named place to send
searches and reads, so it may go back to doing them itself, which is the
Opus usage burn the branch fixed (hypothesis, untested).

## Done when

model-policy § Trial types names the fallback type for each trial type's
jobs (for example `simple-task` for one action, else `general-task` with
the same block rule), or the owner rules that a stop waits for the owner.

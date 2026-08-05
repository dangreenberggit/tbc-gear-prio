# Pool-redesign manager stall — postmortem

**When:** 2026-07-28  
**Agent:** [Pool redesign manager](4322c491-59fd-4bbf-a15f-2ccd4db3497f)

## Was it “unavailable models”?

**Partly.** The manager opened with `model: gpt-5.6-sol-high` for both design workers. Sol hit a **usage wall** twice. It then correctly switched to `cursor-grok-4.5-high-fast`.

So: Sol wasn’t “missing from the enum” — it was **quota-walled**, and on Cursor it was the wrong first choice anyway (IDE routinely forces Grok for Task).

## Why the pipeline still stalled

After the Grok retry, the manager set `run_in_background: true` on both workers and **ended the turn** (“Waiting on the two design workers…”). Background Task completions notify the **parent** session, not a finished manager. Fan-in (math/SME/compile) never ran inside that agent. Handoff dir stayed empty until the parent resumed.

**Root cause mix:** Sol detour (wasted turns) + **abandon-after-background** (structural).

## Fix in repo policy

- `docs/agents/model-policy.md` — Cursor: presume Grok high; no Sol-probe; manager fan-out rules
- `AGENTS.md` — same one-liner
- `parallel-phase` Cursor adapter + Step 0 planner wording

External redesign work should still prefer a non-Cursor sharp model via `pool-redesign-external-brief.md` when quality matters more than IDE convenience.

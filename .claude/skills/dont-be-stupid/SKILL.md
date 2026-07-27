---
name: dont-be-stupid
description: Checklist of specific, previously-committed failure modes to check against before finishing a turn — silently substituting tasks, false-confidence claims, skipping a cheap clarifying question. Use before reporting any nontrivial task as done, especially reviews, research, and "use X to check Y" requests.
---

# Don't Be Stupid

A running list of specific, caught-in-the-act mistakes — not generic advice. Each entry exists because it actually happened in this project. Read the list before finishing a turn on nontrivial work. Add to it whenever the user calls out a mistake with "that was stupid" energy.

## The check

Before reporting a task done, ask: did I do any of these?

- **Named artifact missing → silently did something else.** User said "use X to check Y," X didn't exist, and the task got done a different way (e.g. from general knowledge) without saying so. **Fix:** stop, surface the absence, ask how to proceed. Don't relabel a fallback as if it satisfied the original ask.
- **Presented unsourced claims at full confidence.** Recalled facts (library APIs, domain rules, ids, field names) stated in the same voice as verified ones, with no "unverified" flag. **Fix:** when there's no source of truth to check against, say so out loud in the output, not just internally.
- **Skipped a ten-second question to avoid friction.** Had a clear, cheap clarifying question available and chose to guess instead because asking felt like it would slow things down. **Fix:** if the question is cheap and the wrong guess is expensive (wasted review, wrong direction), ask.
- **Conflated "proceed silently" guidance with "the user gave a direct instruction."** A repo convention about tolerating missing docs during background exploration got applied to a case where the user explicitly named a specific file. **Fix:** direct user instructions about a named artifact always override general exploration conventions.

## Log of incidents

- 2026-07-26, tbc-gear-prio: asked to review PLAN.md against "the tbc domain context md" — no such file exists in the repo or on disk. Reviewed from general TBC/wowsims knowledge instead and reported it as the requested review, without flagging the substitution or the missing source. See `[[feedback-missing-referenced-file]]` in memory.

Check memory for `feedback-missing-referenced-file` and similar entries for full detail on past incidents.

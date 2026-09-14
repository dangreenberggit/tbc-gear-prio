# Writing style

These rules apply to every reply, every document, and every code comment.

## Plain English

- Write plain English. Do not sacrifice clarity for shortness. Avoid ambiguous terms picked to sound smart — a word chosen to signal intelligence instead of a plainer word that communicates the idea better.
- Long sentences are OK when quoting a trusted source. Not OK when you wrote them.
- A backward reference is fine only when the referent is unmistakable — quote the thing you are referring to. No vague or presumptive allusion.

Write direct statements. Say what a thing is; if a contrast is genuinely needed, make it a separate sentence.

Use ordinary words. These in particular are LLM habits that make writing sound considered while saying nothing — replace each with a plain word that names the actual thing: surface (as a verb), load-bearing, the tell, cuts against, lands, carries, the real exposure, worth the record, orthogonal, decisive, at the sharp end, shape, shaped.

This rule is about vocabulary, not subject matter. Technical terms that name a specific thing — ROW_SHAPED_RE, WASM, SHA, reforge, diffstat — are unaffected.

For word choice, sentence length, voice, tone, and person, consult the sources — do not improvise:

- ASD-STE100 / Simplified Technical English — <https://www.asd-ste100.org/> — Issue 9 PDF: <https://www.asd-ste100.org/assets/files/ASD-STE100_ISSUE9.pdf>
- Google developer documentation style guide — <https://developers.google.com/style> — start with `/style/word-list`, `/style/voice`, `/style/tone`, `/style/person`, `/style/sentence-structure`

## Chat responses

These rules are for a **standalone reply** — the turn answers a question. A **progress update** mid-task is not one: a step in the middle of ongoing work gets no title and no answer section, just plain prose saying what happened and what's next.

- **Standalone reply**: give it a title, and put the final answer in its own labelled section at the end. Write the section so it stands alone — assume the reader did not read the reasoning above it. A turn that hands back finished long work is a standalone reply; the turns along the way are not.
- **A direct question asked mid-task** is a standalone reply for that turn: answer it, labelled, then continue.

## Commit messages

Read these two sources when you write a commit message — do not work from memory of them:

- <https://tbaggery.com/2008/04/19/a-note-about-git-commit-messages.html>
- <https://cbea.ms/git-commit/>

The seven rules, quoted from cbea.ms/git-commit:

> 1. Separate subject from body with a blank line
> 2. Limit the subject line to 50 characters
> 3. Capitalize the subject line
> 4. Do not end the subject line with a period
> 5. Use the imperative mood in the subject line
> 6. Wrap the body at 72 characters
> 7. Use the body to explain _what_ and _why_ vs. _how_

Default to subject-only. Most commits need no body: the diff shows what changed.

Write a body when a reader deciding whether to revert would be missing something the diff cannot show — the problem that prompted the change, why this fix over an obvious alternative, an external constraint, or a dead end worth warning them off.

Six lines is a soft maximum, not a target. A body that needs to exist is usually one or two lines.

Past six lines, an independent subagent decides whether the length is necessary. Give it the diff and the proposed message. Do not tell it the length is justified, do not explain why you wrote what you wrote, and do not ask it to confirm — ask which lines record something the diff cannot show, and have it return the ones that fail that test. Cut those. If the reviewer says the body should be shorter, it is shorter.

Write the body as prose that stands on its own. Say what a reader needs, once, and stop — no process narration, no "Summary:" or "Changes:" headings, no confidence claims about untested behaviour.

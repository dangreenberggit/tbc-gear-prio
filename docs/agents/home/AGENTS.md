# Writing style

These rules apply to every message, every document, and every code comment.

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

Every message that ends your turn has one clearly marked part written for the user: the **reply**. Everything the user needs is in the reply, and the reply makes sense on its own. The user can skip every other line you write in the turn and lose nothing. Being mid-task is no exemption: a turn that stops part-way through a task, asks for something, presents a decision, or waits for a background job also ends with a reply. A message that is only one or two sentences of result, and asks for nothing, is the reply by itself and needs no title or section names.

The title and the fixed section names below mark the reply so the user can find it. The reply is the last part of the message: it starts at its title and runs to the end.

A reply has these parts, in this order:

1. **A title** that states the result or the question in words, such as "Tests pass; ready for review". A title such as "Update" states nothing. The reply contains no acknowledgment ("Good question", "Done!") and no narration of how you managed the work.
2. **Labelled sections, conclusion first.** Name the first section **Answer**, **Result**, or **Status** (for work still in progress), and open it with the answer, the outcome, or where the work stands. A **Status** section ends by saying who acts next: the agent, once a named job finishes, or the user. Supporting detail — evidence, the reasoning behind the conclusion, what you checked — follows under its own labels. Tell events in the order they happened only when that order is itself the finding.
3. **Needed from you**, when you need anything — an answer, a permission, a decision, a manual step. Put every request in this section, so the user finds all of them in one place. Omit the section when you need nothing.

**Decisions** go in **Needed from you**. Give each one a label that is unique in the session — a ticket id, or `Q-<name>` — so a later list cannot reuse it; list numbers that restart at 1 make the user answer the wrong item. For each decision, write plain paragraphs: what happens today, what each option does and costs, and what you recommend and why. A structured-question picker is an addition to the reply, and the reasoning stays in the reply text.

**Text between tool calls** is outside the reply. Anything the user needs from that text goes in the reply as well.

**A direct question asked mid-task** gets its answer at once, under its own title; then continue working. That answer is text between tool calls, so the turn's final reply repeats it in one sentence in its first section.

**A subagent's final message** has two parts. First, the report its caller asked for, in the caller's format. Second, a section headed **Summary for the user**, written as a reply under this rule and under the Writing style rules above — plain English, direct statements, ordinary words — so the caller can pass it on without rewriting it. The caller checks that the summary agrees with the report and corrects it where it does not. The caller passes it on inside its own reply, adds only its own verdict, and puts every request — the subagent's and its own — in that reply's one **Needed from you** section.

**Sources on important claims.** An important claim — one that something will be built on, or that a substantial decision rests on — names its source (file:line, a ticket, a command a reader can re-run, or the user's words from the session transcript) or is marked "unverified". An agent passing text on to the user adds no factual claim of its own, keeps each claim to what its source says, and describes things on screen by where each one appears, never by a relation that no source shows. Before relaying a subagent's **Summary for the user**, the caller checks the summary's important claims against the subagent's report, and verifies each one whose source is missing or does not appear in the report, or marks it "unverified".

## Commit messages

Follow the seven rules quoted below when you write a commit message. They come from these two sources:

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

Past six lines, an independent subagent decides whether the length is necessary. Give it the diff and the proposed message. Do not tell it the length is justified, do not explain why you wrote what you wrote, and do not ask it to confirm. Ask which lines record something the diff cannot show, and have it return the ones that fail that test. Cut those. If the reviewer says the body should be shorter, it is shorter. If no reviewer can be reached, cut the body to six lines.

Write the body as prose that stands on its own. Say what a reader needs, once, and stop — no process narration, no "Summary:" or "Changes:" headings, no confidence claims about untested behaviour.

# Research: guidance sources for writing agent skills

**Date:** 2026-07-27  
**Branch tip:** `retro/w-skill-sources` (off `feat/fan-out-retro`)  
**Axis:** skill-writing quality first (Pocock bar); subject matter (multi-agent / worktrees / durable artifacts / context economics) secondary.

Primary finds: Matt Pocock ships an explicit meta-skill (`writing-great-skills` + glossary); Anthropic published Agent Skills as an open standard (`agentskills.io`) with a full authoring curriculum; Cursor and Claude Code document harness-specific SKILL.md mechanics on top of that standard.

---

## Recommendation (read these before rewriting `parallel-phase` / AGENTS skill text)

1. **[Pocock `/writing-great-skills`](https://github.com/mattpocock/skills/tree/main/skills/productivity/writing-great-skills)** — vocabulary for predictability, model- vs user-invoked, leading words, completion criteria, premature completion, pruning. This *is* the named bar.
2. **[agentskills.io best practices](https://agentskills.io/skill-creation/best-practices)** + **[optimizing descriptions](https://agentskills.io/skill-creation/optimizing-descriptions)** — first-party curriculum for progressive disclosure, gotchas, defaults-not-menus, trigger evals.
3. **[Anthropic engineering: Equipping agents…](https://www.anthropic.com/engineering/equipping-agents-for-the-real-world-with-agent-skills)** — why the three-tier load model exists (context economics).
4. **Skim** [Cursor skills](https://cursor.com/docs/skills) + [Claude Code skills](https://code.claude.com/docs/en/skills) only for harness knobs (`disable-model-invocation`, `paths`, subagent/worktree hooks) — not for prose craft.

**Top 3 picks:** Pocock `writing-great-skills` → agentskills.io best practices → Anthropic engineering post.

---

## Gold (skill-writing ≥75 or clearly Pocock-tier)

| Title | URL | What it is | Conf — skill-writing | Conf — subject | Why | Caveats |
| --- | --- | --- | --- | --- | --- | --- |
| Pocock `writing-great-skills` | https://github.com/mattpocock/skills/tree/main/skills/productivity/writing-great-skills · raw SKILL: https://raw.githubusercontent.com/mattpocock/skills/main/skills/productivity/writing-great-skills/SKILL.md · glossary: https://raw.githubusercontent.com/mattpocock/skills/main/skills/productivity/writing-great-skills/GLOSSARY.md · essay: https://www.aihero.dev/skills-writing-great-skills | Meta-skill + glossary defining predictability, invocation loads, information hierarchy, leading words, failure modes | 98 | 55 | **The named bar.** Practitioner who ships real engineering skill packs; educator-quality domain language; directly about *authoring* skills, not installing them | Vendor-agnostic prose; Claude/Cursor frontmatter flags still needed from harness docs |
| Pocock skills catalog (exemplars) | https://github.com/mattpocock/skills · install essay: https://www.aihero.dev/skills-catalog · hub: https://www.aihero.dev/skills | Full skill pack (`tdd`, `grill-with-docs`, `handoff`, `implement`, router `ask-matt`, etc.) used as living examples of the craft | 92 | 70 | Caliber match by construction; shows user- vs model-invoked split, durable CONTEXT.md/ADR patterns, handoff between agents | Not a how-to essay; learn by reading SKILL.md bodies. README stars on GitHub UI can look inflated — judge by content |
| agentskills.io — Best practices | https://agentskills.io/skill-creation/best-practices | Open-standard authoring guide: expertise extraction, context spend, progressive disclosure, control calibration, gotchas/templates/checklists | 95 | 40 | First-party curriculum for the SKILL.md format Cursor/Claude/Codex share; concrete anti-patterns (menus of tools, teaching HTTP) | Generic (not coding-agent-orchestration specific) |
| agentskills.io — Optimizing descriptions | https://agentskills.io/skill-creation/optimizing-descriptions | Trigger-eval methodology: should/should-not queries, train/val split, trigger rates, overfitting | 93 | 25 | Description quality is the #1 activation failure; unusually rigorous for docs | Eval scripts assume a client that surfaces Skill tool calls |
| agentskills.io — Evaluating skills | https://agentskills.io/skill-creation/evaluating-skills | Output-quality eval loop: test cases, grading, lean over over-constrained | 88 | 20 | Complements description evals; “explain why / keep lean” matches Pocock pruning | More product-skill oriented than orchestration playbooks |
| agentskills.io — Specification | https://agentskills.io/specification | Normative SKILL.md format, size budgets (~100 / &lt;5k / on-demand), directory layout | 85 | 35 | Ground truth for progressive disclosure budgets authors must respect | Spec, not craft essay |
| Anthropic engineering — Equipping agents for the real world with Agent Skills | https://www.anthropic.com/engineering/equipping-agents-for-the-real-world-with-agent-skills | Origin essay: anatomy, progressive disclosure, scripts vs docs, iterate from traces, security | 90 | 50 | Primary source for *why* skills are folders + three-tier load; context economics stated clearly | Oct 2025; open-standard update Dec 2025 — pair with agentskills.io for latest field names |
| Anthropic platform — Skill authoring best practices | https://platform.claude.com/docs/en/agents-and-tools/agent-skills/best-practices | Detailed Claude-platform authoring (descriptions, disclosure patterns, checklist) | 88 | 30 | Same ideas as agentskills.io with Claude product framing; high concrete density | Slightly Claude-API-skewed vs coding harnesses |
| Anthropic — Complete Guide to Building Skills (PDF) | https://resources.anthropic.com/hubfs/The-Complete-Guide-to-Building-Skill-for-Claude.pdf | Long-form PDF packaging structure + principles | 82 | 25 | Useful offline digest of the same progressive-disclosure doctrine | Marketing hub PDF; prefer live docs for updates |
| Anthropic `skill-creator` | https://github.com/anthropics/skills/tree/main/skills/skill-creator | Official skill that automates description eval / iteration | 80 | 15 | Operationalizes the optimizing-descriptions loop | Tool skill, not a prose guide; inspect before trusting automation |

---

## Silver (worth reading; 50–74)

| Title | URL | What it is | Conf — skill-writing | Conf — subject | Why | Caveats |
| --- | --- | --- | --- | --- | --- | --- |
| Cursor — Agent Skills docs | https://cursor.com/docs/skills | First-party Cursor SKILL.md, `paths`, `disable-model-invocation`, scripts/references, `/create-skill` | 72 | 45 | Required for Cursor harness knobs; progressive disclosure aligned with open standard | Mechanics &gt; craft; short on prose heuristics |
| Cursor help — Skills vs rules | https://cursor.com/help/customization/skills | Short rules-vs-skills decision table + create/migrate flows | 68 | 20 | Correct default: ambient → rules; multi-step → skills | Thin; no authoring depth |
| Claude Code — Extend with skills | https://code.claude.com/docs/en/skills | Claude Code skills: invocation control, dynamic context injection, subagent execution, monorepo nesting | 74 | 60 | Strong on *when* skills beat CLAUDE.md; useful orchestration hooks (subagent, `!` injection) | Claude-specific extensions beyond the open standard |
| Claude.com skills how-to | https://claude.com/docs/skills/how-to | Shorter consumer-facing create-skill guide | 60 | 10 | Decent checklist (focused, examples, test) | Overlaps platform docs; less depth |
| OpenAI Codex — Customization (AGENTS.md vs Skills) | https://developers.openai.com/codex/concepts/customization | Layers: AGENTS.md (ambient) vs Skills (workflows) vs MCP vs subagents | 65 | 55 | Clear mental model for what belongs in AGENTS vs skill — directly relevant to this repo’s split | Codex product page; not SKILL.md craft |
| OpenAI Codex — AGENTS.md guide | https://developers.openai.com/codex/guides/agents-md | Discovery/precedence, nesting, byte budget for always-on instructions | 55 | 50 | Context economics for *always-loaded* project instructions (contrast with progressive skills) | Not about writing skills |
| OpenAI — A practical guide to building agents (PDF) | https://cdn.openai.com/business-guides-and-resources/a-practical-guide-to-building-agents.pdf · hub: https://openai.com/business/guides-and-resources/a-practical-guide-to-building-ai-agents/ | Business/engineering guide: instructions, tools, single→multi-agent, guardrails | 58 | 65 | Strong on routines, edge cases, when to split agents — transferable to orchestration skills | Not SKILL.md format; enterprise tone |
| OpenAI Agents SDK — Tools | https://openai.github.io/openai-agents-js/guides/tools/ | Tool description / one-responsibility / validation practices | 52 | 40 | Description craft for tools parallels skill `description` craft | SDK-specific; not markdown skills |
| OpenAI Agents SDK — Define agents | https://developers.openai.com/api/docs/guides/agents/define-agents | Agent instructions, handoffDescription, smallest-agent guidance | 50 | 70 | Useful when a skill *spawns* specialists; handoff description ≈ skill description | Orchestration SDK, not skill authoring |
| Claude Code — Agents / parallelization overview | https://code.claude.com/docs/en/agents | When to use subagents vs agent view vs teams vs workflows; worktrees for file isolation | 45 | 90 | High subject relevance for rewriting `parallel-phase` *behavior*; low skill-prose craft | Read for ops design, not for SKILL.md style |
| agentskills.io — Adding skills support (client impl) | https://agentskills.io/client-implementation/adding-skills-support | How clients implement three-tier loading | 55 | 35 | Clarifies what “progressive disclosure” means at runtime — informs what authors can assume | Written for harness implementers |
| Anthropics example skills repo | https://github.com/anthropics/skills | Official example skills + skill-creator | 62 | 15 | Concrete SKILL.md layouts from the format inventors | Many examples are doc/PDF/domain demos, not coding-ops |

---

## Bronze / situational

| Title | URL | What it is | Conf — skill-writing | Conf — subject | Why | Caveats |
| --- | --- | --- | --- | --- | --- | --- |
| Codex — Subagents concept | https://developers.openai.com/codex/concepts/subagents | Parallel subagents, return summaries, read-heavy vs write-heavy | 35 | 85 | Subject matter for parallel-phase handoffs | Not skill-writing |
| awesome-agentic-patterns — Sub-agent spawning | https://github.com/nibzard/awesome-agentic-patterns/blob/main/patterns/sub-agent-spawning.md | Pattern notes: isolation scales, 2–4 agents, subject hygiene | 40 | 80 | Concrete orchestration heuristics | Community pattern catalog; uneven depth |
| Tim Dietrich — Claude Code parallel sub-agents | https://timdietrich.me/blog/claude-code-parallel-subagents/ | Practitioner how-to for parallel subagents | 30 | 70 | Clear independence criteria | Secondary blog; verify against Claude docs |
| Ajit Singh — Cursor Skills how-to | https://singhajit.com/how-to-create-and-use-skills-in-cursor/ | Third-party walkthrough of Cursor skills | 55 | 15 | Restates progressive disclosure + description craft accessibly | Secondary; prefer Cursor + agentskills.io |
| agents.md (portable project instructions) | https://agents.md/ | Cross-agent always-on project file convention | 40 | 45 | Useful contrast: always-on vs progressive skills | Not a skill-writing guide |
| Microsoft Agent Framework — Adding skills | https://learn.microsoft.com/en-us/agent-framework/journey/adding-skills | Progressive disclosure via load_skill tools | 48 | 30 | Confirms three-tier pattern outside Anthropic/Cursor | Different product surface |

---

## Skip (looked promising, rejected)

| Title | URL | Why reject |
| --- | --- | --- |
| MESHLAUNCH “2026 Cursor Agent Skills Complete Guide” | https://meshlaunch.com/en/blog/2026-cursor-agent-skills-complete-guide.html | SEO rehash of Cursor/agentskills docs; no original craft |
| LearnCursor / similar “create skills” listicles | e.g. https://www.learncursor.dev/learn/cursor-agents/cursor-agent-skills | Restates official docs; no practitioner depth |
| KDnuggets Anthropic guide summary | https://www.kdnuggets.com/anthropics-complete-guide-to-claude-skills-building | Secondary rewrite of Anthropic PDF — read the primary instead |
| Promptspace “Skills vs Rules vs AGENTS.md 2026” | https://www.promptspace.in/blog/claude-code-skills-vs-cursor-rules-vs-agents-md-developer-guide-2026 | Comparison listicle; some claims overconfident; use first-party Codex/Cursor pages |
| WebReference rules vs skills | https://webreference.com/ai/prompting/rules-vs-agents-vs-skills/ | Thin tertiary summary |
| Generic “10 tips for prompting” posts | (many) | Not skill-pack craft; skip unless named practitioner with shipped tooling |
| Skill Vault listing alone | https://skillvault.md/mattpocock/skills | Install mirror of GitHub; no additional authoring guidance |

---

## Notes for this repo (`parallel-phase` / AGENTS)

- **Split ambient vs playbook:** AGENTS.md / always-on rules for session focus, land gates, “don’t chase sibling worktrees”; `parallel-phase` as a **user-invoked** skill (`disable-model-invocation: true`) so it does not burn context load every turn — matches Pocock’s load trade and Cursor/Claude invocation flags.
- **Disclosure:** keep orchestration steps + completion criteria in `SKILL.md`; push harness adapters, handoff schemas, and long merge checklists behind pointers (Pocock ladder + agentskills progressive disclosure).
- **Leading words already in-repo:** *seam*, *tracer*, *worktree*, *handoff*, *fan-out* — use them as Leitwörter rather than restating definitions in every paragraph.
- **Subject sources** (Claude agents/worktrees, OpenAI subagents, OpenAI practical guide) inform *what the skill should enforce*, not *how to write the markdown*.

---

## Method (commands / sources used)

Web search + fetch of: mattpocock/skills, aihero.dev writing-great-skills, agentskills.io (spec, best-practices, optimizing-descriptions, evaluating-skills), Anthropic engineering + platform best-practices + PDF, Cursor docs/help, Claude Code skills + agents, OpenAI Codex customization / AGENTS.md / practical guide / Agents SDK tools, anthropics/skills skill-creator. Secondary blogs inspected and mostly demoted to Silver/Skip.

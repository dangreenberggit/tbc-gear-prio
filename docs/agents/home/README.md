# Archive: the old staged copy of the global agent files

**This folder is an archive, kept for reference. Nothing here is live.
Do not edit it to change a global rule, and do not copy it into
`~/.claude/`.** The source of the global agent files is the git repo
`/home/daniel/setup`, folder `research/rebuild/`. The copies here are the
text as it stood before the 2026-11-11 rebuild; the owner asked on
2026-11-13 to keep them as reference ("keep the old orchestration file as
refence too").

`install-routing.sh` and the copy block this README used to hold were
removed on 2026-11-13: running either would have overwritten the live
files with this older text.

Not yet moved to the setup repo: the hooks in `hooks/` and their tests.
`flash-over-sonnet.py` and `subagent-foreground-helpers.py` are live in
`~/.claude/hooks/`, and this folder holds their only versioned copy.
`hooks/install-flash-over-sonnet.sh` copies the first one and wires it;
it changes nothing while the two copies match.

## What the folder described

On the WSL host, `~/.claude/hooks/agent-guard.py` and `permissions.deny`
rules in `~/.claude/settings.json` replace `block-outside-repo.sh`; both
were installed 2026-10-19. The hook refuses an agent's writes to
`~/.claude/settings.json`, `~/.claude/settings.local.json` and
`~/.claude/hooks/`, and the deny rules also refuse Write and Edit calls to
`settings.json` and `hooks/`. An agent's write anywhere else in
`~/.claude/` goes ahead, and the hook
logs it to `~/.local/state/agent-guard/outside-writes.jsonl` except under
`~/.claude/projects/` and `~/.claude/plans/`. The hook sees a Write or
Edit call, and a Bash redirect or write command such as `cp` or `tee`
that names the path with `~` or in full. It expands `$HOME`, `$USER` and
the XDG directory variables before it checks a path. It does not see a
write made inside a script or an interpreter one-liner. The
`settings.json` in the Windows home wires no hook.

The staged file is named `CLAUDE.md.install` because a real `CLAUDE.md`
here would be auto-discovered as project context when an agent reads this
directory.

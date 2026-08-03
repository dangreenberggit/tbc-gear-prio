Status: closed
Type: bug
Origin: found while deduping pinned-fetch logic (ticket 24), 2026-07-30
Note: renumbered 25 -> 26; 25 was already taken by classallowlist-never-enforced
Blocks: none
Blocked by: none
Resolution: fixed -- fetch_protos.py --check now names CRLF drift instead of reporting a bare checksum mismatch

# A stale `data/proto/` worktree fails `fetch:protos:check` on Windows

## Problem

On this machine `pnpm fetch:protos:check` reported a checksum mismatch on
**every** proto file:

```
DRIFT: checksum mismatch: data\proto\ui.proto
DRIFT: checksum mismatch: data\proto\warlock.proto
... (all of them)
```

Nothing was actually wrong with the pins. The files were checked out with CRLF
line endings while `data/wowsims.lock.json` records the upstream LF bytes:

```
bytes on disk: 14003   lock bytes: 13491
crlf count: 512
disk sha           : 9bd19b2ad78dfe1e
lock sha           : 667584d36d0ba787
lf-normalised sha  : 667584d36d0ba787   <- matches
```

Normalising CRLF→LF reproduces the lock digest exactly, so the pin was correct
and the working tree was wrong.

`.gitattributes` already declares the right rule:

```
data/proto/**              text eol=lf
packages/core/src/proto/** text eol=lf
```

The committed blob is clean (`git show HEAD:data/proto/ui.proto` → 0 CRLF,
13491 bytes). The files had simply been checked out **before** that rule
applied, and `.gitattributes` does not retroactively re-normalise an existing
worktree.

## Workaround that fixed it here

```bash
rm -f data/proto/*.proto && git checkout -- data/proto/
```

No committed bytes changed — `git status` was clean afterwards.

## Why it is still worth a ticket

The failure is silent about its real cause: it presents as a supply-chain
integrity failure ("checksum mismatch" on every pinned file), which is exactly
the alarm you do not want crying wolf. Anyone hitting this on a fresh Windows
clone has to rule out an actual tampered pin first.

Two candidate fixes, neither taken here:

- Have `fetch_protos.py --check` detect the CRLF case and say so — e.g. if the
  LF-normalised digest matches the lock, report "line-ending drift, re-checkout
  `data/proto/`" rather than "checksum mismatch".
- Add a `git add --renormalize` step, or document the re-checkout, in the
  onboarding path so a fresh Windows clone never sees it.

The first is better: it makes the tool explain itself instead of relying on
someone having read the docs.

## Done when

- A CRLF-stale `data/proto/` produces a message naming line endings as the
  cause, not a bare checksum mismatch.
- The distinction is covered by a test or a documented manual reproduction.

## Closed 2026-07-30

Took the recommended first fix. `scripts/pinned_fetch.py` gained
`is_crlf_drift(blob, meta)`: returns True when the LF-normalised digest
(`blob.replace(b"\r\n", b"\n")`) matches the lock but the raw digest does not.
`scripts/fetch_protos.py`'s `do_check` calls it on a digest mismatch and, when
true, reports `line-ending drift (CRLF), not a content mismatch: <path> --
re-checkout: rm -f data/proto/*.proto && git checkout -- data/proto/` instead
of `checksum mismatch: <path>`. A genuine content mismatch (neither raw nor
LF-normalised digest matches) still falls through to the original
`checksum mismatch:` message unchanged.

Checked `scripts/sync_wowsims.py` and `scripts/sync_atlasloot.py` for the same
exposure: both verify files under `vendor/` (gitignored), which is populated
purely by `pinned_fetch.fetch` over the network -- never by `git checkout` --
and `.gitattributes` has no `text eol=lf` rule for `vendor/**`. There is no
"worktree checked out before the rule applied" path for those files, so the
same failure is not reachable there. Left them unchanged.

Verified manually (no Python test suite in this repo):

```
pnpm fetch:protos:check                          # in sync. (baseline, before and after)

python -c "import pathlib; p = pathlib.Path('data/proto/ui.proto'); \
  p.write_bytes(p.read_bytes().replace(b'\n', b'\r\n'))"
pnpm fetch:protos:check
# DRIFT: line-ending drift (CRLF), not a content mismatch: data\proto\ui.proto --
#   re-checkout: rm -f data/proto/*.proto && git checkout -- data/proto/
git checkout -- data/proto/
pnpm fetch:protos:check                          # in sync.

python -c "import pathlib; p = pathlib.Path('data/proto/ui.proto'); \
  p.write_bytes(p.read_bytes() + b'x')"
pnpm fetch:protos:check
# DRIFT: checksum mismatch: data\proto\ui.proto
git checkout -- data/proto/
pnpm fetch:protos:check                          # in sync.
```

`git status` on `data/proto/` was clean after each restore. `pnpm verify` is
green on the change.

# R4 — Pin vocabulary: what "the fork pin" and "the engine pin" each mean

Read directly from the repo on 2026-09-09, branch `dev` (clean). Every claim
below names the file or command it came from.

## Glossary

### 1. The engine pin (`data/wowsims.lock.json`)

- **What it is:** the single upstream release this repo builds its data
  files from. It names one repo (`wowsims/tbc-new`), one tag (`v0.0.119`),
  and one commit (`3267f8dfa4a2...`).
- **What governs it:** `scripts/sync_wowsims.py`. Its own docstring: "Everything
  we take from upstream is pinned to ONE release tag, recorded in
  `data/wowsims.lock.json`, and fetched into `vendor/` (gitignored)."
- **What it governs (build inputs):** the flat file snapshot in
  `vendor/wowsims/` — `db.json` (the item database), every spec's
  `*.gear.json` preset files, `constants_other.ts` (which carries upstream's
  own `CURRENT_PHASE`, the source of this repo's raid-content tier), and the
  `.proto` schema files this repo's own sim-invocation code compiles against.
  These are the inputs this repo's own TypeScript engine (`packages/core`)
  actually reads to build rankings.
- **`commit` / `tag`:** the pinned release. A normal `--update` moves both
  together to a new tag. A `--update --ref <branch-or-sha>` pin instead
  writes a branch name or bare commit sha into the `tag` field — so `tag` is
  not guaranteed to be a real git tag; check what's actually in it.
- **`watchedRefs`:** NOT a build input. Per the lockfile's own trailing
  `_comment` and `sync_wowsims.py`'s docstring, `--watch-ref` "records a ref
  ... WITHOUT fetching files or touching `vendor/` — it is a pure drift
  tripwire ... for a branch we build from the tag but want to know about if
  it moves." Today it holds exactly one entry:
  `feature/backend-reforge` → commit `cbf6b75a889e...`, fetched 2026-08-21.
  That means: this repo is *watching* that branch for movement, and *checking*
  it via `sync_wowsims.py --check`, but is **not building anything from it**.
- **`currentPhase` / `defaultMaxPhase`:** upstream's own `CURRENT_PHASE`
  enum value, read out of the pinned `constants_other.ts`. This is the
  content-tier gate (which raid phase's loot counts), unrelated to which
  branch is pinned.
- **What it currently points at:** tag `v0.0.119`, commit `3267f8dfa4a2...`.
  (Not `v0.0.101` — the tag has moved forward since ADR-0025 was written;
  see the ADR-0025 finding below.)

### 2. The fork pin (`data/wowsims-fork.lock.json`)

- **What it is:** which commit of a *personal fork* of the upstream repo
  (`dangreenberggit/tbc-new`, cloned to `vendor/tbc-new-fork/`) this repo's
  Upgrades-tab work is built against. This is a full engine + web UI
  checkout, not a handful of data files.
- **What governs it:** nothing regenerates this file automatically the way
  `sync_wowsims.py` does for the engine pin — it is a hand-maintained record
  of the state of a git clone that lives outside this repo's own git history
  (the clone is gitignored; it has its own `.git` pushing to the personal
  fork on GitHub).
- **What it governs:** the Upgrades-tab UI and ranking code inside
  `vendor/tbc-new-fork` — the browser-side sim, the tab's own gear-ranking
  engine port, and (separately) the bundled JSON copies under
  `vendor/tbc-new-fork/ui/core/components/individual_sim_ui/upgrades/data/`,
  kept in sync with this repo's `data/` sources by
  `scripts/sync_fork_universes.py` (see item 3 below).
- **Its own `_comment` states the split directly:** "Decision D2 intended the
  two to be the same, and as of 2026-08-21 they are not: the fork is on
  `cbf6b75` (`feature/backend-reforge`) while the engine pin moved to
  v0.0.119. See ticket 251 for the open decision; do not reconcile them by
  editing this field."
- **What it currently points at:** branch `feat/upgrades-tab` on the fork,
  commit `6d0edd69d237e...`, recorded as branched from `cbf6b75a889e...`
  (`feature/backend-reforge`). Verified empirically to be correct — see
  item 5.

### 3. A third, narrower file: `data/wowsims-fork-layout.lock.json`

Not one of the two pins above. It records a content hash
(`testedTabHash`) of the tab's own layout source files (SCSS/TSX) at the
last green run of a layout regression gate (`scripts/check_layout_gate.py`),
so `pnpm merge-to-dev` can skip a ~2m19s check when nothing relevant changed.
It does not pin any upstream commit — mentioned here only so it isn't
confused with the other two.

### 4. `vendor/wowsims/` vs `vendor/tbc-new-fork/` — the two vendor directories

Confirmed by listing both directories directly:

- **`vendor/wowsims/`** — a flat directory of individual files:
  `db.json`, `constants_other.ts`, and every spec's `*.gear.json` presets
  (`balance_p1.gear.json`, `ele_p2.gear.json`, etc.), plus the `.proto`
  schemas. This is the **vendored file snapshot** governed by the engine pin
  (`data/wowsims.lock.json`) and populated by `scripts/sync_wowsims.py
  --restore`.
- **`vendor/tbc-new-fork/`** — a full checkout: `go.mod`, `sim/`, `ui/`,
  `proto/`, `cmd/`, `assets/`, its own `node_modules/`, a compiled
  `wowsimtbc.exe`, and its own `.git` (confirmed: `git -C
  vendor/tbc-new-fork remote -v` → `origin
  https://github.com/dangreenberggit/tbc-new.git`). This is the **full
  engine/UI checkout** the Upgrades tab is built from, governed by the fork
  pin (`data/wowsims-fork.lock.json`), populated by manually cloning and
  checking out that fork (there is no `--restore`-style script for it in
  this repo; the clone is gitignored and, per `scripts/sync_fork_universes.py`'s
  docstring, "is NOT restored in CI").
- **`scripts/sync_fork_universes.py`** copies specific committed JSON
  artifacts (universe pools, EP-weight tables) from this repo's own `data/`
  outputs *into* the fork's bundled `upgrades/data/` directory, keyed off a
  provenance table in the fork's own `upgrades/data/PROVENANCE.md`. This
  keeps the tab's bundled copies from silently drifting from what this repo
  actually produces. It does not touch the fork's git commit/branch at all —
  it is a one-way data copy layered on top of whatever commit the fork
  clone happens to be checked out to.

## Ticket 251 restated in plain English

**What is split:** two separate "which upstream commit are we on" answers
that used to be the same thing and no longer are.

- The **engine pin** says: "our own TypeScript ranking engine's data comes
  from `wowsims/tbc-new` release `v0.0.119`."
- The **fork pin** says: "our Upgrades-tab UI/engine checkout is a personal
  fork's `feat/upgrades-tab` branch, which itself branched off commit
  `cbf6b75` — a point on `wowsims/tbc-new`'s `feature/backend-reforge`
  branch, not on any tagged release."

Ticket 251 found that these two reference points have **diverged** (not just
drifted forward at different speeds): GitHub's compare API reported
`status: diverged, ahead_by: 20, behind_by: 52` between `cbf6b75` and the
v0.0.119 commit. So there is no simple "just move one number forward" fix —
reconciling them means either a second, harder rebase of the fork across a
real fork point, or accepting two permanently different pins for two
different jobs.

**What decision it is waiting on:** whether to (1) rebase the fork onto
v0.0.119 so the two pins match again (restores original plan decision "D2",
which intended engine pin and fork pin to always be the same commit), or
(2) deliberately keep them different — the fork tracks the branch it intends
to eventually PR against (`feature/backend-reforge`), the engine pin tracks
the release we build from — and rewrite D2 to say two-pins-on-purpose is now
correct, or (3) defer both until upstream's own `feature/backend-reforge`
branch is merged into upstream's `master`, at which point the divergence
disappears on its own (an open, conflicted upstream PR #385 is expected to do
this eventually).

**Current state:** the owner ruled on 2026-08-22 to treat this as blocked —
"This is an upstream issue. We keep building on the fork's current base.
Whether and how to reconcile the fork branch with the engine pin is decided
when it is time to push or open a PR, if at all." So nothing is actively
waiting on ticket 251 right now; it stays open only so a future push/PR
decision has this record to consult. Ticket 263 (deriving a meta-gem
preference table from "upstream") is explicitly deferred until ticket 251
resolves one-repo/one-branch, because today the ret/feral(cat) presets come
from the engine pin and the feral-tank (bear) presets come only from the
fork clone, so "read it from upstream" has two disagreeing answers.

**What "closing" ticket 251 would concretely mean:** picking one of the three
options above, doing the git work it implies (a second rebase, or rewriting
plan decision "D2" plus correcting the fork lock's `_comment` so it stops
claiming `branchedFrom` equals the engine pin), and checking off ticket 251's
acceptance boxes. It is explicitly an owner-only call — the ticket says so —
not something a reviewing agent can resolve on the merits.

## ADR-0025: does its pin decision cover the engine, the fork/tab, or both?

**Quoted, Decision #1, verbatim:**

> 1. **Stay pinned to tag `v0.0.101` for building.** The branch is reference
>    material only. Re-pin when upstream tags a release (checklist:
>    `.scratch/handoffs/issue-1-upstream-gem-cleanup/impact-comment.md`,
>    bottom).

**Finding: this decision is about the engine pin only — data (a), not the tab
engine (b).**

Evidence, all from ADR-0025 itself:

- The ADR's whole subject is a **gem/meta-socket optimizer bug-fix
  investigation** in *this repo's own* TypeScript code
  (`packages/core/src/candidate-gems.ts`, `meta-repair.ts`), done by
  comparing against upstream's Go sim's `reforge_optimizer` package. It is
  dated 2026-08-12 — before the Upgrades-tab plan and before the personal
  fork (`data/wowsims-fork.lock.json`) existed at all. There is no
  `vendor/tbc-new-fork` in scope here; there is no tab.
- Decision #1's own words say "stay pinned... **for building**" — the only
  thing this repo "builds" from an upstream pin is the data snapshot
  (`vendor/wowsims/`) driven by `sync_wowsims.py`, which is exactly the
  engine pin.
- Decision #5 makes the mechanism explicit: "`feature/backend-reforge` is a
  watched ref in `data/wowsims.lock.json`" — naming the engine-pin lockfile
  by path, and describing the branch purely as a comparison/drift-tripwire
  target ("borrow only its rules"), never as something to build a UI from.
- The Upgrades tab and its separate fork pin (`data/wowsims-fork.lock.json`)
  were created later — ADR-0027 (2026-08-22) is the first document to even
  mention "the fork," and ticket 251 (also 2026-08-21/22) is the first place
  `data/wowsims-fork.lock.json` is discussed. ADR-0025 predates both by ten
  days and cannot have been a statement about a pin that didn't exist yet.

So ADR-0025 Decision #1 is a statement about **the data/engine pin** used to
build this repo's own ranking engine's inputs (option (b) in the prompt's
framing) — specifically, "don't rebuild our data snapshot from an
in-progress branch; treat that branch as read-only reference for borrowing
logic/rules." It says nothing about, and does not govern, which commit the
separately-created Upgrades-tab fork checkout builds from.

## Is there a recorded supersession of ADR-0025?

No. `grep -rl "0025" docs/adr/` returns only the ADR-0025 file itself — no
other ADR references, amends, or supersedes it. ADR-0027 (2026-08-22)
addresses a different question (which of two front ends — the tab vs. the
standalone web shell — is the primary product) and does not mention ADR-0025
or the engine-pin/branch question at all. Ticket 251 records the fork's
divergence from the engine pin as a *finding*, and the owner's 2026-08-22
ruling on it explicitly defers any reconciliation, rather than amending or
retiring ADR-0025.

One relevant wrinkle: ADR-0025's literal tag (`v0.0.101`) is now stale — the
engine pin has since moved to `v0.0.119` (a routine `sync_wowsims.py
--update`, unrelated to this question). The *policy* ADR-0025 states ("stay
on a tagged release for building; treat an active branch as reference
material") still applies; only the specific tag number it names is
outdated, exactly as its own text anticipated ("Re-pin when upstream tags a
release").

## Empirical check: does `vendor/tbc-new-fork` build from `feature/backend-reforge`?

Commands run directly against the clone on disk:

```
git -C vendor/tbc-new-fork branch -vv
* feat/upgrades-tab  6d0edd69d Make the single-stage guard fail loudly
  master             d7d89da2a [origin/master] Merge pull request #462 ...
  ...

git -C vendor/tbc-new-fork rev-parse HEAD
6d0edd69d237e725de8ec5d034c28aa10171bd21

git -C vendor/tbc-new-fork remote -v
origin  https://github.com/dangreenberggit/tbc-new.git (fetch/push)

git -C vendor/tbc-new-fork merge-base --is-ancestor \
  cbf6b75a889e52c4106351976db66efd914ea349 6d0edd69d237e725de8ec5d034c28aa10171bd21
exit 0   # true: cbf6b75 (feature/backend-reforge) IS an ancestor of fork HEAD

git -C vendor/tbc-new-fork merge-base --is-ancestor \
  3267f8dfa4a20746d4982c1522fdec1d4eb77f4c 6d0edd69d237e725de8ec5d034c28aa10171bd21
exit 1   # false: the engine pin's v0.0.119 commit is NOT an ancestor of fork HEAD

git -C vendor/tbc-new-fork branch -a | grep reforge
  backup/pre-reforge-rebase
  remotes/origin/feature/backend-reforge
```

**Result: yes, confirmed.** The checked-out fork's active branch
(`feat/upgrades-tab`, HEAD `6d0edd69d2`) genuinely descends from upstream's
`feature/backend-reforge` at the commit (`cbf6b75a889e`) recorded in both
`data/wowsims-fork.lock.json`'s `branchedFrom` field and the engine lock's
`watchedRefs` entry — and it does **not** descend from the engine pin's
current tag (v0.0.119). This matches ticket 251's finding exactly and was
independently re-confirmed today: a just-closed ticket (342, resolved
2026-09-09) explicitly re-derived the same fact — "fork HEAD `6d0edd69d` and
upstream `feature/backend-reforge` @ `cbf6b75a8` (the ref
`data/wowsims.lock.json` already watches, and an ancestor of the fork HEAD,
so both sides were read from the one clone without re-pinning)."

Docs describing the intended setup: ADR-0027 names the fork's pin-vs-engine
split directly ("the fork pin is behind the engine pin (ticket 251)");
`data/wowsims-fork.lock.json`'s `_comment` is the fullest description of
intent (D1/D2 plan decisions, gitignored clonePath, `pushed:false` meaning);
no script in this repo restores or rebuilds the fork clone automatically —
it is set up and moved by hand, and its state is only ever *recorded*
(not enforced) by the fork lockfile.

## VERDICT

**Claim under test:** "we already run the fork off the reforge branch, so
pinning our inputs there is consistent."

**Verdict: PARTLY TRUE — true of the fork/tab, false (or not-yet-decided)
for the data-file build pin, and the two are governed by different files on
purpose.**

- **True:** the Upgrades-tab fork checkout (`vendor/tbc-new-fork`,
  `data/wowsims-fork.lock.json`) genuinely is built from a commit that
  descends from `feature/backend-reforge` (`cbf6b75`), confirmed both by
  ticket 251's original finding and by today's independent `git
  merge-base --is-ancestor` check above.
- **Not (yet) true, and not simply a matter of "pinning our inputs there":**
  the *engine pin* (`data/wowsims.lock.json`) — which governs this repo's
  own ranking engine's data files under `vendor/wowsims/` — still builds
  from tagged release `v0.0.119`, not from `feature/backend-reforge`. It only
  *watches* that branch as a drift tripwire; it does not consume it. Moving
  the engine pin onto that branch is exactly the open question in ticket
  251/263 and ADR-0025, and it is explicitly an owner-only decision that has
  not been made — the owner's 2026-08-22 ruling deferred it, and no ADR has
  reversed that deferral.
- Because the divergence between the two refs is real (`diverged, ahead_by:
  20, behind_by: 52` per ticket 251), "pinning our inputs there" is not a
  free move even if desired: it would require a second rebase of the fork
  across that divergence (or waiting for upstream's own backend-reforge PR
  to land), not a one-line lockfile edit.

So the owner's premise is correct about the tab/fork half of this repo's
wowsims dependency, and not yet true — and not automatically "consistent" —
about the data-engine half. Pulling the vendored **data** inputs
(`data/wowsims.lock.json`) forward to `feature/backend-reforge` is a real,
not-yet-taken step, separate from the fork already sitting on that branch.

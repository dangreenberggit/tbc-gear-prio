# Pre-merge review — `fix/sim-header-null-assertion`

Reviewed range: `624eb3c7302f8b72dfe9aae5a580c6e16cce520e..a9f1cc1462d8dcca7d5782babc67d9337065f2e9`

The axes reviewed `7ae8812311fbfeb29038c0e5b5bd985308a76a7a`, which was amended
into `a9f1cc1` to carry the fixes below. The code tree is identical between the
two; only the lockfile `_comment` and the commit message differ.

Four axes ran on the review lane with fresh context — Adversarial, Domain,
Standards, and Spec. All four reported before this file existed.

**This file was written after the fact.** The session that dispatched the review
ended between the last axis reporting and the review file being committed, so a
later session assembled the file from the four completed axis reports. No axis
was re-run. The verification below is spot-checking of the load-bearing claims,
not a fifth review: the `ls-remote` result, the fork ancestry, and the
PROVENANCE grep were each re-measured against the clone before being written
down here.

The reviewed commit was `7ae8812`. Findings 1–3 were fixed by amending it, so the
branch tip is now `a9f1cc1` — same tree as the reviewed commit apart from the
`_comment` correction in `data/wowsims-fork.lock.json`, plus this file.

**No blockers. No code defects on any axis.** Every finding is about prose —
a lockfile comment, a commit message, and three documents that live elsewhere.

## Adversarial

**Clean on the code.** The fix replaces three non-null assertions in
`ui/core/components/sim_header.tsx` with plain lookups and one early-return
guard — one net line added. The axis read the whole method rather than the diff
hunk and confirmed every dereference sits after the early return, so there is no
path that returns early and then touches a half-wired element. No partial-state
window exists.

Six pin-sensitive gates were re-run at rc=0: `equip-eligibility:check`,
`engine-port-drift:check`, `sim-implemented-effects:check` (218 implemented,
451 stub-only), `fork-lint:check`, and `fork-universes:check`.

**A1 (major) — the lockfile's `_comment` stated a falsehood.** It read "Neither
commit is on the remote." `git -C vendor/tbc-new-fork ls-remote origin
refs/heads/feat/upgrades-tab` returns
`bbad1b8a4325d8168758a909a520cf4dced875f6`, so the remote is at `bbad1b8a4` and
only `5e9013b78` is unpushed. `pushed: false` was the right value; the sentence
justifying it was wrong. The same false claim was repeated in `7ae8812`'s body.
Raised independently by all four axes.

**A2 (minor) — "seven commits past that merge" was not self-verifying.** The
count is correct only under a ref the message never named:
`ec5c5f2..5e9013b78` is 135 commits, while `ab59127d9..5e9013b78` — the merge
commit that brought the upstream base in — is 7. Under § Durable claims a
reader must be able to re-run the command and get the stated number.

**A3 (minor) — the browser reproduction was method-theatre.** The author cloned
the live header, unwrapped the div, and ran the _old_ method body as a
standalone function. That demonstrates a hand-copied closure throws; it does not
demonstrate the shipped constructor throws. The conclusion is still correct, but
it rests on direct source reading rather than on that experiment: `wrap` is
null, `update()` runs unconditionally, and `null.classList` throws.

The positive half of the evidence _is_ real end-to-end: the built bundle
constructs, seven tabs render through Upgrades, and the fade toggles on both the
scroll and mutation paths.

**A4 (major, now context rather than action) — ticket 372's diagnosis is
inverted.** It claims the pin moved ahead of the clone and warns "Do not bump
the pin to `bbad1b8` — that is backwards." Ancestry proves the opposite:
`f90b12a7b` → `bbad1b8a4` → `5e9013b78` is linear, both
`git merge-base --is-ancestor` checks returning 0, so the clone was ahead and
bumping the pin forward was correct. The spec-registry stage-gate propagated the
same inversion through its plan and its execution report.

## Domain

**`sim_header.tsx` is an upstream wowsims file, not a ported engine file.**
`grep -c sim_header` over
`vendor/tbc-new-fork/ui/core/components/individual_sim_ui/upgrades/engine/PROVENANCE.md`
returns 0. No PROVENANCE row moves and no engine-port drift cycle applies. Three
axes verified this independently, and it was re-measured for this file.

**D1 (minor, deferred) — `docs/fork-upstream-touchpoints.md` §10 is now stale.**
It records `sim_header.tsx` at 50/15 and tags the crash "(inferred from source,
untested)". The file now measures 51/15, and the crash was reproduced. That
document does not exist on this branch — it lives only on
`docs/fork-upstream-touchpoints` at commit `66b6d1c`, which this review was
instructed not to touch. Deferred to whoever lands that branch.

**D2 (nit, pre-existing) — a comment argues against its own neighbour.** The
method's comment reasons that a `ResizeObserver` cannot fire from `addTab()`,
while a `ResizeObserver` is constructed two lines below it. Both statements are
correct — the comment is about tab addition, the observer covers viewport resize
— but nothing in the text says so, and an upstream reviewer will stop on it.
This fix did not introduce it.

## Standards + Spec

### Standards

**S1 (hard) — the commit body breached the 72-column wrap rule.** Ten lines of
`7ae8812`'s body ran 73–75 characters. Rule 6 of the seven.

**S2 — durable-claims breach**, same substance as A1: the body asserted as fact
something its own suggested command refutes.

**Clean otherwise.** Subject line is 49 characters, imperative, capitalised, no
trailing period, blank line before the body. The body explains what and why
rather than how. No comment-policy violation is introduced by the diff — the one
comment finding (D2) is pre-existing upstream text.

### Spec

The branch does what it says: re-pin the fork past the crash guard, and
regenerate `data/sim-implemented-effects.json` because it embeds the pin. The
diff is two files, four insertions, four deletions. No scope creep — nothing
under `packages/` is touched, and the code fix itself lives in the fork clone,
not this repo.

**Sp1 (minor)** — the evidence-quality problem recorded as A3. The spec claim
"reproduced rather than inferred" is stronger than the experiment supports for
the negative half, though the conclusion stands on source reading.

## Summary

A one-line guard against a real crash, re-pinned into this repo. All four axes
found the code correct and minimal, and none found a defect worth blocking on.

The whole finding set is documentary. Worst per axis — Adversarial: A1, a
lockfile comment asserting the opposite of what its own cited command returns.
Domain: D1, a touchpoints entry left stale, unreachable from this branch.
Standards: S1, ten over-length lines in the commit body.

Two findings point at artifacts this review could not reach. Ticket 372 (A4) is
wrong in a way that would mislead the next person to read it, and it lives on
`feat/spec-registry`; the touchpoints entry (D1) lives on
`docs/fork-upstream-touchpoints`. Both are deferred rather than fixed, because
editing another branch from this one would either lose the edit at merge or
create a conflict nobody asked for. Each is filed as a carry-forward ticket —
371 for the inverted diagnosis, 373 for the stale touchpoints entry — so the
correction survives this branch. 372 is deliberately skipped: it is the number
of the ticket 371 corrects, already allocated on `feat/spec-registry`, and
reusing it here is exactly the collision the tracker warns about.

A note on how this file came to be written late. The review itself was not
skipped or shortened — four axes ran with fresh context and reported in full.
What was lost was the write-up step, and with it the chance for the axes to
review each other's findings. Reconstructing from the reports preserves the
findings but not that cross-check, so this file claims only what the axes
claimed plus what was directly re-measured.

## Disposition

| ID  | Axis        | Disposition | Ticket / note                                                                                                                                                                                                                                                                                                                                                                                     |
| --- | ----------- | ----------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| A1  | Adversarial | fixed       | The lockfile `_comment` now names `bbad1b8a4` as the remote tip and `5e9013b78` as the one unpushed commit, with the `ls-remote` that shows it. `pushed: false` unchanged — it is still correct. Raised by all four axes.                                                                                                                                                                         |
| A2  | Adversarial | fixed       | The commit body now names `ab59127d9` and gives `git rev-list --count ab59127d9..5e9013b78`, so the seven is re-runnable.                                                                                                                                                                                                                                                                         |
| A3  | Adversarial | wontfix     | Evidence-quality note, no code change. The negative half of the reproduction proved a hand-copied closure throws, not the shipped constructor. The conclusion stands on source reading — `wrap` is null, `update()` runs unconditionally, `null.classList` throws. The positive half is real end-to-end.                                                                                          |
| A4  | Adversarial | defer       | Ticket 372's diagnosis is inverted; ancestry is linear `f90b12a7b` → `bbad1b8a4` → `5e9013b78`, so bumping the pin forward was right. 372 lives only on `feat/spec-registry`, which this review must not touch. The owner merges that branch separately and corrects 372 on `dev` afterwards. `.scratch/carry-forward/issues/371-ticket-372-diagnosis-is-inverted.md`                             |
| D1  | Domain      | defer       | `docs/fork-upstream-touchpoints.md` §10 still says 50/15 and "inferred from source, untested"; the file measures 51/15 and the crash was reproduced. The document exists only on branch `docs/fork-upstream-touchpoints` (`66b6d1c`), unreachable and out of bounds here. Fold in when that branch lands. `.scratch/carry-forward/issues/373-fork-upstream-touchpoints-sim-header-entry-stale.md` |
| D2  | Domain      | wontfix     | Pre-existing upstream comment whose `ResizeObserver` reasoning reads as contradicting the observer two lines below it. Both are correct; only the wording is confusing. Not introduced by this fix — worth folding into any upstream PR that carries this guard.                                                                                                                                  |
| S1  | Standards   | fixed       | Commit body re-wrapped to 72 columns; the ten over-length lines are gone.                                                                                                                                                                                                                                                                                                                         |
| S2  | Standards   | fixed       | The "which commits are on the remote" sentence was **deleted** from the commit message rather than corrected — that bookkeeping belongs in the lockfile `_comment`, which now carries it (A1).                                                                                                                                                                                                    |
| Sp1 | Spec        | wontfix     | Same substance as A3. Branch scope matches its stated intent exactly: two files, no `packages/` changes.                                                                                                                                                                                                                                                                                          |

No finding blocks the merge.

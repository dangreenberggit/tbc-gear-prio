# Decision log — finish-the-tab

One dated line per gate: gate, outcome, reason, round count.

- 2026-08-22 — **Stage opened.** Base SHA `10dbb3813d7cbb4be94ca1bd006b95f45a45be15`
  (`dev`), branch `feat/finish-the-tab` off `dev`. `git status --porcelain` empty at
  open. Fork clone `vendor/tbc-new-fork` on `feat/upgrades-tab` at `f359239`, clean,
  matching `data/wowsims-fork.lock.json`. Brief written from the owner's
  `.scratch/handoffs/wowsims-tab/BRIEF-finish-the-tab.md` plus the owner's chat
  additions (set-bonus toggle, BIS-list filter pre/post sim, every spec eventually),
  split into tranche 1 (this run) and tranche 2 (decide only). Three Sonnet Explore
  scouts fed the brief. Two scout claims checked by the orchestrator: HANDOFF-NEXT's
  "nothing merged to dev" is stale (`git merge-base --is-ancestor feat/candidate-pool
  dev` → yes); the fork tip carries M2 racing (`git -C vendor/tbc-new-fork log
  --oneline --grep=racing`) while core removed it (ADR-0026) — both recorded as facts
  in the brief. Ticket 252 (Opus-seat `WRONG_MODEL` misfire) still open: pre-empt in
  the spawn prompt, correct via `SendMessage` if it fires.

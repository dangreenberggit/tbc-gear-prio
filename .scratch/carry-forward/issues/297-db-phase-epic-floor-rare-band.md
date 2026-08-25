# db-phase epic floor unconditionally drops the rare band

Status: open
Origin: pre-merge review feat/upgrades-all-dps-specs (adversarial A11; SME packet item)
Blocks: none

`DB_PHASE_MIN_QUALITY = 4` drops every rare unsourced item (1,344 at p<=5)
with no per-spec or per-phase loosening. For the nine db-phase specs, pre-raid
rare BoE/vendor gear falls exactly in this band. The exclusion sample went to
the SME gate; a deliberate ruling (keep/loosen per phase) is still owed.

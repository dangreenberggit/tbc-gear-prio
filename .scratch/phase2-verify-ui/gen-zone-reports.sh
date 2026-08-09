#!/bin/bash
set -e
ZONES=("Black Temple" "Karazhan" "Hyjal Summit" "Serpentshrine Cavern" "Tempest Keep" "World Bosses" "Magtheridon's Lair" "Gruul's Lair")
declare -A SPEC=( [slamaltman]=ret [shredzepelin]=feral [nexess]=feral )
for CHAR in slamaltman shredzepelin nexess; do
  SP=${SPEC[$CHAR]}
  # The zone dropdown defaults to "All zones", which is the same run without
  # --raid. Generated here so a full sweep leaves no tab reading an older
  # ranking than its siblings.
  ALL=".scratch/phase2-verify-ui/reports/${CHAR}-p3-all.html"
  echo "=== $CHAR / All zones -> $ALL ==="
  pnpm rank --region US --realm dreamscythe --character "$CHAR" --offline --spec "$SP" --max-phase 3 --report "$ALL" >> .scratch/phase2-verify-ui/logs-zones.txt 2>&1
  for ZONE in "${ZONES[@]}"; do
    SLUG=$(echo "$ZONE" | tr '[:upper:] ' '[:lower:]-' | tr -d "'")
    OUT=".scratch/phase2-verify-ui/reports/${CHAR}-p3-${SLUG}.html"
    echo "=== $CHAR / $ZONE -> $OUT ==="
    pnpm rank --region US --realm dreamscythe --character "$CHAR" --offline --spec "$SP" --max-phase 3 --raid "$ZONE" --report "$OUT" >> .scratch/phase2-verify-ui/logs-zones.txt 2>&1
  done
done
echo "ALL ZONE REPORTS DONE"

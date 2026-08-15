// e-w4-diff.mjs — usage: node e-w4-diff.mjs before.json after.json
import { readFileSync } from "node:fs";

const [before, after] = process.argv
  .slice(2)
  .map((p) => JSON.parse(readFileSync(p, "utf8")));

const diffs = [];
function walk(x, y, path) {
  if (path === "player.equipment") return; // the one allowed field
  if (JSON.stringify(x) === JSON.stringify(y)) return;
  const bothObjects =
    typeof x === "object" &&
    x !== null &&
    typeof y === "object" &&
    y !== null &&
    Array.isArray(x) === Array.isArray(y);
  if (!bothObjects) {
    diffs.push({ path, before: x, after: y });
    return;
  }
  for (const k of new Set([...Object.keys(x), ...Object.keys(y)])) {
    walk(x[k], y[k], path ? `${path}.${k}` : k);
  }
}
walk(before, after, "");

if (
  JSON.stringify(before.player?.equipment) ===
  JSON.stringify(after.player?.equipment)
) {
  console.error(
    "SANITY FAIL: player.equipment identical in both captures — the harness did not capture the import. No verdict."
  );
  process.exit(2);
}
if (diffs.length === 0) {
  console.log("PASS: empty diff outside player.equipment");
} else {
  console.log(`FAIL: ${diffs.length} difference(s) outside player.equipment`);
  for (const d of diffs) {
    console.log(
      `- ${d.path}\n    before: ${JSON.stringify(d.before)}\n    after:  ${JSON.stringify(d.after)}`
    );
  }
  process.exit(1);
}

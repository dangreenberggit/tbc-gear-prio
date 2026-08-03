// Does the metaCtx deficit block ever run for a META socket now?
import { fillEmptyCandidateGems } from "../../packages/core/src/candidate-gems.js";
import { gemsForPhase } from "../../packages/core/src/gems.js";
import { socketsFor } from "../../packages/core/src/items.js";
import { GemColor } from "../../packages/core/src/proto/common_pb.js";
import ep from "../../data/presets/ret/p2.ep-weights.json" with { type: "json" };

const w = ep.weights as Record<string, number>;
const palette = gemsForPhase(3);
const headId = 32461;
const sockets = socketsFor(headId);
const metaIdx = sockets.indexOf(GemColor.GemColorMeta);

// With a meta context supplied (the normal rank path), and an empty meta socket:
const out = fillEmptyCandidateGems(headId, [0, 0], palette, w, {
  meta: { metaId: 25894, otherGemIds: [32193, 32193, 24054] },
});
console.log("meta ctx says worn meta = 25894 (Swift Skyfire)");
console.log("fill result:", out);
console.log(`meta socket got: ${out[metaIdx]} (expect 32409 Relentless)`);

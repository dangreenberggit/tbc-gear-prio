// The fork's dev server with our fixture plugin added. Run it from the fork
// root (vendor/tbc-new-fork), because upstream's config resolves some paths
// against the working directory:
//
//   node node_modules/vite/bin/vite.js serve --config ../../scripts/tab-harness/vite.config.mjs
//
// Upstream's vite.config.mts stays as upstream wrote it. This file calls its
// config function and appends the plugin, so the fork carries no tooling of
// ours. It imports nothing from `vite`: this repo has no `vite` package, and a
// plain object needs no helper.
import path from "node:path";

import upstream from "../../vendor/tbc-new-fork/vite.config.mts";
import { tabFixtures } from "./tab_fixtures.mjs";

const FIXTURE_DIR = path.resolve(
  import.meta.dirname,
  "..",
  "..",
  "data",
  "tab-fixtures"
);

export default async (env) => {
  const config = await upstream(env);
  return {
    ...config,
    plugins: [...(config.plugins ?? []), tabFixtures(FIXTURE_DIR)],
  };
};

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
//
// Upstream's type checker (vite-plugin-checker) is dropped unless
// TBC_TAB_TYPE_CHECKER=1. It runs `tsc --noEmit --watch` as a child that
// outlives vite when only vite's PID is killed, so a batch of headless runs
// that kills vite by PID leaves one watcher per run (seen 2026-10-25).
// Headless runs do not need it, because `pnpm verify` type-checks the fork
// (scripts/check_fork_lint.py). `pnpm tab:dev` turns it on, because
// scripts/dev-tab.mjs stops the server's whole process group.
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

const CHECKER = "vite-plugin-checker";

export default async (env) => {
  const config = await upstream(env);
  // flat(): vite accepts nested plugin arrays, so the checker could sit in one.
  let plugins = (config.plugins ?? []).flat(Infinity);
  if (process.env.TBC_TAB_TYPE_CHECKER !== "1") {
    // Fail loudly: if upstream renames or wraps the checker, a filter that
    // matches nothing would bring the leaked watchers back without a sign.
    if (!plugins.some((p) => p?.name === CHECKER))
      throw new Error(
        `scripts/tab-harness/vite.config.mjs: upstream's config has no plugin named ${CHECKER}; update CHECKER so headless runs still drop the type checker`
      );
    plugins = plugins.filter((p) => p?.name !== CHECKER);
  }
  return {
    ...config,
    plugins: [...plugins, tabFixtures(FIXTURE_DIR)],
  };
};

/**
 * Stub for the fork's `virtual:i18next-loader` module.
 *
 * That specifier is not a file. The fork's Vite build materialises it with the
 * `vite-plugin-i18next-loader` plugin, which walks its locale directories and
 * emits the bundled translation resources. Vitest runs the fork's `.ts` files
 * through its own Vite pipeline without that plugin, so the import resolves
 * nowhere and the module graph dies before any test body runs.
 *
 * It reaches the engine by a long transitive edge — `engine/rank.ts` imports
 * `items.ts`, which imports `proto_utils/database.ts`, which eventually pulls in
 * the fork's i18n config — and nothing on that path is what the engine tests
 * measure. An empty resource bundle is the honest stand-in: i18next accepts it,
 * and every string it would have supplied is display text no assertion reads.
 *
 * Wired up as a `resolve.alias` in the root `vitest.config.ts`, where the
 * specifier resolves to this file for the whole suite. Nothing outside the
 * vendored fork imports it.
 */

export default {} as Record<string, unknown>;

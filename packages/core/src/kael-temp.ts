/** Kael'thas temporary legendaries — excluded from rank candidates (D7). */
const KAEL_TEMP_LEGENDARY_IDS = new Set([
  30318, 30313, 30316, 30317, 30312, 30311, 30314,
]);

export function isKaelTempLegendary(itemId: number): boolean {
  return KAEL_TEMP_LEGENDARY_IDS.has(itemId);
}

/** How many sources the "Last used" group lists. */
export const LAST_USED_COUNT = 3;

/**
 * The sources used most recently, newest first. A source also stays in its own group (pinned or by language), so
 * the shortcut never hides where it normally lives.
 */
export function recentSources<T extends { lastUsedAt: number | null }>(
  sources: readonly T[],
  count = LAST_USED_COUNT,
): T[] {
  return sources
    .filter((source): source is T & { lastUsedAt: number } => source.lastUsedAt !== null)
    .sort((a, b) => b.lastUsedAt - a.lastUsedAt)
    .slice(0, count);
}

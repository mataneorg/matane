/**
 * Fetches a manga's details and chapters ahead of the click, when the pointer rests on its card. Opening a manga
 * for the first time otherwise waits for the site (ADR 0040); done ahead, the page opens full.
 *
 * It is careful with the site: at most `max` at a time, each manga once per session (a failure may try again),
 * and the caller only asks after the pointer has rested a moment, so moving across a grid fetches nothing.
 */
export function createPrefetcher(refresh: (mangaId: number) => Promise<unknown>, max = 2) {
  const started = new Set<number>();
  let running = 0;
  return {
    /** Starts the fetch unless it already ran, is running, or the limit is reached. Returns whether it started. */
    request(mangaId: number): boolean {
      if (started.has(mangaId) || running >= max) return false;
      started.add(mangaId);
      running++;
      void refresh(mangaId)
        .catch(() => started.delete(mangaId))
        .finally(() => running--);
      return true;
    },
  };
}

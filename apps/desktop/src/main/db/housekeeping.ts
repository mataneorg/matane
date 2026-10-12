import { LOCAL_SOURCE_ID } from '@manga-reader/shared';
import type Database from 'better-sqlite3';

/** A listing creates a row for every manga it shows; rows nobody kept are dropped after this long. */
export const BROWSE_ROW_TTL_MS = 14 * 24 * 60 * 60 * 1000;

export interface PurgeResult {
  deleted: number;
  /** Permanent copies of covers on disk that belonged to the deleted rows, for the caller to remove. */
  coverPaths: string[];
}

/**
 * Opening a listing stores a row per manga shown (docs/adr/0040), so the table would grow with every browse. This
 * deletes the rows that are only cache: not in the library, untouched for `ttlMs`, and with nothing the user did
 * attached to them: no history entry, no reading session (kept for statistics), no tracker link or queued update,
 * no custom cover, no chapter that was read, bookmarked or started, and no download (its row would cascade away and
 * orphan the files on disk). The local files source is never touched. Chapters, category links and the full-text
 * index follow by cascade and triggers.
 */
export function purgeBrowseRows(sqlite: Database.Database, now: number, ttlMs = BROWSE_ROW_TTL_MS): PurgeResult {
  const stale = sqlite
    .prepare(
      `SELECT m.id, m.cover_path AS coverPath FROM manga m
       WHERE m.in_library = 0 AND m.updated_at < ? AND m.source_id <> ?
         AND m.custom_cover_path IS NULL
         AND NOT EXISTS (SELECT 1 FROM history h WHERE h.manga_id = m.id)
         AND NOT EXISTS (SELECT 1 FROM reading_sessions s WHERE s.manga_id = m.id)
         AND NOT EXISTS (SELECT 1 FROM manga_tracks t WHERE t.manga_id = m.id)
         AND NOT EXISTS (SELECT 1 FROM tracker_queue q WHERE q.manga_id = m.id)
         AND NOT EXISTS (
           SELECT 1 FROM chapters c
           WHERE c.manga_id = m.id
             AND (c.read = 1 OR c.bookmarked = 1 OR c.last_page > 0
                  OR EXISTS (SELECT 1 FROM downloads d WHERE d.chapter_id = c.id)))`,
    )
    .all(now - ttlMs, LOCAL_SOURCE_ID) as { id: number; coverPath: string | null }[];
  if (stale.length === 0) return { deleted: 0, coverPaths: [] };
  const remove = sqlite.prepare('DELETE FROM manga WHERE id = ?');
  sqlite.transaction(() => {
    for (const { id } of stale) remove.run(id);
  })();
  return {
    deleted: stale.length,
    coverPaths: stale.flatMap(({ coverPath }) => (coverPath ? [coverPath] : [])),
  };
}

import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import type { ExtensionManifest } from '@matane/extension-sdk/manifest';
import { LOCAL_SOURCE_ID } from '@manga-reader/shared';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { DbChanges } from '../changes';
import { type DatabaseConnection, openDatabase } from '../client';
import { BROWSE_ROW_TTL_MS, purgeBrowseRows } from '../housekeeping';
import { runMigrations } from '../migrate';
import { ExtensionsRepository } from '../repositories/extensions';
import { MangaRepository } from '../repositories/manga';

const migrationsFolder = resolve(__dirname, '../../../../drizzle');
const manifest: ExtensionManifest = {
  id: 'demo',
  name: 'Demo',
  version: '1.0.0',
  apiVersion: 1,
  nsfw: false,
  sources: [{ key: 'en', lang: 'en', name: 'Demo' }],
};
const NOW = 100 * BROWSE_ROW_TTL_MS;
const OLD = NOW - BROWSE_ROW_TTL_MS - 1;

let dir: string;
let connection: DatabaseConnection;
let manga: MangaRepository;

beforeEach(async () => {
  dir = mkdtempSync(join(tmpdir(), 'matane-housekeeping-'));
  connection = openDatabase(join(dir, 'data.db'));
  await runMigrations(connection, { migrationsFolder, backupDir: join(dir, 'backups') });
  const changes = new DbChanges(() => undefined);
  new ExtensionsRepository(connection.db, changes).upsert(manifest, 1);
  manga = new MangaRepository(connection.db, changes);
});

afterEach(() => {
  connection.sqlite.close();
  rmSync(dir, { recursive: true, force: true });
});

/** A manga a listing created `at` ms ago-ish (an absolute time), with a first chapter. */
function listed(url: string, at: number): number {
  const id = manga.ensure('demo/en', { url, title: url }, at);
  connection.sqlite
    .prepare("INSERT INTO chapters (manga_id, url, name, fetched_at) VALUES (?, 'c1', 'Chapter 1', ?)")
    .run(id, at);
  return id;
}
const exists = (id: number) => connection.sqlite.prepare('SELECT 1 FROM manga WHERE id = ?').get(id) !== undefined;
const chapterOf = (id: number) =>
  (connection.sqlite.prepare('SELECT id FROM chapters WHERE manga_id = ?').get(id) as { id: number }).id;

describe('purgeBrowseRows', () => {
  it('drops old rows nobody kept, with their chapters and search entries', () => {
    const id = listed('/a', OLD);
    const result = purgeBrowseRows(connection.sqlite, NOW);
    expect(result.deleted).toBe(1);
    expect(exists(id)).toBe(false);
    expect(connection.sqlite.prepare('SELECT count(*) AS n FROM chapters').get()).toEqual({ n: 0 });
    expect(connection.sqlite.prepare("SELECT count(*) AS n FROM manga_fts WHERE manga_fts MATCH 'a'").get()).toEqual({
      n: 0,
    });
  });

  it('keeps rows seen recently, and renews a row that keeps showing up in listings', () => {
    const recent = listed('/recent', NOW - 1000);
    const again = listed('/again', OLD);
    manga.ensure('demo/en', { url: '/again', title: '/again' }, NOW - 1000);
    expect(purgeBrowseRows(connection.sqlite, NOW).deleted).toBe(0);
    expect([recent, again].every(exists)).toBe(true);
  });

  it('keeps manga in the library', () => {
    const id = listed('/lib', OLD);
    connection.sqlite.prepare('UPDATE manga SET in_library = 1, added_at = ? WHERE id = ?').run(OLD, id);
    expect(purgeBrowseRows(connection.sqlite, NOW).deleted).toBe(0);
    expect(exists(id)).toBe(true);
  });

  it('keeps what the user did: history, reading time, tracker links, a read, bookmarked or started chapter', () => {
    const withHistory = listed('/history', OLD);
    connection.sqlite
      .prepare('INSERT INTO history (manga_id, chapter_id, read_at) VALUES (?, ?, ?)')
      .run(withHistory, chapterOf(withHistory), OLD);
    const withSession = listed('/session', OLD);
    connection.sqlite
      .prepare('INSERT INTO reading_sessions (manga_id, chapter_id, started_at, active_ms) VALUES (?, ?, ?, 1000)')
      .run(withSession, chapterOf(withSession), OLD);
    const withRead = listed('/read', OLD);
    connection.sqlite.prepare('UPDATE chapters SET read = 1 WHERE manga_id = ?').run(withRead);
    const withBookmark = listed('/bookmark', OLD);
    connection.sqlite.prepare('UPDATE chapters SET bookmarked = 1 WHERE manga_id = ?').run(withBookmark);
    const started = listed('/started', OLD);
    connection.sqlite.prepare('UPDATE chapters SET last_page = 4 WHERE manga_id = ?').run(started);
    const withCover = listed('/cover', OLD);
    connection.sqlite.prepare("UPDATE manga SET custom_cover_path = '/x.png' WHERE id = ?").run(withCover);
    expect(purgeBrowseRows(connection.sqlite, NOW).deleted).toBe(0);
    for (const id of [withHistory, withSession, withRead, withBookmark, started, withCover])
      expect(exists(id)).toBe(true);
  });

  it('keeps a manga with a download, so its files are not orphaned', () => {
    const id = listed('/download', OLD);
    connection.sqlite
      .prepare("INSERT INTO downloads (chapter_id, status, format, created_at) VALUES (?, 'done', 'cbz', ?)")
      .run(chapterOf(id), OLD);
    expect(purgeBrowseRows(connection.sqlite, NOW).deleted).toBe(0);
    expect(exists(id)).toBe(true);
  });

  it('never touches the local files source', () => {
    connection.sqlite
      .prepare(
        "INSERT INTO extensions (id, name, version, api_version, installed_at, updated_at) VALUES ('local', 'Local', '1', 1, 1, 1)",
      )
      .run();
    connection.sqlite
      .prepare("INSERT INTO sources (id, extension_id, key, name, lang) VALUES (?, 'local', 'files', 'Local', 'multi')")
      .run(LOCAL_SOURCE_ID);
    const id = manga.ensure(LOCAL_SOURCE_ID, { url: '/books/one', title: 'One' }, OLD);
    expect(purgeBrowseRows(connection.sqlite, NOW).deleted).toBe(0);
    expect(exists(id)).toBe(true);
  });

  it('returns the permanent covers of the deleted rows', () => {
    const id = listed('/covered', OLD);
    connection.sqlite.prepare("UPDATE manga SET cover_path = '/covers/1.jpg' WHERE id = ?").run(id);
    expect(purgeBrowseRows(connection.sqlite, NOW).coverPaths).toEqual(['/covers/1.jpg']);
  });
});

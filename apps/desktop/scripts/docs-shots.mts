// Takes the screenshots on the docs site (apps/docs/public/img) from the REAL app: it adds an extension repository
// the way a user does, installs extensions from it, fills a library from their real sources and photographs each
// screen in Mocha and Latte. Not part of CI (it needs the network and a display) and not the Playwright suite. Look
// at every image before you commit it: nothing personal may show (paths, proxy settings, names).
//   pnpm --filter @manga-reader/desktop build && pnpm --filter @manga-reader/desktop docs:shots --repo <url> [options]
// Options:  --repo <url>       the extension repository to add (required: Matane suggests none)
//           --ext a,b          ids of the extensions to install from it; the first source that browses fills the library
//           --themes a,b       flavors to photograph (default mocha,latte)
//           --only a,b         only these screens (names as in the SCENES list below)
//           --manga <n>        how many manga go in the library (default 12)
//           --browse-query <t> what the Browse screen searches for (default One Piece)
//           --skip a,b         leave out manga whose title contains one of these words (case-insensitive); the
//                              Popular list is not vetted, so look at the photographs and add what must not show
//           --out <dir>        where the images go (default apps/docs/public/img), as WebP via ImageMagick
import { spawnSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { type ElectronApplication, type Page, _electron as electron } from '@playwright/test';
import electronPath from 'electron';

const HERE = import.meta.dirname;
const DESKTOP = resolve(HERE, '..');
const REPO = resolve(DESKTOP, '../..');

const args = process.argv.slice(2);
const option = (name: string): string | undefined => {
  const at = args.indexOf(`--${name}`);
  return at >= 0 ? args[at + 1] : undefined;
};
const REPO_URL = option('repo');
if (!REPO_URL) {
  console.error('--repo <url> is required: Matane suggests no repository, so say which one to add');
  process.exit(2);
}
const EXT_IDS = (option('ext') ?? 'webtoons,mangaplus,mangadex').split(',').filter(Boolean);
const THEMES = (option('themes') ?? 'mocha,latte').split(',').filter(Boolean);
const ONLY = option('only')?.split(',').filter(Boolean);
const MANGA = Math.max(3, Number(option('manga') ?? 12));
const SKIP = (option('skip') ?? 'hentai,ecchi,harem').toLowerCase().split(',').filter(Boolean);
const OUT = resolve(option('out') ?? resolve(REPO, 'apps/docs/public/img'));
const BROWSE_QUERY = option('browse-query') ?? 'One Piece';

const WIDTH = 1280;
const HEIGHT = 800;

let app!: ElectronApplication;
let page!: Page;
const home = mkdtempSync(join(tmpdir(), 'matane-shots-'));
const downloads = join(home, 'Documents', 'Matane');
const scratch = mkdtempSync(join(tmpdir(), 'matane-shots-png-'));

const invoke = <T = unknown,>(channel: string, input?: unknown): Promise<T> =>
  page.evaluate(
    ([c, i]) =>
      (window as unknown as { api: { invoke(c: string, i?: unknown): Promise<unknown> } }).api.invoke(c as string, i),
    [channel, input] as const,
  ) as Promise<T>;

const go = async (hash: string): Promise<void> => {
  await page.evaluate((value) => {
    window.location.hash = value;
  }, hash);
};

/** Settings are nested and `settings.set` replaces whole top-level keys, so patch one key from what is there. */
async function patchSettings(patch: (settings: Record<string, unknown>) => Record<string, unknown>): Promise<void> {
  const current = await invoke<Record<string, unknown>>('settings.get');
  await invoke('settings.set', patch(current));
}

async function launch(): Promise<void> {
  app = await electron.launch({
    executablePath: electronPath as unknown as string,
    args: [DESKTOP, ...(process.env['MATANE_E2E_NO_SANDBOX'] === '1' ? ['--no-sandbox'] : [])],
    // The profile lives under a throwaway XDG_CONFIG_HOME, so nothing of yours is touched or shown.
    env: { ...process.env, XDG_CONFIG_HOME: join(home, 'config'), HOME: home } as Record<string, string>,
  });
  page = await app.firstWindow();
  await page.waitForSelector('aside, [data-testid="onboarding"]');
  await app.evaluate(
    ({ BrowserWindow }, [w, h]) => {
      const win = BrowserWindow.getAllWindows()[0]!;
      win.unmaximize();
      win.setContentSize(w!, h!);
      win.center();
    },
    [WIDTH, HEIGHT],
  );
  await page.waitForTimeout(800);
}

/** Waits until the covers on screen have loaded, so a photograph is not full of grey boxes. */
async function settle(extra = 900): Promise<void> {
  await page
    .waitForFunction(() => [...document.images].every((image) => image.complete), undefined, { timeout: 12_000 })
    .catch(() => undefined);
  await page.waitForTimeout(extra);
}

let theme = 'mocha';
let taken = 0;

/** Paths of this computer never reach a photograph: they are swapped for neutral ones in the page first. */
async function hidePaths(): Promise<void> {
  await page.evaluate(
    ([swaps]) => {
      const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
      for (let node = walker.nextNode(); node; node = walker.nextNode()) {
        let text = node.nodeValue ?? '';
        for (const [from, to] of swaps!) text = text.split(from!).join(to!);
        if (text !== node.nodeValue) node.nodeValue = text;
      }
      for (const input of document.querySelectorAll('input')) {
        for (const [from, to] of swaps!)
          if (input.value.includes(from!)) input.value = input.value.split(from!).join(to!);
      }
    },
    [
      [
        [downloads, '~/Documents/Matane'],
        [join(home, 'config'), '~/.config'],
        [home, '~'],
        [tmpdir(), '~'],
      ],
    ] as const,
  );
}

async function shot(name: string): Promise<void> {
  if (ONLY && !ONLY.some((o) => name === o || name.startsWith(`${o}-`))) return;
  mkdirSync(OUT, { recursive: true });
  await hidePaths();
  const png = join(scratch, `${name}.${theme}.png`);
  await page.screenshot({ path: png });
  // WebP at 1280 px wide keeps a screen near 60 KB where the PNG is a megabyte of covers.
  const made = spawnSync('magick', [png, '-resize', '1280x', '-quality', '82', join(OUT, `${name}.${theme}.webp`)]);
  if (made.status !== 0) throw new Error(`ImageMagick (magick) could not convert ${name}: ${made.stderr}`);
  taken += 1;
  console.log(`  ${name}.${theme}.webp`);
}

async function setTheme(flavor: string): Promise<void> {
  theme = flavor;
  await patchSettings(() => ({ theme: flavor }));
  await page.waitForTimeout(500);
}

// ------------------------------------------------------------------ extensions

interface SourceInfo {
  id: string;
  extensionId: string;
  key: string;
  installed: boolean;
}
interface MangaItem {
  mangaId: number;
  title: string;
}
interface ChapterItem {
  id: number;
  number: number | null;
}
interface RepoInfo {
  id: number;
}
interface Preparation {
  token: string;
}

const dialog = () => page.getByRole('dialog');

async function openRepositories(): Promise<void> {
  const panel = page.getByTestId('repositories-panel');
  if (!(await panel.isVisible())) await page.getByRole('button', { name: 'Repositories', exact: true }).click();
  await panel.waitFor();
}

/** The user's way in: Extensions, Repositories, Add repository, paste the address, add, install. */
async function repoFlow(): Promise<void> {
  await go('#/browse/extensions');
  await settle();
  await openRepositories();
  await page.getByTestId('repositories-panel').getByRole('button', { name: 'Add repository' }).click();
  await dialog().getByLabel('Repository URL').fill(REPO_URL!);
  await page.waitForTimeout(400);
  await shot('add-repository-filled');
  await dialog().getByRole('button', { name: 'Add', exact: true }).click();
  // The index lists hundreds of extensions: wait for the answer, which is either a warning or a repository.
  const anyway = dialog().getByRole('button', { name: 'Add anyway' });
  await Promise.race([
    anyway.waitFor({ timeout: 90_000 }).catch(() => undefined),
    dialog()
      .waitFor({ state: 'detached', timeout: 90_000 })
      .catch(() => undefined),
  ]);
  if (await anyway.isVisible()) {
    await page.waitForTimeout(400);
    await shot('add-repository-unverified');
    await anyway.click();
  }
  await dialog()
    .waitFor({ state: 'detached', timeout: 60_000 })
    .catch(() => undefined);
  await page.waitForTimeout(2000);

  await page.getByRole('tab', { name: /^Available/ }).click();
  await settle(1500);
  await shot('extensions-available');

  // The install dialog of the first extension: checked, but not confirmed.
  await page.getByPlaceholder('Search extensions…').fill(EXT_IDS[0]!);
  await page.waitForTimeout(800);
  await page.getByTestId('available-row').first().getByRole('button', { name: 'Install' }).click();
  await page.waitForTimeout(5000);
  await shot('extension-install');
  await dialog().getByRole('button', { name: 'Cancel' }).click();
  await page.waitForTimeout(500);

  const [repo] = await invoke<RepoInfo[]>('repos.list');
  for (const id of EXT_IDS) {
    const prepared = await invoke<Preparation>('extensions.prepareInstall', { repoId: repo!.id, extensionId: id });
    await invoke('extensions.install', { token: prepared.token });
  }

  // The installs above went around the page; a reload makes it read what is there now.
  await page.reload();
  await page.waitForSelector('aside');
  await go('#/browse/extensions');
  await page
    .getByTestId('extension-row')
    .first()
    .waitFor({ timeout: 15_000 })
    .catch(() => undefined);
  await settle();
  await openRepositories();
  await page
    .getByTestId('repo-card')
    .first()
    .waitFor({ timeout: 15_000 })
    .catch(() => undefined);
  await settle(800);
  await shot('repositories');
  // Leaving the page closes the panel.
  await go('#/library');
}

/** Undoes `repoFlow`, so the next flavor photographs the same steps from the start. */
async function repoReset(): Promise<void> {
  for (const id of EXT_IDS) await invoke('extensions.uninstall', { extensionId: id }).catch(() => undefined);
  for (const repo of await invoke<RepoInfo[]>('repos.list')) await invoke('repos.remove', { repoId: repo.id });
  await page.reload();
  await page.waitForSelector('aside');
}

/** The sources of the installed extensions, the first with a usable Popular list. */
async function installedSources(): Promise<{ main: SourceInfo; popular: MangaItem[] }> {
  const sources = await invoke<SourceInfo[]>('sources.list');
  // In the order of --ext: the first extension that browses fills the library.
  const mine = sources
    .filter((s) => EXT_IDS.includes(s.extensionId) && s.installed)
    .sort((a, b) => EXT_IDS.indexOf(a.extensionId) - EXT_IDS.indexOf(b.extensionId));
  for (const source of mine) {
    const first = await invoke<{ items: MangaItem[] }>('sources.browse', {
      sourceId: source.id,
      kind: 'popular',
      page: 1,
    }).catch(() => null);
    if (first && first.items.length >= 6) return { main: source, popular: first.items };
    console.warn(`  ${source.id}: Popular gave ${first?.items.length ?? 'an error'}, trying the next source`);
  }
  throw new Error('no source answered with a list: pass other extensions with --ext');
}

// ------------------------------------------------------------------ the library

interface Seeded {
  mangaIds: number[];
  chapters: Map<number, ChapterItem[]>;
}

/** Adds manga to the library, with a few categories, and fetches their chapters. */
async function seedLibrary(popular: MangaItem[]): Promise<Seeded> {
  const reading = await invoke<{ id: number }>('categories.create', { name: 'Reading' });
  const later = await invoke<{ id: number }>('categories.create', { name: 'Plan to read' });
  const seeded: Seeded = { mangaIds: [], chapters: new Map() };
  const fit = popular.filter((m) => !SKIP.some((word) => m.title.toLowerCase().includes(word)));
  for (const [index, manga] of fit.slice(0, MANGA).entries()) {
    try {
      await invoke('manga.refresh', { mangaId: manga.mangaId });
      const chapters = await invoke<ChapterItem[]>('chapters.list', { mangaId: manga.mangaId });
      if (chapters.length === 0) continue;
      const categoryIds = index % 3 === 0 ? [reading.id] : index % 3 === 1 ? [later.id] : [];
      await invoke('library.add', { mangaId: manga.mangaId, categoryIds });
      seeded.mangaIds.push(manga.mangaId);
      seeded.chapters.set(
        manga.mangaId,
        [...chapters].sort((a, b) => (a.number ?? 0) - (b.number ?? 0)),
      );
      console.log(`  library: ${manga.title} (${chapters.length} chapters)`);
    } catch (error) {
      console.warn(`  library: ${manga.title} skipped: ${String((error as Error).message).slice(0, 80)}`);
    }
  }
  if (seeded.mangaIds.length < 3) throw new Error('fewer than 3 manga could be added to the library');
  return seeded;
}

/** Reading progress, history and sessions, written the way the reader writes them. */
async function readSome(seeded: Seeded): Promise<number | null> {
  let readable: number | null = null;
  for (const [position, mangaId] of seeded.mangaIds.slice(0, 5).entries()) {
    const chapters = seeded.chapters.get(mangaId) ?? [];
    const count = 1 + (position % 3);
    for (const [index, chapter] of chapters.slice(0, count).entries()) {
      const finished = index < count - 1 || position === 0;
      const total = 20;
      const page = finished ? total - 1 : 7;
      await invoke('progress.save', { chapterId: chapter.id, page, pageEnd: page, total, offset: null });
      for (let beat = 0; beat < 3; beat += 1) {
        await invoke('reading.heartbeat', { chapterId: chapter.id });
        await new Promise((resolveWait) => setTimeout(resolveWait, 1500));
      }
      await invoke('reading.end');
      readable ??= chapter.id;
    }
  }
  return readable;
}

// ------------------------------------------------------------------ the screens

const settingsSections = [
  'general',
  'library',
  'reader',
  'downloads',
  'browse',
  'tracking',
  'network',
  'data',
  'advanced',
  'about',
];

async function emptyScreens(): Promise<void> {
  await go('#/library');
  await settle();
  await shot('library-empty');
  await go('#/browse/extensions');
  await settle();
  await shot('extensions-empty');
}

async function onboardingScreens(): Promise<void> {
  const names = [
    'onboarding-appearance',
    'onboarding-languages',
    'onboarding-downloads',
    'onboarding-sources',
    'onboarding-reader',
  ];
  const wizard = page.getByTestId('onboarding');
  for (const [index, name] of names.entries()) {
    await page.waitForTimeout(600);
    await shot(name);
    const next = wizard.getByRole('button', { name: index === names.length - 1 ? 'Start reading' : 'Continue' });
    await next.click().catch(() => undefined);
  }
}

async function dataScreens(
  main: SourceInfo,
  seeded: Seeded,
  readable: number | null,
  popular: MangaItem[],
): Promise<void> {
  await go('#/library');
  await settle(1800);
  await shot('library');

  await go('#/browse/extensions');
  await settle();
  await shot('extensions');

  // The Popular list is not vetted; a search for a well-known title shows the same screen without surprises.
  await go(
    `#/browse/sources/${encodeURIComponent(main.extensionId)}/${encodeURIComponent(main.key)}?tab=search&q=${encodeURIComponent(BROWSE_QUERY)}`,
  );
  await settle(3000);
  await shot('browse');

  await go('#/browse/global-search');
  await page.waitForTimeout(600);
  const query = (popular[0]?.title ?? BROWSE_QUERY).split(/\s+/).slice(0, 2).join(' ');
  const box = page.getByPlaceholder('Search every source…');
  await box.fill(query).catch(() => undefined);
  await box.press('Enter').catch(() => undefined);
  await page.waitForTimeout(9000);
  await settle();
  await shot('global-search');

  await go(`#/manga/${seeded.mangaIds[0]!}`);
  await settle(1800);
  await shot('manga');

  await go('#/updates');
  await settle();
  await shot('updates');

  await go('#/history');
  await settle();
  await shot('history');
  await patchSettings(() => ({ incognito: true }));
  await page.waitForTimeout(500);
  await shot('history-incognito');
  await patchSettings(() => ({ incognito: false }));

  await go('#/statistics');
  await settle(1500);
  await shot('statistics');

  if (readable !== null) await readerScreens(readable);

  await downloadScreens(seeded);

  for (const section of settingsSections) {
    await go(`#/settings/${section}`);
    await settle(600);
    await shot(`settings-${section}`);
  }

  await go('#/library');
  await settle(800);
  await page.keyboard.press('Control+K');
  await page.waitForTimeout(700);
  await shot('command-palette');
  await page.keyboard.press('Escape');
}

async function readerScreens(chapterId: number): Promise<void> {
  await go(`#/reader/${chapterId}`);
  await page.waitForTimeout(9000);
  // Only the bars are the point; the pages are somebody's work, and a source may stamp its name on them.
  await page.addStyleTag({ content: 'img { visibility: hidden !important; }' });
  await page.mouse.move(WIDTH / 2, HEIGHT / 2);
  await page.keyboard.press('m').catch(() => undefined);
  await page.waitForTimeout(700);
  await shot('reader');
  await go('#/library');
}

async function downloadScreens(seeded: Seeded): Promise<void> {
  const ids = [...seeded.chapters.values()].flatMap((list) => list.slice(0, 2).map((c) => c.id)).slice(0, 4);
  await invoke('downloads.enqueue', { chapterIds: ids }).catch(() => undefined);
  await go('#/downloads');
  await page.waitForTimeout(4000);
  await shot('downloads');
  await invoke('downloads.pause').catch(() => undefined);
}

// ------------------------------------------------------------------ main

const SCENES = [
  'onboarding',
  'library-empty',
  'extensions-empty',
  'add-repository',
  'extensions-available',
  'extension-install',
  'repositories',
  'library',
  'extensions',
  'browse',
  'global-search',
  'manga',
  'updates',
  'history',
  'history-incognito',
  'statistics',
  'reader',
  'downloads',
  ...settingsSections.map((s) => `settings-${s}`),
  'command-palette',
];
console.log(`screens: ${SCENES.join(', ')}`);

await launch();
try {
  // 1. A fresh profile: the first-run setup, then the empty states and the repository steps.
  for (const flavor of THEMES) {
    theme = flavor;
    await patchSettings(() => ({ theme: flavor, onboarding: { done: false } }));
    await page.reload();
    await page.waitForSelector('[data-testid="onboarding"]');
    await onboardingScreens();
  }
  await patchSettings((s) => ({
    onboarding: { done: true },
    language: 'en',
    downloads: { ...(s['downloads'] as object), folder: downloads },
  }));
  await page.reload();
  await page.waitForSelector('aside', { timeout: 30_000 });
  for (const [index, flavor] of THEMES.entries()) {
    await setTheme(flavor);
    await emptyScreens();
    await repoFlow();
    if (index < THEMES.length - 1) await repoReset();
  }

  // 2. Real sources, a library and a reading history.
  const { main, popular } = await installedSources();
  console.log(`source: ${main.id}`);
  const seeded = await seedLibrary(popular);
  const readable = await readSome(seeded);
  await invoke('updates.check', { scope: { kind: 'all' } }).catch(() => undefined);
  // A photograph must not show "Checking 3/12" in the title bar: wait for the check to end.
  for (let waited = 0; waited < 120; waited += 1) {
    const status = await invoke<{ progress: { running: boolean } | null }>('updates.status');
    if (!status.progress?.running) break;
    await page.waitForTimeout(1000);
  }

  // 3. Every screen, once per flavor.
  for (const flavor of THEMES) {
    console.log(`\n== ${flavor}`);
    await setTheme(flavor);
    await dataScreens(main, seeded, readable, popular);
  }
} finally {
  await invoke('downloads.pause').catch(() => undefined);
  await app.close().catch(() => undefined);
  rmSync(home, { recursive: true, force: true });
  rmSync(scratch, { recursive: true, force: true });
}
console.log(`\n${taken} screenshots in ${OUT}`);

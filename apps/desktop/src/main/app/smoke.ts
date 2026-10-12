import { mkdir, rm, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import type { BrowserWindow } from 'electron';
import sharp from 'sharp';
import type { ExtensionService } from '../extensions/service';

// Packaged-app smoke test (apps/desktop/scripts/smoke-packaged.mjs). With MATANE_SMOKE=1 the app checks that the
// pieces that only break after packaging work (native SQLite, migrations from `drizzle/`, the extension host with
// its QuickJS WASM, sharp's native binary, the renderer bundle), prints one `MATANE_SMOKE {json}` line and quits.
// Nothing sets the variable for a normal user, and no other code path looks at it.

export const SMOKE_PREFIX = 'MATANE_SMOKE ';

export function isSmokeRun(env: Record<string, string | undefined> = process.env): boolean {
  return env['MATANE_SMOKE'] === '1';
}

export interface SmokeReport {
  ok: boolean;
  version: string;
  packaged: boolean;
  userData: string;
  sqliteVersion?: string;
  migrations?: number;
  tables?: number;
  host?: { baseUrl: string };
  image?: { type: string; bytes: number };
  renderer?: { rootChildren: number; title: string };
  errors: string[];
}

export interface SmokeDeps {
  app: { getVersion(): string; isPackaged: boolean; getPath(name: 'userData'): string };
  sqlite: { prepare(sql: string): { get(): unknown } };
  extensions: Pick<ExtensionService, 'addDevFolder' | 'removeDevFolder' | 'call'>;
  window: Pick<BrowserWindow, 'webContents'>;
  timeoutMs?: number;
}

const MANIFEST = {
  id: 'smoke',
  name: 'Smoke',
  version: '0.0.0',
  apiVersion: 1,
  nsfw: false,
  sources: [{ key: 'main', lang: 'en', name: 'Smoke' }],
};
// The smallest bundle the runtime accepts: it only has to prove that QuickJS starts and answers `__info`.
const CODE = "globalThis.__extension = { createSource() { return { baseUrl: 'https://smoke.invalid' }; } };";

function withTimeout<T>(promise: Promise<T>, ms: number, what: string): Promise<T> {
  let timer: NodeJS.Timeout | undefined;
  const timeout = new Promise<never>((_resolve, reject) => {
    timer = setTimeout(() => reject(new Error(`${what} did not finish within ${ms / 1000} s`)), ms);
  });
  return Promise.race([promise, timeout]).finally(() => clearTimeout(timer));
}

async function step(report: SmokeReport, name: string, run: () => Promise<void> | void): Promise<void> {
  try {
    await run();
  } catch (error) {
    report.errors.push(`${name}: ${error instanceof Error ? error.message : String(error)}`);
  }
}

export async function runSmoke(deps: SmokeDeps): Promise<SmokeReport> {
  const timeout = deps.timeoutMs ?? 30_000;
  const report: SmokeReport = {
    ok: false,
    version: deps.app.getVersion(),
    packaged: deps.app.isPackaged,
    userData: deps.app.getPath('userData'),
    errors: [],
  };

  await step(report, 'database', () => {
    const one = (sql: string): Record<string, unknown> => deps.sqlite.prepare(sql).get() as Record<string, unknown>;
    report.sqliteVersion = String(one('SELECT sqlite_version() AS v')['v']);
    report.migrations = Number(one('SELECT count(*) AS n FROM __drizzle_migrations')['n']);
    report.tables = Number(one("SELECT count(*) AS n FROM sqlite_master WHERE type = 'table'")['n']);
    if (!report.migrations) throw new Error('no migration was applied');
  });

  await step(report, 'extension host', async () => {
    const folder = join(report.userData, 'smoke-extension');
    await mkdir(folder, { recursive: true });
    await writeFile(join(folder, 'manifest.json'), JSON.stringify(MANIFEST));
    await writeFile(join(folder, 'index.js'), CODE);
    try {
      await withTimeout(deps.extensions.addDevFolder(folder), timeout, 'loading the sandbox');
      const info = (await withTimeout(
        deps.extensions.call('smoke', 'main', '__info'),
        timeout,
        'calling the sandbox',
      )) as { baseUrl?: unknown };
      if (info.baseUrl !== 'https://smoke.invalid') {
        throw new Error(`the sandbox answered ${JSON.stringify(info)}`);
      }
      report.host = { baseUrl: info.baseUrl };
    } finally {
      await deps.extensions.removeDevFolder(folder).catch(() => undefined);
      await rm(folder, { recursive: true, force: true });
    }
  });

  await step(report, 'image processing', async () => {
    const png = await sharp({ create: { width: 2, height: 2, channels: 3, background: '#ffffff' } })
      .png()
      .toBuffer();
    const isPng = png[0] === 0x89 && png.subarray(1, 4).toString('latin1') === 'PNG';
    if (!isPng) throw new Error('sharp did not produce a PNG');
    report.image = { type: 'image/png', bytes: png.byteLength };
  });

  await step(report, 'renderer', async () => {
    const contents = deps.window.webContents;
    if (contents.isLoading()) {
      await withTimeout(
        new Promise<void>((resolve, reject) => {
          contents.once('did-finish-load', () => resolve());
          contents.once('did-fail-load', (_event, code, description) => reject(new Error(`${description} (${code})`)));
        }),
        timeout,
        'loading the renderer',
      );
    }
    // React mounts after the module script ran; give it a moment instead of racing it.
    const deadline = Date.now() + timeout;
    let rootChildren = 0;
    while (Date.now() < deadline) {
      rootChildren = Number(
        await contents.executeJavaScript("document.getElementById('root')?.childElementCount ?? 0"),
      );
      if (rootChildren > 0) break;
      await new Promise((resolve) => setTimeout(resolve, 200));
    }
    report.renderer = { rootChildren, title: contents.getTitle() };
    if (rootChildren === 0) throw new Error('the renderer did not mount');
  });

  report.ok = report.errors.length === 0;
  return report;
}

/** Prints the report where `scripts/smoke-packaged.mjs` reads it. */
export function printSmokeReport(report: SmokeReport): void {
  process.stdout.write(`${SMOKE_PREFIX}${JSON.stringify(report)}\n`);
}

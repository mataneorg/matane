import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { type SmokeDeps, isSmokeRun, runSmoke } from './smoke';

let dir: string;
beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), 'matane-smoke-test-'));
});
afterEach(() => rmSync(dir, { recursive: true, force: true }));

function deps(overrides: Partial<SmokeDeps> = {}): SmokeDeps {
  return {
    app: { getVersion: () => '1.2.3', isPackaged: true, getPath: () => dir },
    sqlite: {
      prepare: (sql: string) => ({
        get: () =>
          sql.includes('sqlite_version') ? { v: '3.50.0' } : sql.includes('__drizzle') ? { n: 7 } : { n: 22 },
      }),
    },
    extensions: {
      addDevFolder: vi.fn(async () => ({}) as never),
      removeDevFolder: vi.fn(async () => undefined),
      call: vi.fn(async () => ({ baseUrl: 'https://smoke.invalid', capabilities: [] })) as never,
    },
    window: {
      webContents: {
        isLoading: () => false,
        executeJavaScript: async () => 3,
        getTitle: () => 'Matane',
      },
    } as never,
    timeoutMs: 2000,
    ...overrides,
  };
}

describe('isSmokeRun', () => {
  it('is on only for MATANE_SMOKE=1', () => {
    expect(isSmokeRun({ MATANE_SMOKE: '1' })).toBe(true);
    expect(isSmokeRun({ MATANE_SMOKE: '0' })).toBe(false);
    expect(isSmokeRun({})).toBe(false);
  });
});

describe('runSmoke', () => {
  it('passes when the database, the sandbox, sharp and the renderer all work', async () => {
    const report = await runSmoke(deps());
    expect(report).toMatchObject({
      ok: true,
      version: '1.2.3',
      packaged: true,
      migrations: 7,
      host: { baseUrl: 'https://smoke.invalid' },
      image: { type: 'image/png' },
      renderer: { rootChildren: 3, title: 'Matane' },
      errors: [],
    });
  });

  it('removes the extension it loaded, also when the sandbox fails', async () => {
    const d = deps({
      extensions: {
        addDevFolder: vi.fn(async () => ({}) as never),
        removeDevFolder: vi.fn(async () => undefined),
        call: vi.fn(async () => {
          throw new Error('sandbox down');
        }) as never,
      },
    });
    const report = await runSmoke(d);
    expect(report.ok).toBe(false);
    expect(report.errors).toEqual([expect.stringContaining('extension host: sandbox down')]);
    expect(d.extensions.removeDevFolder).toHaveBeenCalledTimes(1);
  });

  it('fails when no migration ran, and keeps going to report every problem', async () => {
    const report = await runSmoke(deps({ sqlite: { prepare: () => ({ get: () => ({ v: '3', n: 0 }) }) } as never }));
    expect(report.ok).toBe(false);
    expect(report.errors).toEqual([expect.stringContaining('database: no migration was applied')]);
    expect(report.host?.baseUrl).toBe('https://smoke.invalid');
  });

  it('fails when the renderer never mounts', async () => {
    const report = await runSmoke(
      deps({
        timeoutMs: 300,
        window: {
          webContents: { isLoading: () => false, executeJavaScript: async () => 0, getTitle: () => '' },
        } as never,
      }),
    );
    expect(report.errors).toEqual([expect.stringContaining('renderer: the renderer did not mount')]);
  });
});

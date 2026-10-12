import { createHash } from 'node:crypto';
import type { RepoEntry, RepoIndex } from '@matane/extension-sdk/repo';
import { describe, expect, it, vi } from 'vitest';
import { ExtensionIcons } from './icons';

const PNG = Buffer.from([0x89, 0x50, 0x4e, 0x47, 1, 2, 3]);
const sha = (bytes: Buffer) => createHash('sha256').update(bytes).digest('hex');

function icons(entry: Partial<RepoEntry>, served: Buffer | null) {
  const index = {
    formatVersion: 1,
    name: 'Test',
    extensions: [
      {
        id: 'demo',
        name: 'Demo',
        version: '1.0.0',
        apiVersion: 1,
        nsfw: false,
        langs: ['en'],
        file: 'extensions/demo-1.0.0.zip',
        size: 10,
        sha256: 'a'.repeat(64),
        icon: 'extensions/icons/demo.png',
        ...entry,
      },
    ],
  } satisfies RepoIndex;
  const fetchBytes = vi.fn(async () => served);
  return {
    fetchBytes,
    service: new ExtensionIcons({
      installedIcon: () => null,
      repos: { index: () => index, fileUrl: (_id, file) => `https://repo.example/${file}` },
      fetchBytes,
    }),
  };
}

describe('icons offered by a repository', () => {
  it('serves an icon that matches the hash in the index', async () => {
    const { service } = icons({ iconSize: PNG.byteLength, iconSha256: sha(PNG) }, PNG);
    await expect(service.repo(1, 'demo')).resolves.toMatchObject({ contentType: 'image/png' });
  });

  it('refuses an icon that differs from the one the index lists, and does not keep it', async () => {
    const other = Buffer.from([0x89, 0x50, 0x4e, 0x47, 9, 9, 9]);
    const { service, fetchBytes } = icons({ iconSize: PNG.byteLength, iconSha256: sha(PNG) }, other);
    await expect(service.repo(1, 'demo')).rejects.toMatchObject({ code: 'not_found' });
    await expect(service.repo(1, 'demo')).rejects.toMatchObject({ code: 'not_found' });
    expect(fetchBytes).toHaveBeenCalledTimes(2);
  });

  it('serves an icon of a repository whose index lists no hash', async () => {
    const { service } = icons({}, PNG);
    await expect(service.repo(1, 'demo')).resolves.toMatchObject({ contentType: 'image/png' });
  });

  it('still refuses what is not a PNG', async () => {
    const { service } = icons({}, Buffer.from('not a png'));
    await expect(service.repo(1, 'demo')).rejects.toMatchObject({ code: 'not_found' });
  });
});

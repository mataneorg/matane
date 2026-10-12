import { describe, expect, it, vi } from 'vitest';
import { freeBytesOf } from './disk-space';

const stats = (bavail: number, bsize: number) => ({ bavail, bsize }) as never;

describe('freeBytesOf', () => {
  it('multiplies the free blocks by the block size', async () => {
    const read = vi.fn(async () => stats(1000, 4096));
    await expect(freeBytesOf('/data/Matane', read as never)).resolves.toBe(4_096_000);
    expect(read).toHaveBeenCalledWith('/data/Matane');
  });

  it('asks the nearest existing folder when the download folder is not made yet', async () => {
    const read = vi.fn(async (path: unknown) => {
      if (path === '/data') return stats(10, 512);
      throw new Error('ENOENT');
    });
    await expect(freeBytesOf('/data/Matane/Sub', read as never)).resolves.toBe(5120);
    expect(read.mock.calls.map(([path]) => path)).toEqual(['/data/Matane/Sub', '/data/Matane', '/data']);
  });

  it('is null when no folder above can be read', async () => {
    const read = vi.fn(async () => {
      throw new Error('EACCES');
    });
    await expect(freeBytesOf('/data/Matane', read as never)).resolves.toBeNull();
  });
});

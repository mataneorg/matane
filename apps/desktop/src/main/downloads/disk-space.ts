import { statfs } from 'node:fs/promises';
import { dirname } from 'node:path';

/**
 * Free space on the drive that holds `path`, for the Downloads page. The folder may not exist yet (it is made on the
 * first download), so the nearest folder above it that does is asked. Null when nothing can be read.
 */
export async function freeBytesOf(path: string, read: typeof statfs = statfs): Promise<number | null> {
  let current = path;
  for (;;) {
    try {
      const stats = await read(current);
      return Number(stats.bavail) * Number(stats.bsize);
    } catch {
      const parent = dirname(current);
      if (parent === current) return null;
      current = parent;
    }
  }
}

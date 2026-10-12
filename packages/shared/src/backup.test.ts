import { describe, expect, it } from 'vitest';
import { isAbsolutePath } from './backup';

describe('isAbsolutePath', () => {
  it.each(['/home/me/backups', 'C:\\Users\\me\\backups', 'D:/backups', '\\\\server\\share\\backups'])(
    'accepts %s',
    (path) => expect(isAbsolutePath(path)).toBe(true),
  );
  it.each(['', 'backups', './backups', '../backups', 'C:backups', '~/backups'])('rejects %j', (path) =>
    expect(isAbsolutePath(path)).toBe(false),
  );
});

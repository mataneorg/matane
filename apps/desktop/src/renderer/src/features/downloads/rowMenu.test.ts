import { describe, expect, it } from 'vitest';
import { queueMenuRows } from './rowMenu';

describe('queueMenuRows', () => {
  it('offers Pause to a running or waiting download and Resume to a paused one', () => {
    expect(queueMenuRows('downloading')).toMatchObject({ pause: true, resume: false, reorder: true });
    expect(queueMenuRows('queued')).toMatchObject({ pause: true, resume: false });
    expect(queueMenuRows('paused')).toMatchObject({ pause: false, resume: true });
  });

  it('offers Retry and Details to a failed download, which cannot be moved', () => {
    expect(queueMenuRows('error')).toEqual({ pause: false, resume: false, retry: true, details: true, reorder: false });
  });
});

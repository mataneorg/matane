import type { DownloadItem } from '@manga-reader/shared';

/** Which rows the right-click menu of a download in the queue shows. Cancelling is always there. */
export function queueMenuRows(status: DownloadItem['status']) {
  const failed = status === 'error';
  return {
    pause: status === 'downloading' || status === 'queued',
    resume: status === 'paused',
    retry: failed,
    details: failed,
    // A failed download has no place in the queue to move.
    reorder: !failed,
  };
}

import { useQuery } from '@tanstack/react-query';
import { Link } from '@tanstack/react-router';
import { useTranslation } from 'react-i18next';
import { limitBytesOf } from '../../lib/downloads';
import { formatBytes } from '../../lib/format';
import { ipc, settingsQuery } from '../../lib/ipc';
import { cn } from '../../lib/utils';
import { usageShare } from './usage';

/** What downloads use against their limit, the free space on the drive, and where chapters go. */
export function StorageCard() {
  const { t, i18n } = useTranslation();
  const { data: settings } = useQuery(settingsQuery);
  // Changes whenever a download finishes or is deleted (the `downloads` tag), so it follows the queue.
  const { data: info } = useQuery({
    queryKey: ['downloads', 'storage'] as const,
    queryFn: () => ipc.invoke('storage.info'),
  });
  if (!info || !settings) return <div className="h-[92px] animate-pulse rounded-xl bg-muted" aria-hidden />;
  const limit = limitBytesOf(settings.downloads.limitGb);
  const { percent, over } = usageShare(info.downloadBytes, limit);
  const size = (bytes: number) => formatBytes(bytes, i18n.language);

  return (
    <section
      aria-label={t('downloads.storage.title')}
      className="flex flex-wrap items-stretch gap-x-6 gap-y-3 rounded-xl border bg-card/40 px-4 py-3.5"
      data-testid="storage-card"
    >
      <div className="flex min-w-56 flex-1 flex-col gap-2">
        <div className="flex items-baseline justify-between gap-4">
          <h2 className="font-semibold">{t('downloads.storage.title')}</h2>
          <span className="text-xs tabular-nums">
            {limit === null
              ? t('downloads.page.used', { used: size(info.downloadBytes) })
              : t('downloads.page.usedOfLimit', { used: size(info.downloadBytes), limit: size(limit) })}
          </span>
        </div>
        {limit !== null && (
          <div
            role="progressbar"
            aria-label={t('downloads.storage.title')}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={Math.round(percent)}
            className="h-1.5 overflow-hidden rounded-full bg-muted"
          >
            <div className={cn('h-full', over ? 'bg-destructive' : 'bg-primary')} style={{ width: `${percent}%` }} />
          </div>
        )}
        {over && <p className="text-xs text-danger-text">{t('downloads.storage.overLimit')}</p>}
      </div>
      <div className="flex shrink-0 flex-col items-end gap-0.5 text-xs text-muted-foreground">
        {info.freeBytes !== null && (
          <span>
            <span className="font-medium text-foreground tabular-nums">{size(info.freeBytes)}</span>{' '}
            {t('downloads.storage.free')}
          </span>
        )}
        <span className="max-w-72 truncate font-medium text-foreground" title={info.downloadFolder}>
          {info.downloadFolder}
        </span>
        <Link to="/settings/$section" params={{ section: 'downloads' }} className="text-primary-text hover:underline">
          {t('downloads.page.settings')}
        </Link>
      </div>
    </section>
  );
}

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Trash2 } from 'lucide-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ConfirmDialog } from '../../components/ConfirmDialog';
import { Button } from '../../components/ui/button';
import { ipc } from '../../lib/ipc';

type Target = 'history' | 'stats';

/** Settings → Data & storage → Clear data: reading history and reading statistics, each on its own. */
export function ClearDataSection() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [confirm, setConfirm] = useState<Target | null>(null);
  const clear = useMutation({
    mutationFn: (target: Target) => ipc.invoke(target === 'history' ? 'history.clear' : 'stats.clear'),
    onSuccess: (_, target) =>
      queryClient.invalidateQueries({ queryKey: target === 'history' ? ['history'] : ['stats'] }),
  });

  return (
    <section className="rounded-xl border bg-card/40 p-5">
      <h2 className="mb-4 text-sm font-semibold">{t('settings.data.clearData')}</h2>
      <div className="divide-y">
        <div className="flex items-center justify-between gap-4 pb-4">
          <div>
            <p className="font-medium">{t('history.clearAll')}</p>
            <p className="text-xs text-muted-foreground">{t('settings.data.clearHistoryHint')}</p>
          </div>
          <Button variant="destructive" size="sm" onClick={() => setConfirm('history')} data-testid="clear-history">
            <Trash2 />
            {t('history.clearConfirm')}
          </Button>
        </div>
        <div className="flex items-center justify-between gap-4 pt-4">
          <div>
            <p className="font-medium">{t('settings.data.clearStats')}</p>
            <p className="text-xs text-muted-foreground">{t('settings.data.clearStatsHint')}</p>
          </div>
          <Button variant="destructive" size="sm" onClick={() => setConfirm('stats')}>
            <Trash2 />
            {t('settings.data.clearStats')}
          </Button>
        </div>
      </div>

      <ConfirmDialog
        open={confirm !== null}
        onOpenChange={(open) => !open && setConfirm(null)}
        title={confirm === 'history' ? t('history.clearTitle') : t('settings.data.clearStatsTitle')}
        description={confirm === 'history' ? t('history.clearDescription') : t('settings.data.clearStatsDescription')}
        confirmLabel={confirm === 'history' ? t('history.clearConfirm') : t('settings.data.clearStats')}
        onConfirm={() => confirm && clear.mutate(confirm)}
      />
    </section>
  );
}

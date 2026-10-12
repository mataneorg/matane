import type { Category } from '@manga-reader/shared';
import { useMutation } from '@tanstack/react-query';
import { type FormEvent, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '../../components/ui/button';
import { Dialog } from '../../components/ui/dialog';
import { Input } from '../../components/ui/input';
import { ipc } from '../../lib/ipc';
import { notifyError } from '../../lib/toast';

/** Renames the category of a library tab; no category means the dialog is closed. */
export function RenameCategoryDialog({ category, onClose }: { category: Category | null; onClose: () => void }) {
  const { t } = useTranslation();
  return (
    <Dialog.Root open={category !== null} onOpenChange={(open) => !open && onClose()}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-40 bg-ctp-crust/70 backdrop-blur-sm" />
        <Dialog.Content
          aria-describedby={undefined}
          className="fixed top-1/2 left-1/2 z-50 flex w-[min(26rem,90vw)] -translate-x-1/2 -translate-y-1/2 flex-col gap-3 rounded-xl border bg-popover p-5 shadow-2xl"
        >
          <Dialog.Title className="text-base font-semibold">{t('contextMenu.library.renameTitle')}</Dialog.Title>
          {category ? <Form category={category} close={onClose} /> : null}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

function Form({ category, close }: { category: Category; close: () => void }) {
  const { t } = useTranslation();
  const [name, setName] = useState(category.name);
  const rename = useMutation({
    mutationFn: (value: string) => ipc.invoke('categories.rename', { id: category.id, name: value }),
    onSuccess: close,
    onError: (error) => notifyError(error, t),
  });
  const submit = (event: FormEvent): void => {
    event.preventDefault();
    if (name.trim()) rename.mutate(name.trim());
  };
  return (
    <form onSubmit={submit} className="flex gap-2">
      <Input
        autoFocus
        value={name}
        onChange={(event) => setName(event.target.value)}
        aria-label={t('settings.library.rename')}
        maxLength={60}
      />
      <Button type="submit" disabled={!name.trim() || rename.isPending}>
        {t('common.save')}
      </Button>
    </form>
  );
}

import type { BrowseItem } from '@manga-reader/shared';
import { useMutation, useQuery } from '@tanstack/react-query';
import { useNavigate } from '@tanstack/react-router';
import { BookmarkPlus, ExternalLink, FolderInput, Trash2 } from 'lucide-react';
import { type ReactNode, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ConfirmDialog } from '../../components/ConfirmDialog';
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuTrigger,
} from '../../components/ui/context-menu';
import { ipc } from '../../lib/ipc';
import { mangaQuery } from '../../lib/sources';
import { notifyError } from '../../lib/toast';
import { CategoryDialog } from '../library/CategoryDialog';

/**
 * The right-click menu of a card in a listing: open, add to or remove from the library, pick categories.
 * `children` is the card itself (a link), which stays the trigger. Both dialogs are controlled here, outside the
 * menu: one opened from a menu item would leave `pointer-events: none` on the page.
 */
export function MangaCardMenu({
  item,
  inLibrary,
  children,
}: {
  item: BrowseItem;
  inLibrary: boolean;
  children: ReactNode;
}) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [choosing, setChoosing] = useState(false);
  const [removing, setRemoving] = useState(false);
  const { mangaId } = item;

  // The categories of a manga already in the library, for the dialog (a listing item does not carry them).
  const { data: detail } = useQuery({ ...mangaQuery(mangaId), enabled: choosing && inLibrary });

  const fail = (error: unknown): void => notifyError(error, t);
  const add = useMutation({
    mutationFn: (categoryIds: number[]) => ipc.invoke('library.add', { mangaId, categoryIds }),
    onError: fail,
  });
  const setCategories = useMutation({
    mutationFn: (categoryIds: number[]) => ipc.invoke('library.setCategories', { mangaIds: [mangaId], categoryIds }),
    onError: fail,
  });
  const remove = useMutation({
    mutationFn: () => ipc.invoke('library.remove', { mangaIds: [mangaId] }),
    onError: fail,
  });

  return (
    <>
      <ContextMenu>
        <ContextMenuTrigger asChild>{children}</ContextMenuTrigger>
        <ContextMenuContent>
          <ContextMenuItem
            onSelect={() => void navigate({ to: '/manga/$mangaId', params: { mangaId: String(mangaId) } })}
          >
            <ExternalLink aria-hidden />
            {t('contextMenu.browse.open')}
          </ContextMenuItem>
          {inLibrary ? null : (
            <ContextMenuItem onSelect={() => add.mutate([])}>
              <BookmarkPlus aria-hidden />
              {t('library.add')}
            </ContextMenuItem>
          )}
          <ContextMenuItem onSelect={() => setChoosing(true)}>
            <FolderInput aria-hidden />
            {inLibrary ? t('library.editCategories') : t('contextMenu.browse.addToCategory')}
          </ContextMenuItem>
          {inLibrary ? (
            <>
              <ContextMenuSeparator />
              <ContextMenuItem destructive onSelect={() => setRemoving(true)}>
                <Trash2 aria-hidden />
                {t('library.removeOne')}
              </ContextMenuItem>
            </>
          ) : null}
        </ContextMenuContent>
      </ContextMenu>
      <CategoryDialog
        // The form reads `initial` once, so it opens when the current categories have arrived.
        open={choosing && (!inLibrary || detail !== undefined)}
        onOpenChange={setChoosing}
        title={inLibrary ? t('library.editCategories') : t('library.addTo')}
        confirmLabel={inLibrary ? t('common.save') : t('library.add')}
        initial={inLibrary ? (detail?.categoryIds ?? []) : []}
        onConfirm={(categoryIds) => (inLibrary ? setCategories.mutate(categoryIds) : add.mutate(categoryIds))}
      />
      <ConfirmDialog
        open={removing}
        onOpenChange={setRemoving}
        title={t('library.remove.title', { count: 1 })}
        description={t('library.remove.description')}
        confirmLabel={t('library.remove.confirm')}
        onConfirm={() => remove.mutate()}
      />
    </>
  );
}

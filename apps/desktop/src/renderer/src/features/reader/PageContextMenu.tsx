import { useMutation } from '@tanstack/react-query';
import { Copy, Download, ImageUp } from 'lucide-react';
import { type ReactNode, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuTrigger,
} from '../../components/ui/context-menu';
import { ipc } from '../../lib/ipc';
import { useReaderNotice } from './notice';

interface PageRef {
  chapterId: number;
  index: number;
}

/** The page image under the pointer (`data-page="<chapterId>:<index>"` on PageImage). */
function pageAt(target: EventTarget | null): PageRef | undefined {
  const element = target instanceof Element ? target.closest<HTMLElement>('[data-page]') : null;
  const [chapterId, index] = (element?.dataset['page'] ?? '').split(':').map(Number);
  return chapterId !== undefined && index !== undefined && chapterId > 0 && index >= 0
    ? { chapterId, index }
    : undefined;
}

/** Right-click a page → save it, copy it, or make it the cover (docs/BRAINSTORM.md §6.1). Elsewhere no menu opens. */
export function PageContextMenu({ mangaId, children }: { mangaId: number; children: ReactNode }) {
  const { t } = useTranslation();
  const notify = useReaderNotice((state) => state.show);
  const [page, setPage] = useState<PageRef>();
  const setCover = useMutation({
    mutationFn: (ref: PageRef) => ipc.invoke('manga.setCustomCover', { mangaId, from: { kind: 'page', ...ref } }),
    onSuccess: () => notify(t('reader.coverSet')),
    onError: () => notify(t('reader.coverFailed')),
  });
  const savePage = useMutation({
    mutationFn: (ref: PageRef) => ipc.invoke('reader.savePage', ref),
    onSuccess: (path) => path && notify(t('reader.pageSaved')),
    onError: () => notify(t('reader.pageSaveFailed')),
  });
  const copyPage = useMutation({
    mutationFn: (ref: PageRef) => ipc.invoke('reader.copyPage', ref),
    onSuccess: () => notify(t('reader.pageCopied')),
    onError: () => notify(t('reader.pageCopyFailed')),
  });

  return (
    <ContextMenu>
      <ContextMenuTrigger
        asChild
        onContextMenu={(event) => {
          const ref = pageAt(event.target);
          // Radix skips opening when the event is already handled.
          if (!ref) event.preventDefault();
          setPage(ref);
        }}
      >
        <div className="h-full">{children}</div>
      </ContextMenuTrigger>
      <ContextMenuContent>
        <ContextMenuItem onSelect={() => page && savePage.mutate(page)}>
          <Download aria-hidden />
          {t('reader.savePage')}
        </ContextMenuItem>
        <ContextMenuItem onSelect={() => page && copyPage.mutate(page)}>
          <Copy aria-hidden />
          {t('reader.copyPage')}
        </ContextMenuItem>
        <ContextMenuSeparator />
        <ContextMenuItem onSelect={() => page && setCover.mutate(page)}>
          <ImageUp aria-hidden />
          {t('reader.setAsCover', { page: (page?.index ?? 0) + 1 })}
        </ContextMenuItem>
      </ContextMenuContent>
    </ContextMenu>
  );
}

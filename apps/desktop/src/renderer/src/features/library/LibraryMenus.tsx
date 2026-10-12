import type { Category, LibraryItem } from '@manga-reader/shared';
import { useNavigate } from '@tanstack/react-router';
import {
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  ArrowRightLeft,
  Check,
  CheckSquare,
  ExternalLink,
  EyeOff,
  FolderInput,
  Pencil,
  Trash2,
} from 'lucide-react';
import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import {
  ContextMenu,
  ContextMenuCheckboxItem,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuTrigger,
} from '../../components/ui/context-menu';
import { type CardMenuAction, type TabMenuAction, cardMenuRows } from './menu';

/**
 * The right-click menu of a library card or row. It acts on the whole selection when the card is part of it
 * (`targetCount` says how many manga that is); `onAction` is run by the page (see `menuTargetIds`).
 */
export function LibraryItemMenu({
  item,
  selected,
  targetCount,
  onAction,
  children,
}: {
  item: LibraryItem;
  selected: boolean;
  targetCount: number;
  onAction: (action: CardMenuAction) => void;
  children: ReactNode;
}) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const rows = cardMenuRows({ selected, targetCount });
  return (
    <ContextMenu>
      <ContextMenuTrigger asChild>{children}</ContextMenuTrigger>
      <ContextMenuContent>
        {rows.open ? (
          <>
            <ContextMenuItem
              onSelect={() => void navigate({ to: '/manga/$mangaId', params: { mangaId: String(item.mangaId) } })}
            >
              <ExternalLink aria-hidden />
              {t('library.selection.open')}
            </ContextMenuItem>
            <ContextMenuSeparator />
          </>
        ) : null}
        <ContextMenuItem onSelect={() => onAction('markRead')}>
          <Check aria-hidden />
          {t('library.selection.markRead')}
        </ContextMenuItem>
        <ContextMenuItem onSelect={() => onAction('markUnread')}>
          <EyeOff aria-hidden />
          {t('library.selection.markUnread')}
        </ContextMenuItem>
        <ContextMenuItem onSelect={() => onAction('categories')}>
          <FolderInput aria-hidden />
          {t('library.selection.categories')}
        </ContextMenuItem>
        {rows.migrate ? (
          <ContextMenuItem onSelect={() => onAction('migrate')}>
            <ArrowRightLeft aria-hidden />
            {t('library.selection.migrate')}
          </ContextMenuItem>
        ) : null}
        {rows.select ? (
          <ContextMenuItem onSelect={() => onAction('select')}>
            <CheckSquare aria-hidden />
            {t('library.selection.select')}
          </ContextMenuItem>
        ) : null}
        <ContextMenuSeparator />
        <ContextMenuItem destructive onSelect={() => onAction('remove')}>
          <Trash2 aria-hidden />
          {t('library.removeOne')}
        </ContextMenuItem>
      </ContextMenuContent>
    </ContextMenu>
  );
}

/** The right-click menu of a category tab: rename, move it along, switch auto-download, delete. */
export function CategoryTabMenu({
  category,
  first,
  last,
  onAction,
  children,
}: {
  category: Category;
  first: boolean;
  last: boolean;
  onAction: (action: TabMenuAction) => void;
  children: ReactNode;
}) {
  const { t } = useTranslation();
  return (
    <ContextMenu>
      <ContextMenuTrigger asChild>{children}</ContextMenuTrigger>
      <ContextMenuContent>
        <ContextMenuItem onSelect={() => onAction('rename')}>
          <Pencil aria-hidden />
          {t('contextMenu.library.rename')}
        </ContextMenuItem>
        <ContextMenuCheckboxItem
          checked={category.autoDownload === 'include'}
          onCheckedChange={() => onAction('autoDownload')}
        >
          <ArrowDown aria-hidden className="size-4" />
          {t('contextMenu.library.autoDownload')}
        </ContextMenuCheckboxItem>
        <ContextMenuSeparator />
        <ContextMenuItem disabled={first} onSelect={() => onAction('moveLeft')}>
          <ArrowLeft aria-hidden />
          {t('contextMenu.library.moveLeft')}
        </ContextMenuItem>
        <ContextMenuItem disabled={last} onSelect={() => onAction('moveRight')}>
          <ArrowRight aria-hidden />
          {t('contextMenu.library.moveRight')}
        </ContextMenuItem>
        <ContextMenuSeparator />
        <ContextMenuItem destructive onSelect={() => onAction('delete')}>
          <Trash2 aria-hidden />
          {t('contextMenu.library.deleteCategory')}
        </ContextMenuItem>
      </ContextMenuContent>
    </ContextMenu>
  );
}

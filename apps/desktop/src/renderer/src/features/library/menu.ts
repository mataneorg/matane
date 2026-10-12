import type { Category } from '@manga-reader/shared';

type AutoDownloadMode = NonNullable<Category['autoDownload']>;

/** What a right-click on a library card can ask the page to do. Opening navigates on its own. */
export type CardMenuAction = 'markRead' | 'markUnread' | 'categories' | 'migrate' | 'select' | 'remove';

/** What a right-click on a category tab can ask the page to do. */
export type TabMenuAction = 'rename' | 'autoDownload' | 'moveLeft' | 'moveRight' | 'delete';

/**
 * The manga a card menu acts on: the whole selection when the card is part of it, otherwise only that card (the
 * selection is left alone, and select mode is not entered).
 */
export function menuTargetIds(selection: ReadonlySet<number>, mangaId: number): number[] {
  return selection.has(mangaId) ? [...selection] : [mangaId];
}

/** Which rows a card menu shows. Opening and migrating are about one manga, so they leave with a bulk. */
export function cardMenuRows(card: { selected: boolean; targetCount: number }) {
  const single = card.targetCount === 1;
  return { open: single, migrate: single, select: !card.selected };
}

/** The category ids with `id` moved one place left (-1) or right (1); unchanged when it is already at that end. */
export function movedCategoryIds(order: readonly number[], id: number, delta: -1 | 1): number[] {
  const from = order.indexOf(id);
  const to = from + delta;
  const ids = [...order];
  if (from < 0 || to < 0 || to >= ids.length) return ids;
  [ids[from], ids[to]] = [ids[to] as number, ids[from] as number];
  return ids;
}

/** The menu's checkbox switches the mark between included and none; an excluded category becomes included. */
export function toggledAutoDownload(mode: AutoDownloadMode | null): AutoDownloadMode | null {
  return mode === 'include' ? null : 'include';
}

/** The categories every one of `items` is in, to pre-check in the category dialog. */
export function sharedCategoryIds(items: readonly { categoryIds: readonly number[] }[]): number[] {
  return items.reduce<number[]>(
    (common, item, index) =>
      index === 0 ? [...item.categoryIds] : common.filter((id) => item.categoryIds.includes(id)),
    [],
  );
}

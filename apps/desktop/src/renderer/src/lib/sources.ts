import type { DbChangeTag, FilterState, InvokeInput, InvokeOutput, MangaInfo } from '@manga-reader/shared';
import {
  type QueryClient,
  infiniteQueryOptions,
  queryOptions,
  useMutation,
  useQueryClient,
} from '@tanstack/react-query';
import { ipc } from './ipc';
import { createPrefetcher } from './prefetch';
import { localQueryDefaults } from './query';

// Queries for extensions, sources, manga and chapters (ADR 0010):
// - main-owned rows use `localQueryDefaults` and are refreshed by `db.changed` tags;
// - calls that reach an extension keep the remote defaults (retry, no focus refetch).

type CancellableChannel = 'sources.browse' | 'manga.refresh' | 'chapter.pages' | 'migration.findCandidates';

/**
 * Invokes a slow source call that TanStack Query may abort (unmount, new filters, …). The abort is
 * forwarded to main as `requests.cancel` so it stops waiting on the extension.
 */
export function invokeCancellable<C extends CancellableChannel>(
  channel: C,
  input: Omit<InvokeInput<C>, 'requestId'>,
  signal?: AbortSignal,
): Promise<InvokeOutput<C>> {
  const requestId = crypto.randomUUID();
  const onAbort = () => void ipc.invoke('requests.cancel', { requestId }).catch(() => undefined);
  signal?.addEventListener('abort', onAbort, { once: true });
  const call = ipc.invoke as (channel: C, input: InvokeInput<C>) => Promise<InvokeOutput<C>>;
  return call(channel, { ...input, requestId } as InvokeInput<C>).finally(() =>
    signal?.removeEventListener('abort', onAbort),
  );
}

export type BrowseKind = InvokeInput<'sources.browse'>['kind'];

export const queryKeys = {
  extensions: ['extensions'] as const,
  sources: ['sources', 'list'] as const,
  sourceInfo: (sourceId: string) => ['sourceInfo', sourceId] as const,
  sourceFilters: (sourceId: string) => ['sourceFilters', sourceId] as const,
  preferences: (extensionId: string) => ['preferences', extensionId] as const,
  browse: (sourceId: string, kind: BrowseKind, query: string, filters: FilterState) =>
    ['browse', sourceId, kind, query, filters] as const,
  manga: (mangaId: number) => ['manga', mangaId] as const,
  chapters: (mangaId: number) => ['chapters', mangaId] as const,
  chapter: (chapterId: number) => ['chapter', chapterId] as const,
  pages: (chapterId: number) => ['pages', chapterId] as const,
  continue: (mangaId: number) => ['continue', mangaId] as const,
  history: (query: string) => ['history', query] as const,
};

export const extensionsQuery = queryOptions({
  queryKey: queryKeys.extensions,
  queryFn: () => ipc.invoke('extensions.list'),
  ...localQueryDefaults,
});

export const sourcesQuery = queryOptions({
  queryKey: queryKeys.sources,
  queryFn: () => ipc.invoke('sources.list'),
  ...localQueryDefaults,
});

/** Capabilities barely change; an extension reload invalidates them. */
export const sourceInfoQuery = (sourceId: string) =>
  queryOptions({
    queryKey: queryKeys.sourceInfo(sourceId),
    queryFn: () => ipc.invoke('sources.info', { sourceId }),
    staleTime: Infinity,
  });

export const sourceFiltersQuery = (sourceId: string) =>
  queryOptions({
    queryKey: queryKeys.sourceFilters(sourceId),
    queryFn: () => ipc.invoke('sources.filters', { sourceId }),
    staleTime: 60 * 60_000,
  });

export const preferencesQuery = (extensionId: string) =>
  queryOptions({
    queryKey: queryKeys.preferences(extensionId),
    queryFn: () => ipc.invoke('extensions.preferences', { extensionId }),
    ...localQueryDefaults,
  });

/** The first page of Popular or Latest as it was last seen: shown while the real request runs (ADR 0040). */
export const browseCachedQuery = (sourceId: string, kind: BrowseKind) =>
  queryOptions({
    queryKey: ['browse-cached', sourceId, kind] as const,
    queryFn: () => ipc.invoke('sources.browseCached', { sourceId, kind, page: 1 }),
    staleTime: Infinity,
    retry: false,
  });

export const browseQuery = (sourceId: string, kind: BrowseKind, query: string, filters: FilterState) =>
  infiniteQueryOptions({
    queryKey: queryKeys.browse(sourceId, kind, query, filters),
    queryFn: ({ pageParam, signal }) =>
      invokeCancellable(
        'sources.browse',
        { sourceId, kind, page: pageParam, ...(kind === 'search' && { query, filters }) },
        signal,
      ),
    initialPageParam: 1,
    getNextPageParam: (last, pages) => (last.hasNextPage ? pages.length + 1 : undefined),
    // Browsing back and forth should not re-hit the source every time.
    staleTime: 5 * 60_000,
  });

export const mangaQuery = (mangaId: number) =>
  queryOptions({
    queryKey: queryKeys.manga(mangaId),
    queryFn: () => ipc.invoke('manga.get', { mangaId }),
    ...localQueryDefaults,
  });

export const chaptersQuery = (mangaId: number) =>
  queryOptions({
    queryKey: queryKeys.chapters(mangaId),
    queryFn: () => ipc.invoke('chapters.list', { mangaId }),
    ...localQueryDefaults,
  });

export const chapterQuery = (chapterId: number) =>
  queryOptions({
    queryKey: queryKeys.chapter(chapterId),
    queryFn: () => ipc.invoke('chapter.get', { chapterId }),
    ...localQueryDefaults,
  });

/** Which chapter "Continue reading" opens (main applies docs/BRAINSTORM.md §6.3). */
export const continueQuery = (mangaId: number) =>
  queryOptions({
    queryKey: queryKeys.continue(mangaId),
    queryFn: () => ipc.invoke('manga.continue', { mangaId }),
    ...localQueryDefaults,
  });

/** Page list of a chapter; main caches it (~1 h) and falls back to a stale copy offline. */
export const pagesQuery = (chapterId: number) =>
  queryOptions({
    queryKey: queryKeys.pages(chapterId),
    queryFn: ({ signal }) => invokeCancellable('chapter.pages', { chapterId }, signal),
    staleTime: 30 * 60_000,
  });

type RefreshResult = InvokeOutput<'manga.refresh'>;
const refreshing = new Map<number, Promise<RefreshResult>>();

/**
 * Fetches details + chapters from the source; `db.changed` then refreshes the local queries. A second call for the
 * same manga while one runs joins it, so a click on a card that is being fetched ahead (`prefetchManga`) waits for
 * that one request instead of sending another.
 */
export function refreshManga(queryClient: QueryClient, mangaId: number, signal?: AbortSignal): Promise<RefreshResult> {
  const running = refreshing.get(mangaId);
  if (running) return running;
  const promise = invokeCancellable('manga.refresh', { mangaId }, signal)
    .then((result) => {
      queryClient.setQueryData(queryKeys.manga(mangaId), result.manga);
      return result;
    })
    .finally(() => refreshing.delete(mangaId));
  refreshing.set(mangaId, promise);
  return promise;
}

export function useRefreshManga(mangaId: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationKey: ['refreshManga', mangaId],
    mutationFn: () => refreshManga(queryClient, mangaId),
  });
}

let prefetcher: ReturnType<typeof createPrefetcher> | undefined;

/**
 * Fetches a manga that was only seen in a listing, ahead of the click. Does nothing for one that was fetched before
 * (in this session or earlier); see `createPrefetcher` for the limits.
 */
export function prefetchManga(queryClient: QueryClient, mangaId: number): void {
  if (queryClient.getQueryData<MangaInfo>(queryKeys.manga(mangaId))?.lastFetchedAt != null) return;
  prefetcher ??= createPrefetcher((id) => refreshManga(queryClient, id));
  prefetcher.request(mangaId);
}

/** Query keys that go stale when main reports a changed entity (ADR 0010). */
export function keysForTag(tag: DbChangeTag): readonly (readonly unknown[])[] {
  if (tag === 'extensions') {
    return [queryKeys.extensions, queryKeys.sources, ['sourceInfo'], ['sourceFilters'], ['preferences']];
  }
  if (tag === 'sources') return [queryKeys.sources];
  if (tag === 'repos') return [['repos'], ['extensions', 'available']];
  // Library rows show unread counts (chapters) and "last read" (history).
  if (tag === 'history') return [['history'], ['continue'], ['library']];
  // The Updates page lists library manga only.
  if (tag === 'library') return [['library'], ['updates']];
  if (tag === 'updates') return [['updates']];
  if (tag === 'trackers') return [['trackers'], ['tracks']];
  if (tag === 'categories') return [['categories'], ['library']];
  // Library rows count downloaded chapters.
  if (tag === 'downloads') return [['downloads'], ['library', 'list']];
  const [kind, id] = tag.split(':');
  if (kind === 'tracks') return [['tracks', Number(id)]];
  // History rows show the manga's title and cover, and chapter names and read state.
  if (kind === 'manga') return [queryKeys.manga(Number(id)), ['history'], ['updates', 'list']];
  if (kind === 'chapters') {
    return [
      queryKeys.chapters(Number(id)),
      ['chapter'],
      queryKeys.continue(Number(id)),
      ['library', 'list'],
      ['history'],
      // New chapters and their read state (and the sidebar badge).
      ['updates'],
    ];
  }
  return [];
}

export function invalidateTags(queryClient: QueryClient, tags: readonly DbChangeTag[]): void {
  for (const tag of tags) {
    for (const queryKey of keysForTag(tag)) void queryClient.invalidateQueries({ queryKey });
  }
}

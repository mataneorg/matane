import type { FilterState } from '@manga-reader/shared';
import type { Filter } from '@matane/extension-sdk';
import { useInfiniteQuery, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link } from '@tanstack/react-router';
import { Loader2, RefreshCw, Search, SearchX, SlidersHorizontal } from 'lucide-react';
import { type FormEvent, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { CoverViewControls } from '../../components/CoverViewControls';
import { EmptyState } from '../../components/EmptyState';
import { ErrorState } from '../../components/ErrorState';
import { Badge } from '../../components/ui/badge';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import {
  type BrowseKind,
  browseCachedQuery,
  browseQuery,
  queryKeys,
  sourceFiltersQuery,
  sourceInfoQuery,
  sourcesQuery,
} from '../../lib/sources';
import { useScrollRestoration } from '../../lib/scroll';
import { cn } from '../../lib/utils';
import { usePageCrumbs } from '../../stores/crumbs';
import { AppliedFilters } from './AppliedFilters';
import { FilterPanel } from './FilterPanel';
import { countActive, normalize, requestFilters } from './filterState';
import { useNarrow } from './useNarrow';
import { MangaCardSkeleton, MangaGrid, gridStyle } from './MangaGrid';
import { useBrowseView } from './settings';
import { SourceIcon } from './SourceIcon';
import { extensionIconUrl } from '../../lib/extensions';
import { TabUnderline } from '../../components/ui/tab-underline';
import { AnimatePresence } from '../../lib/motion';

export interface BrowseSearch {
  tab: BrowseKind;
  q?: string;
  filters?: FilterState;
}

const EMPTY_FILTERS: FilterState = {};

export function SourceBrowsePage({
  extensionId,
  sourceKey,
  search,
  onSearchChange,
}: {
  extensionId: string;
  sourceKey: string;
  search: BrowseSearch;
  onSearchChange: (next: BrowseSearch) => void;
}) {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const sourceId = `${extensionId}/${sourceKey}`;
  const { tab, q = '', filters = EMPTY_FILTERS } = search;

  const { data: sources } = useQuery(sourcesQuery);
  const source = sources?.find((s) => s.id === sourceId);
  const info = useQuery(sourceInfoQuery(sourceId));
  const capabilities = info.data?.capabilities ?? [];
  const hasFilters = capabilities.includes('getFilters');
  const filterDefs = useQuery({ ...sourceFiltersQuery(sourceId), enabled: hasFilters });
  const filterList = useMemo(() => (filterDefs.data ?? []) as Filter[], [filterDefs.data]);
  const [panelOpen, setPanelOpen] = useState(false);
  // The panel holds what is edited and not yet applied; the address (`filters`) is what the listing shows.
  const [filterDraft, setFilterDraft] = useState<FilterState>(filters);
  // The address changed (a chip taken off, Back): the panel shows it, not what was edited before.
  const [seenFilters, setSeenFilters] = useState(filters);
  if (seenFilters !== filters) {
    setSeenFilters(filters);
    setFilterDraft(filters);
  }
  const toggle = useRef<HTMLButtonElement>(null);
  // Below this width the panel floats over the list instead of taking a column from it.
  const [root, setRoot] = useState<HTMLDivElement | null>(null);
  const drawer = useNarrow(root, 1040);
  const closePanel = () => {
    setPanelOpen(false);
    toggle.current?.focus();
  };
  // A search carries the defaults the extension declared, so it waits for the declarations (or for their failure).
  const sent = useMemo(
    () => (tab === 'search' && hasFilters ? requestFilters(filterList, filters) : filters),
    [tab, hasFilters, filterList, filters],
  );
  const [{ display, coverSize }, updateView] = useBrowseView();
  usePageCrumbs(source ? `${source.name} (${source.lang.toUpperCase()})` : undefined);

  const listing = useInfiniteQuery({
    ...browseQuery(sourceId, tab, q, sent),
    enabled: (tab !== 'latest' || info.isSuccess) && (tab !== 'search' || !hasFilters || !filterDefs.isPending),
  });
  // What the first page was last time, until the real one arrives (also when it fails or the machine is offline).
  const remembered = useQuery({ ...browseCachedQuery(sourceId, tab), enabled: tab !== 'search' });
  const showingRemembered = listing.data === undefined && (remembered.data?.items.length ?? 0) > 0;
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const [scrollElement, setScrollElement] = useState<HTMLDivElement | null>(null);
  const attachScroll = useCallback((node: HTMLDivElement | null) => {
    scrollRef.current = node;
    setScrollElement(node);
  }, []);
  useScrollRestoration(scrollElement, listing.data !== undefined || showingRemembered);
  const items = listing.data?.pages.flatMap((page) => page.items) ?? remembered.data?.items ?? [];
  // Pages can repeat titles when the source list shifts between requests; show each once.
  const unique = items.filter((item, index) => items.findIndex((other) => other.mangaId === item.mangaId) === index);

  // A different tab, query or filter starts at the top; opening the page (or Back to it) keeps the position.
  const listingKey = JSON.stringify([tab, q, filters]);
  const shownListing = useRef(listingKey);
  useEffect(() => {
    if (shownListing.current === listingKey) return;
    shownListing.current = listingKey;
    // Block body: Chromium's scrollTo() returns a promise, which React would treat as a cleanup.
    scrollRef.current?.scrollTo({ top: 0 });
  }, [listingKey]);

  const tabs: { kind: BrowseKind; label: string }[] = [
    { kind: 'popular', label: t('browse.tabs.popular') },
    ...(capabilities.includes('getLatest') ? [{ kind: 'latest' as const, label: t('browse.tabs.latest') }] : []),
    { kind: 'search', label: t('browse.tabs.search') },
  ];
  const activeFilters = countActive(filterList, filters);
  const reload = () => void queryClient.resetQueries({ queryKey: queryKeys.browse(sourceId, tab, q, sent) });

  return (
    <div ref={setRoot} className="flex h-full">
      <div ref={attachScroll} className="min-w-0 flex-1 overflow-y-auto">
        <header className="sticky top-0 z-10 border-b bg-background/95 px-6 pt-4 backdrop-blur">
          <div className="flex items-center gap-3">
            <SourceIcon
              id={extensionId}
              name={source?.name ?? extensionId}
              src={source?.installed && source.hasIcon ? extensionIconUrl(extensionId) : null}
            />
            <h1 className="min-w-0 truncate text-2xl font-semibold">{source?.name ?? sourceId}</h1>
            {source && <Badge>{source.lang.toUpperCase()}</Badge>}
            {source && !source.installed && <Badge variant="danger">{t('browse.notInstalled')}</Badge>}
            <div className="ml-auto flex items-center gap-2">
              <CoverViewControls display={display} coverSize={coverSize} onChange={updateView} />
              <Button variant="secondary" onClick={reload} disabled={listing.isFetching && !listing.isFetchingNextPage}>
                <RefreshCw className={cn(listing.isFetching && !listing.isFetchingNextPage && 'animate-spin')} />
                {t('browse.refresh')}
              </Button>
            </div>
          </div>

          <div className="mt-3 flex flex-wrap-reverse items-end gap-x-4">
            <nav role="tablist" className="flex gap-6">
              {tabs.map(({ kind, label }) => (
                <button
                  key={kind}
                  type="button"
                  role="tab"
                  aria-selected={tab === kind}
                  onClick={() => onSearchChange({ ...search, tab: kind })}
                  className={cn(
                    'relative -mb-px border-b-2 border-transparent pb-3 text-muted-foreground transition-colors hover:text-foreground',
                    tab === kind && 'font-semibold text-foreground',
                  )}
                >
                  {label}
                  {tab === kind && <TabUnderline layoutId="browse-tab-underline" />}
                </button>
              ))}
            </nav>
            <div className="mb-2 ml-auto flex min-w-0 items-center gap-2">
              <SearchBox
                key={q}
                initial={q}
                placeholder={t('browse.searchPlaceholder', { source: source?.name ?? '' })}
                onSubmit={(value) => onSearchChange({ tab: 'search', q: value || undefined, filters: search.filters })}
              />
              {hasFilters && (
                <Button
                  ref={toggle}
                  variant={panelOpen || activeFilters > 0 ? 'default' : 'secondary'}
                  className={cn(
                    !panelOpen && activeFilters > 0 && 'bg-primary/15 text-primary-text hover:bg-primary/25',
                  )}
                  onClick={() => (panelOpen ? closePanel() : setPanelOpen(true))}
                  aria-expanded={panelOpen}
                >
                  <SlidersHorizontal />
                  {t('browse.filters.button')}
                  {activeFilters > 0 && (
                    <span className="rounded-full bg-primary px-1.5 text-[11px] text-primary-foreground">
                      {activeFilters}
                    </span>
                  )}
                </Button>
              )}
            </div>
          </div>
        </header>

        <div className="flex flex-col gap-5 p-6">
          {hasFilters && tab === 'search' ? (
            <AppliedFilters
              filters={filterList}
              value={filters}
              onRemove={(id) => {
                const { [id]: _removed, ...rest } = filters;
                onSearchChange({ ...search, filters: Object.keys(rest).length > 0 ? rest : undefined });
              }}
              onClear={() => onSearchChange({ ...search, filters: undefined })}
            />
          ) : null}
          {listing.isPending && !showingRemembered ? (
            <div className="grid" style={gridStyle(display, coverSize)}>
              {Array.from({ length: 18 }, (_, i) => (
                <MangaCardSkeleton key={i} display={display} />
              ))}
            </div>
          ) : listing.isError && unique.length === 0 ? (
            <ErrorState error={listing.error} onRetry={reload} sourceId={sourceId} />
          ) : unique.length === 0 ? (
            <EmptyState
              icon={SearchX}
              title={t('browse.noResults.title')}
              description={t('browse.noResults.description')}
              action={
                <Button asChild variant="secondary">
                  <Link to="/browse/sources">{t('nav.sources')}</Link>
                </Button>
              }
            />
          ) : (
            <>
              {showingRemembered && (
                <div className="mb-4 flex items-center gap-2 text-xs text-muted-foreground" role="status">
                  {listing.isError ? (
                    <ErrorState compact error={listing.error} onRetry={reload} sourceId={sourceId} />
                  ) : (
                    <>
                      <Loader2 className="size-3.5 animate-spin text-primary-text" />
                      {t('browse.refreshing')}
                    </>
                  )}
                </div>
              )}
              <MangaGrid
                items={unique}
                hasNextPage={listing.hasNextPage}
                isFetchingNextPage={listing.isFetchingNextPage}
                failed={listing.isFetchNextPageError}
                fetchNextPage={() => void listing.fetchNextPage()}
                scrollRoot={scrollRef}
                loadingLabel={t('browse.loadingMore', { source: source?.name ?? '' })}
                display={display}
                coverSize={coverSize}
              />
              {listing.isFetchNextPageError && (
                <ErrorState
                  compact
                  error={listing.error}
                  onRetry={() => void listing.fetchNextPage()}
                  sourceId={sourceId}
                />
              )}
            </>
          )}
        </div>
      </div>

      <AnimatePresence>
        {panelOpen && hasFilters ? (
          <FilterPanel
            filters={filterList}
            status={filterDefs.isPending ? 'pending' : filterDefs.isError ? 'error' : 'ready'}
            error={filterDefs.error}
            onRetry={() => void filterDefs.refetch()}
            value={filterDraft}
            applied={filters}
            overlay={drawer}
            busy={listing.isFetching && !listing.isFetchingNextPage}
            onChange={setFilterDraft}
            onApply={() => {
              const applied = normalize(filterList, filterDraft);
              onSearchChange({
                tab: 'search',
                q: search.q,
                filters: Object.keys(applied).length > 0 ? applied : undefined,
              });
              // A drawer hides the list it filters: show the result.
              if (drawer) closePanel();
            }}
            onReset={() => {
              setFilterDraft({});
              onSearchChange({ tab: 'search', q: search.q, filters: undefined });
            }}
            onClose={closePanel}
          />
        ) : null}
      </AnimatePresence>
    </div>
  );
}

function SearchBox({
  initial,
  placeholder,
  onSubmit,
}: {
  initial: string;
  placeholder: string;
  onSubmit: (value: string) => void;
}) {
  const [value, setValue] = useState(initial);
  const submit = (event: FormEvent) => {
    event.preventDefault();
    onSubmit(value.trim());
  };
  return (
    <form role="search" onSubmit={submit} className="relative w-64 min-w-40 shrink">
      <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
      <Input
        type="search"
        value={value}
        onChange={(event) => setValue(event.target.value)}
        placeholder={placeholder}
        aria-label={placeholder}
        className="pl-9"
      />
    </form>
  );
}

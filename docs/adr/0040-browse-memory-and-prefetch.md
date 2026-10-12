# 40. Browse remembers its first page, fetches ahead, and drops rows nobody kept

Status: Accepted (2026-10-12). Covered by unit tests (the cache, the purge, the prefetcher, the service); not yet seen running in the app.

## Context
Opening a source showed a wall of skeletons until the site answered, and a source that was slow or offline showed nothing at all. Opening a manga that was only seen in a listing waited for the site once more (details and chapters). And every listing writes a `manga` row for each title it shows, so the table grew with every visit and never shrank.

## Decision
- **The first page of Popular and Latest is remembered** (`main/browse/cache.ts`, `userData/cache/browse`). After a successful page 1, the manga ids in order and `hasNextPage` go into one small JSON file per `(source, kind)`, written to a temporary file and renamed. Searches and later pages are not kept. Only ids are stored: `sources.browseCached` rebuilds the items from the `manga` rows, so titles, covers and `inLibrary` are current, and rows purged since are skipped. A remembered page older than 7 days is not shown. The adult-source check runs again on read.
- **Browse shows it first.** `SourceBrowsePage` asks for the remembered page next to the real query. While the real one is pending, or has failed, or the machine is offline, the remembered items stay on screen with an "Updating the list…" line (or the retry state when it failed). The real page replaces them. The skeleton shows only when nothing is remembered.
- **A card fetches its manga ahead** after the pointer or keyboard focus has rested on it for 350 ms (`useFetchAhead`), unless `detailsFetched` (the new field on a listing item, from `lastUpdateCheckAt`) says it was fetched, or the machine is offline. `createPrefetcher` allows two requests at a time, one try per manga per session, and lets a failed one try again. `refreshManga` is one function for the detail page and the prefetch: a click while the prefetch runs joins that request. Chapters fetched this way are not news: Updates lists library manga only, and chapters fetched before a manga joins the library are older than `added_at`.
- **Rows nobody kept are dropped** (`db/housekeeping.ts`, at start): not in the library, untouched for 14 days, and with no history, no reading session (kept for statistics), no tracker link or queued update, no custom cover, no read, bookmarked or started chapter, and no download (its row would cascade away and orphan the files). The local files source is never touched. A row seen again in a listing renews its `updatedAt` (once a day at most), and so do the details fetch and the update check. The permanent cover copy of a deleted row is removed.
- **Covers give up sooner than pages**: a browse cover gets a 10 second timeout and one retry on the same rate bucket as pages (`covers` fetcher in `NetworkManager`), so a dead cover shows its placeholder after about 21 seconds at worst, not a minute. Reader pages keep their 30 seconds.

## Consequences
- After the first visit a listing shows its covers at once, also after a restart or while the site is slow.
- A hovered but never opened manga costs two requests to the site and a few rows. A Cloudflare challenge can start the solver window from a prefetch, as any other request would.
- The remembered page can be a little behind the site; it is replaced as soon as the real one arrives.
- Two weeks without any sign of use is the line for the purge; a manga only ever glanced at and later opened by URL is fetched again.

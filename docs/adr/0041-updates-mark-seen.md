# 41. Updates: entries are marked as seen on purpose

Status: Accepted (2026-10-12). Unit tests pass (repository, service, migration); the end-to-end cases are written and were not run.

## Context
The Updates list is derived ([0020](0020-library-update-checker.md)): a chapter is an entry while its manga is in the library and it was first seen after the manga joined. The sidebar badge counted the unread entries first seen after a timestamp, and opening the Updates page moved that timestamp to now. That made the badge disappear on a glance, could not be undone, and with a long list the user may not have looked at most of the entries. The only other way off the list was to read the chapter.

## Decision
- **A nullable column `chapters.update_seen_at`** (migration `0006_update_seen`, `ALTER TABLE … ADD`). It holds when the user dismissed the entry; null means it still shows. No backfill: nothing disappears on upgrade. Backups do not carry it (a restored profile lists what its checks find).
- **The list and the badge share one filter.** `UpdatesRepository.list` gained `AND c.update_seen_at IS NULL`, and the badge is the unread entries of that list, so they cannot drift apart. The timestamp setting `updates.seenAt` is no longer read (the stored value stays where it is, unused).
- **`markSeen(chapterIds)` and `markAllSeen()`** stamp only chapters the list shows right now (hidden scanlators and chapters the source dropped are not in it), through `list()` and then an update by id, and return how many were stamped. The `updates` change is emitted only when something changed, so the badge and the page refresh through the existing invalidation. Reading progress, history and downloads are not touched.
- **IPC:** `updates.markSeen` (`{ chapterIds }` → number) replaces the old no-argument call, and `updates.markAllSeen` (void → number) is new.
- **UI:** the Updates page has "Mark as seen" on the selection bar and in a row's right-click menu, and "Mark all as seen" in the header menu, which asks first. Opening the page marks nothing.
- **Later chapters are never pre-seen.** A new row starts with null. A dismissed entry stays dismissed when a later sync lists the chapter again (the row keeps its id and column).

## Consequences
- **Seen is one way.** There is no "show seen entries again"; the manga page still lists every chapter, so nothing is lost. Add one if people ask.
- **Notifications are not retracted.** A notification already shown stays.
- The badge no longer clears by itself: a user who never marks anything sees it grow until the entries are read or dismissed.

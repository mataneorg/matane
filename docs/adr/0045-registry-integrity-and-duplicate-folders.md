# 45. The registry checks installed files and refuses duplicate developer folders

Status: Accepted (2026-10-12). Unit tests pass (registry, installer, service).

## Context
[0023](0023-extension-install-lifecycle.md) fixed which copy of an extension wins (developer folder, then installed, then built-in) and how an install is written atomically. Two gaps remained. An installed extension was run from disk as it was found, so a file changed after the install (by something else on the machine, a bad sync, a half-restored backup) ran as if the repository had published it. And two developer folders with the same id silently fought: whichever loaded last won, and which one that was depended on the order of the list.

## Decision
- **A digest of the installed files.** `bundleDigest` is the sha256 of `manifest.json`, a newline and `index.js`. The installer stores it (settings key `extensions.digest.<id>`) right after writing the files and before the reload, and forgets it on uninstall. At every load, `ExtensionRegistry` compares the files of an installed extension with it; a mismatch keeps the entry but without code and with the error "The files of this extension changed after it was installed; uninstall it and install it again", so it is listed, can be removed, and is never run. Installing it again records a new digest.
- **Installs from before this change** have no digest. They are trusted as they are at the first start after the upgrade, and their digest is recorded then (`index.ts`); from there a change is noticed.
- **Developer folders and built-ins are not checked**: a developer edits their folder on purpose, and a built-in ships inside the app.
- **One developer folder per id.** When two give the same id the first stays, the other is not loaded (`ExtensionRegistry.duplicateOf`), and adding a second one in Settings fails with a message that names the first and does not keep the folder in the list.
- The signed repository index still protects what is downloaded; the digest protects what is on disk afterwards.

## Consequences
- An extension that someone edited in place must be reinstalled (or loaded as a developer folder). That is the point.
- The digest lives next to the other small settings, not in the `extensions` table, so there is no migration and a restored backup (which does not carry the folder) does not bring a stale one.
- Not done: listing the hidden copy that a developer folder replaces as a record of its own; the entry that wins carries `shadows` instead (ADR 0023's order is unchanged).

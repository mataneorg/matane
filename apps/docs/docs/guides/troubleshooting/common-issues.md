# Common issues

## A source shows an error or no chapters

1. Press **Try again**. If you see "Cloudflare check required", press **Verify** and complete the check in the window that opens ([Network](/docs/guides/network#cloudflare-checks)).
2. In Indonesia and other places that block sites by DNS, turn on [DNS-over-HTTPS](/docs/guides/network#dns-over-https).
3. Check **Extensions, ⋮, View logs** for the failing request ([Diagnosis](/docs/guides/troubleshooting/diagnosis#read-the-extension-log)).
4. **Update the extension.** If it still fails, report it to the extension's repository, not Matane's.

## Matane cannot reach anything

Open **Settings, Network, Test connection**. A proxy or DNS-over-HTTPS setting that does not work here is the usual cause: set the proxy to **System** and DNS-over-HTTPS to **Off** to rule them out. While offline, Matane says so; your library, history, downloads and chapters already read keep working.

## Images load slowly or the strip jumps

Turn on **Split tall pages** (Settings, Reader), lower **Preload pages** on a slow connection, and give the page cache more space in **Settings, Data & storage**.

## An extension is "source not installed"

The manga stays in your library with its progress and downloads. Install the extension again, or [migrate the manga to another source](/docs/guides/source-migration).

## Installing an extension fails

- A repository whose signature is invalid, or whose key changed after you trusted it, is refused: remove the repository and add it again to trust the new key.
- Every downloaded extension must match its signed checksum before anything is written; a file that changed after install is refused until you reinstall it.
- Updates for an extension come from the repository it was installed from.

## Downloads do not start or fail

Check **Downloads** for the error and use retry. The size limit in **Settings, Downloads** stops automatic downloads when it is reached, and **Resume the queue on start** decides whether unfinished downloads wait, paused, after a restart. See [Downloads and offline](/docs/guides/downloads).

## New chapters do not show up

Check **Settings, Library, Library updates**: the interval may be off, or the manga may be skipped (completed, not started, or with many unread chapters). Checking a single manga always works. Matane only checks while it runs: turn on **Close to tray** to keep it in the background ([New chapters](/docs/guides/updates#running-in-the-background)).

## The window does not open (Linux)

Some distributions need `libfuse2` for the AppImage. See [Install](/docs/guides/install#linux).

## Windows or macOS says the app is unsafe

The builds are not code-signed yet. See [Install](/docs/guides/install#windows) for "Run anyway" (Windows) and "Open Anyway" (macOS), and download only from the project's GitHub Releases.

## There is no tray icon (Linux)

The tray needs a desktop with a system tray (StatusNotifier). On GNOME, install the "AppIndicator and KStatusNotifierItem Support" extension; without a tray, "close to tray" is turned off.

## A Mihon backup does not import fully

See the limits in [Importing from Mihon or Tachiyomi](/docs/guides/backups#importing-from-mihon-or-tachiyomi): the source's extension must use the same addresses, and trackers, repositories and app settings are not imported.

## Still stuck

Follow [Diagnosis](/docs/guides/troubleshooting/diagnosis), then [report the problem](https://github.com/mataneorg/matane/issues/new/choose).

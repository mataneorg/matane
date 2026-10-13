# Getting started

This page takes you from nothing to your first chapter. If you want to know what Matane is first, read the [Introduction](/docs/).

## Installation guide

### Downloading Matane

<Shot name="onboarding-appearance" alt="The first screen of the setup: language, theme and accent colour" />

1. Go to the [Download page](/download). It offers the right package for your system.
2. Open the file you downloaded: run the installer on Windows, drag the app to Applications on macOS, or make the AppImage executable on Linux ([all packages](/download#pick-a-package)).
3. Start Matane. A short setup asks for the app language, theme and accent colour, the languages you read, the download folder, whether to install sources now, and shows the reader basics.

::: warning Unsigned builds
The Windows and macOS builds are not code-signed yet, so your system warns you on first run. [Here is how to get past it](/docs/guides/install#windows). Download only from the project's [Releases page](https://github.com/mataneorg/matane/releases).
:::

### Adding sources

Matane hosts no manga and ships with no repositories. A source comes from an **extension**, a small program that reads a website for you. There are three ways to get one.

::: warning Matane hosts no content
What you add, and what it shows you, is your choice and your responsibility. See the [FAQ](/docs/faq/general#is-matane-legal-where-does-the-content-come-from).
:::

#### External repositories

<Shot name="add-repository-unverified" alt="Adding a repository whose key you do not know yet" />

A repository is a web address that someone publishes. You get the address from the people who run it.

1. Open **Browse, Extensions** and choose **Add repository**.
2. Paste the repository address and choose **Check repository**. Matane shows what it contains and who signed it.
3. Decide whether to **trust the key**, then add the repository.
4. Open the **Available** tab and **Install** the extensions you want. A dialog shows the details; nothing is written until you confirm.

The full explanation, including what trust means, is in [Extensions and repositories](/docs/guides/extensions).

#### Local files

Manga already on your computer (CBZ files, folders of images) appear as a source called **Local files**. See [Local files](/docs/guides/local).

#### Loading an extension from a folder

If you have an extension as a folder (you wrote it, or a developer gave it to you), load it from **Settings, Advanced**. See [Writing extensions](/extensions/).

### Adding manga to your library

<Shot name="browse" alt="Browsing a source" />

1. Open **Browse** and pick a source.
2. Look through its **Popular** and **Latest** tabs, or use the search box.
3. Open a manga to see its description and chapters.
4. Choose **Add to library**. It now appears in **Library**, and Matane remembers your progress in it.

To read, choose **Continue reading** or click a chapter. The next time, **Continue** opens the right chapter.

## Additional setup

### Searching with Global search

<Shot name="global-search" alt="Global search with results grouped by source" />

If you do not know which source has a manga, search all of them at once.

1. Open **Browse, Global search**, or press <kbd>Ctrl</kbd>+<kbd>K</kbd> and pick **Search "…" in all sources**.
2. Type a title and press <kbd>Enter</kbd>. The results are grouped by source.
3. Open a result, or choose **View all** to see everything one source found. If a site wants a browser check, choose **Verify** ([Network](/docs/guides/network#cloudflare-checks)).

### Trouble finding a specific manga?

- **Try other spellings.** Sources spell titles differently. Try the romaji, the English title, or fewer words.

  > "Shingeki no Kyojin" instead of "Attack on Titan"

- **Leave out the season or volume.** Many sources list everything under one title.

  > "Mob Psycho" instead of "Mob Psycho 100 Volume 3"

- **Drop punctuation and subtitles.** A colon or a long subtitle can stop a match.

  > "Fate Zero" instead of "Fate/Zero"

- **Try another source or language.** Not every source carries every title, and your [content languages](/docs/guides/settings#browse-extensions) decide which sources you see.

## Next steps

- Organise your library with [categories](/docs/guides/categories), and get told about [new chapters](/docs/guides/updates).
- Learn the reader: [Reader](/docs/guides/reader) and [Reader settings](/docs/guides/reader-settings).
- Keep chapters for offline: [Downloads and offline](/docs/guides/downloads).
- Keep your reading list on AniList and others: [Trackers](/docs/guides/tracking).
- Coming from Mihon or Tachiyomi? [Import your backup](/docs/guides/backups#importing-from-mihon-or-tachiyomi).
- Back up your data: [Backups](/docs/guides/backups).
- Look through every option: [Settings reference](/docs/guides/settings).

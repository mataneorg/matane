# General

## What is Matane?

An open-source desktop manga reader for Windows, macOS and Linux with a library, reading progress, downloads for offline reading and new-chapter checks. Read the [Introduction](/docs/) or start with [Getting started](/docs/guides/getting-started).

## Is Matane legal? Where does the content come from?

Matane is a reader. It does not host, upload or distribute any manga. Sources are provided by extensions, which read websites on your behalf, just like a web browser. No repository ships with the app and it does not suggest any. Which sources you use, and whether that is allowed where you live, is up to you. Support the creators: buy the books and use official platforms when you can.

## Where are the manga?

There are none built in. You add an extension from a repository whose address you get elsewhere ([Extensions and repositories](/docs/guides/extensions)), or read your own files with [Local files](/docs/guides/local).

## Can you add support for site X?

No, and the app does not suggest sites. A source is an extension, so the request belongs to the repository of the extension that provides it, or you can [write one](/extensions/).

## Which systems are supported?

Windows (installer and portable), macOS (Apple silicon and Intel) and Linux (AppImage, deb, rpm, tar.gz, AUR and Flatpak). See the [Download page](/download). There is no mobile version.

## Is it free?

Yes. It is free and open source under the GPL-3.0 license, with no ads, accounts or paid features.

## Does Matane collect data?

No. There is no telemetry or analytics. Matane only talks to the sources you use, the repositories you added, GitHub (update checks), the trackers you connect, and Discord on your computer if you turned on Rich Presence.

## Is there an account or sync between computers?

No. Everything stays on your computer. To move to another computer, use [backup and restore](/docs/guides/backups). You can keep your reading list on a website with [Trackers](/docs/guides/tracking).

## Can I bring my Mihon or Tachiyomi library?

Yes: [Importing from Mihon or Tachiyomi](/docs/guides/backups#importing-from-mihon-or-tachiyomi).

## Why does Windows or macOS say the app is unsafe?

The builds are not code-signed yet. See [Install](/docs/guides/install#windows) for "Run anyway" (Windows) and "Open Anyway" (macOS), and download only from the project's GitHub Releases.

## Why does the app not update itself everywhere?

Packages from a package manager and the portable `.exe` cannot replace themselves, and macOS builds are unsigned. Matane tells you a new version exists. The AppImage and the Windows installer update in place. See [Updates](/docs/guides/install#updates).

## What languages does the app support?

English and Bahasa Indonesia (**Settings, General**). The content languages are a separate setting that decides which sources you see.

## Reporting a bug

See [Diagnosis](/docs/guides/troubleshooting/diagnosis#reporting-a-bug). Security problems: please report them privately, as described in [SECURITY.md](https://github.com/mataneorg/matane/blob/main/SECURITY.md).

## How can I help?

See [Contribute](/contribute).

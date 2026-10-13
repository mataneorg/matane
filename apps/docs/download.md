---
title: Download
---

# Download

<DownloadButton :guide="false" />

Packages are built by CI when a release is cut and are published on the project's [Releases page](https://github.com/mataneorg/matane/releases). Pre-releases (betas) are marked as such: choose the **Beta** [update channel](/docs/guides/install#updates) to get them.

::: warning Unsigned builds
The Windows and macOS builds are not code-signed yet, so your system warns you on first run: see [how to get past it](/docs/guides/install#windows). Download only from the project's Releases page.
:::

## Pick a package

| System                        | File                                       | Updates                                |
| ----------------------------- | ------------------------------------------ | -------------------------------------- |
| Windows 10/11                 | `Matane-<version>-win-x64.exe` (installer) | installs them itself                   |
| Windows, no install           | `Matane-<version>-win-x64-portable.exe`    | tells you, links the release           |
| macOS (Apple silicon / Intel) | `-mac-arm64.dmg` / `-mac-x64.dmg`          | tells you, links the release           |
| Linux (any distribution)      | `Matane-<version>-linux-x86_64.AppImage`   | installs them itself                   |
| Debian, Ubuntu, Mint          | `Matane-<version>-linux-amd64.deb`         | tells you; update with the new package |
| Fedora, openSUSE              | `Matane-<version>-linux-x86_64.rpm`        | tells you; update with the new package |
| Arch Linux                    | AUR `matane-bin`                           | through your AUR helper                |
| Flatpak                       | Flathub `dev.sukun.matane`                 | through Flathub                        |
| Linux, by hand                | `Matane-<version>-linux-x64.tar.gz`        | tells you, links the release           |

The AUR and Flathub packages follow each release once they are published there.

## After installing

Follow [Getting started](/docs/guides/getting-started). Your data lives in the app's data folder ([where](/docs/guides/install#where-your-data-is)) and your downloads in the download folder; neither is deleted when you uninstall.

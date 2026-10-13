# Install and updating

Download Matane from [GitHub Releases](https://github.com/mataneorg/matane/releases). Pre-releases (betas) are marked as such.

Pick the right file on the [Download page](/download), which lists every package and how each one updates.

The builds are **not code-signed yet**, so your system warns the first time you open Matane.

## Windows

Run the installer. SmartScreen may show **"Windows protected your PC"**: click **More info**, then **Run anyway**. The installer is per user (no administrator rights) and lets you choose the folder.

The portable exe runs from anywhere (a USB stick, a synced folder) without installing. It keeps its data in the usual app data folder.

## macOS

Open the dmg and drag Matane to **Applications**. The first launch is blocked ("cannot verify the developer" or "is damaged"):

- open **System Settings → Privacy & Security** and click **Open Anyway**, or
- run `xattr -dr com.apple.quarantine /Applications/Matane.app` in Terminal.

Without a signature macOS cannot update the app by itself: Matane tells you about a new version and links the download.

## Linux

**AppImage:** make it executable (`chmod +x Matane-*.AppImage`, or Properties → "Allow executing") and run it. Some distributions need `libfuse2` (`sudo apt install libfuse2`).

**deb / rpm:**

```sh
sudo apt install ./Matane-*-linux-amd64.deb      # Debian, Ubuntu
sudo dnf install ./Matane-*-linux-x86_64.rpm     # Fedora
```

**Arch Linux (AUR):** `yay -S matane-bin` (or `paru -S matane-bin`).

**Flatpak:** `flatpak install flathub dev.sukun.matane`. The Flatpak can write to `~/Documents/Matane`; another download folder you choose goes through the system file picker.

The tray icon needs a desktop with a system tray (StatusNotifier). On GNOME, install the "AppIndicator and KStatusNotifierItem Support" extension; without a tray, "close to tray" is turned off.

## Where your data is

| What                                               | Where                                                                                                                                   |
| -------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------- |
| Library, progress, settings, cache, logs           | `%APPDATA%\Matane`, `~/Library/Application Support/Matane`, `~/.config/Matane` (Flatpak: `~/.var/app/dev.sukun.matane/config/Matane`) |
| Downloads                                          | `Documents/Matane` unless you pick another folder                                                                                       |
| Backups                                            | `backups` in the data folder, or the folder you chose                                                                                   |

**Settings → Data & storage** opens the data folder and shows what uses space. Uninstalling keeps your data; delete the folder to remove it.

## Updates

Settings → About shows the version, how Matane was installed and the update status. You choose whether updates download by themselves, only notify you, or are off, and the channel: **stable** or **beta**. Packages from a package manager (Flatpak, AUR, deb, rpm) only tell you a new version is out; update them as you update the rest of your system.

# 43. Repository index: the oldest app version and the hash of the icon

Status: Accepted (2026-10-12). Unit tests pass in the runtime, the CLI and the app. `formatVersion` stays 1: both fields are optional.

## Context
A repository served an extension to every app, however old: one that needs a newer extension API or host behaviour installed fine and then failed. The index also listed no hash for the icon, so the icon, the only file the app fetches and shows without it being inside the hashed archive, could change under a signature that covered everything else but the bytes.

## Decision
- **`minAppVersion`** (optional semver) on an index entry, written by `mr-ext repo build --min-app-version <semver>` (checked as a semantic version before anything is written). In the app, `ExtensionInstaller.available()` marks an entry `compatible` when the app is at least that version (prereleases of the app sort below the release); `prepare()` refuses an incompatible one with the keyed error `repo.needsNewerApp`; "update all" skips them without reporting a failure. The Extensions page shows "Needs Matane X" in place of Install. The signed index is not strict, so an app from before the field ignores it; the field helps only apps that know it.
- **`iconSize` and `iconSha256`** (optional, both or neither, and only when `icon` is set). The CLI writes them, `repo verify` and `ExtensionIcons.repo()` check the icon against them (`checkIconHash`), and an icon that differs is not shown and not kept. An index without them is accepted as before.
- **No new package.** matane-anime keeps this logic in a private `extension-repo` package; here it stays in the SDK (schema), the runtime (`checkIconHash`) and the CLI, which the app and the CLI both already depend on, so there is nothing to duplicate.

## Consequences
- A repository maintainer who raises the host requirements can say so; users on an old app learn why they cannot install instead of getting a broken extension.
- The version comparison of the app (`compareVersions`, as used for app updates) decides; it is the one place that knows what a prerelease is.
- Not done: a serial number in the index against rollback to an older, still validly signed index.

# Releasing (for the maintainer)

Three things get released from this repository.

1. **The app** (GPL-3.0), built by `.github/workflows/release.yml` into GitHub Releases when a `vX.Y.Z` tag is pushed.
2. **The npm packages** `@matane/extension-sdk`, `-runtime`, `-templates` and `-cli` (MIT), published by `.github/workflows/publish-sdk.yml` when an `sdk-vX.Y.Z` tag is pushed.
3. **The Linux packages** that live outside GitHub releases: the AUR package `matane-bin` and the Flathub app `dev.sukun.matane` (see [packaging/README.md](../packaging/README.md)).

## The app

1. Update `CHANGELOG.md` (a section `## X.Y.Z — date`; the release notes are cut from it) and the version in `apps/desktop/package.json`. Commit.
2. Run the checks: `pnpm lint && pnpm format:check && pnpm typecheck && pnpm test && pnpm e2e`. For a build you can try locally: `pnpm dist:linux`, then `pnpm smoke:packaged` (it starts the AppImage once, with an empty profile, and checks the database, the migrations, the extension sandbox, sharp and the renderer).
3. Push the tag: `git tag vX.Y.Z && git push origin vX.Y.Z` (`vX.Y.Z-beta.N` for a pre-release).

What the workflow does:

- `draft` creates a draft release with the notes from `CHANGELOG.md`.
- `build` builds every OS on its own runner (`electron-builder --publish always` uploads into the draft). On Linux it then starts the AppImage it just built (`pnpm smoke:packaged` under `xvfb-run`). A failure there stops the release from being published.
- `publish` turns the draft into the release once every build succeeded.
- `aur` (stable tags only) runs `node packaging/update-aur.mjs X.Y.Z` after the release is public and commits `packaging/aur/*` to `main`. Pushing to the AUR repository itself, and updating Flathub, stay manual.

## The npm packages

The four packages are versioned together and the tag must equal that version.

1. Bump `version` in the four `package.json` files and keep the `@matane/extension-sdk` dependency ranges of the others in step. The extension API version (`SDK_API_VERSION`) changes only when the contract with extensions does.
2. Run `pnpm verify:packages`. It packs the four packages, checks the tarballs (only intended files, no `workspace:` ranges, every export present), installs them into an empty project, type-checks the declarations, runs `mr-ext create`, `build` and a signed `repo build` + `repo verify` from there, and does `npm publish --dry-run` (skipped for a version that is already on npm). It publishes nothing.
3. Push `sdk-vX.Y.Z`. The workflow checks that every package says X.Y.Z, typechecks, tests, runs `verify:packages`, and publishes with provenance (the `NPM_TOKEN` secret).

The scaffold (`mr-ext create`) depends on the CLI version it was made with (`^X.Y.Z`), so a CLI release is also what new extensions start from.

## Pre-release or stable

A tag with a suffix (`-beta.1`) is a pre-release: it does not trigger the AUR job, and only profiles on the beta update channel receive it. The first stable release of a line is the one that new profiles follow by default.

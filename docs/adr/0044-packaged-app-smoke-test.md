# 44. A smoke test of the packaged app

Status: Accepted (2026-10-12). The unit tests and `scripts/verify-packages.mjs` were run here; the packaged run (`pnpm smoke:packaged`) is exercised by the release workflow and was not run on this machine.

## Context
The unit and e2e tests run the app from its sources, with `electron-vite build` output but not from the installer. The things that break only after packaging — a native module that cannot be loaded from inside the asar (`better-sqlite3`, `sharp`), migrations that did not reach the package, the QuickJS WebAssembly of the extension sandbox, the renderer bundle — showed up as a broken release that nobody had started.

## Decision
- **`MATANE_SMOKE=1` makes the app check itself and quit** (`main/app/smoke.ts`): SQLite answers and the bundled migrations ran, a one-file extension is loaded from a folder in the profile and answers `__info` from inside the sandbox (then removed), `sharp` makes an image, and the renderer mounted. It prints one `MATANE_SMOKE {json}` line, exits 0 when all passed and 1 otherwise. In a smoke run the scheduler, the update checks, the repository sync and the tracker queue do not start, so nothing touches the network. Nothing sets the variable for a user and no other code looks at it.
- **`apps/desktop/scripts/smoke-packaged.mjs`** runs the packaged app (the newest `release/<version>/*.AppImage`, else `linux-unpacked/matane`, or a path given) with an empty `--user-data-dir`, under `xvfb-run` when there is no display, and adds what the app cannot check about itself: `data.db` exists, the number of migrations applied equals the number bundled in `drizzle/meta/_journal.json`, the exit is clean, and it finishes within 90 seconds.
- **The release workflow runs it on the Linux build** before the draft is published; a failure keeps the release from going out.

## Consequences
- A broken package is found by the pipeline, not by the first user. It covers Linux only; the Windows and macOS builds are not started in CI.
- A new native dependency or a new bundled resource should be added to `runSmoke` when it can fail only after packaging.

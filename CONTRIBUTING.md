# Contributing

Thanks for helping! This page is the short version; the reasoning behind the big choices is in [docs/adr](docs/adr), and how the code fits together is in [DEVELOPMENT.md](DEVELOPMENT.md). Everyone taking part follows the [Code of Conduct](CODE_OF_CONDUCT.md). Vulnerabilities go to [SECURITY.md](SECURITY.md), not to a public issue.

## Where things belong

- **A bug or an idea for the app**: an issue here, using the templates.
- **A request for a particular site or source**: not here. Matane ships no sources and does not suggest any. A source is an extension, and requests belong to the repository of the extension that provides (or would provide) it. To write one yourself, see the [extension guide](https://mataneorg.github.io/matane/extensions/).
- **A pull request**: for anything bigger than a fix, open an issue first so the direction can be agreed before you write code.

## Setup

Requirements: [pnpm](https://pnpm.io) 12 (pinned in `packageManager`), Node 24 LTS (`.node-version`), and a C/C++ toolchain with Python for native modules.

```sh
pnpm install      # also downloads Electron and rebuilds better-sqlite3 for it
pnpm dev          # the app with hot reload
```

## Commands

| Command                                   | What it does                                                                                            |
| ----------------------------------------- | ------------------------------------------------------------------------------------------------------- |
| `pnpm dev`                                | The app with hot reload                                                                                 |
| `pnpm lint` / `pnpm format:check`         | ESLint and Prettier (`pnpm format` fixes formatting)                                                    |
| `pnpm typecheck`                          | TypeScript across all packages                                                                          |
| `pnpm test`                               | Unit tests (Vitest, plain Node)                                                                         |
| `pnpm e2e`                                | Builds, then runs the Playwright specs against the real app. On headless Linux: `xvfb-run -a pnpm e2e`  |
| `pnpm dist:linux` / `pnpm smoke:packaged` | Builds an AppImage into `apps/desktop/release/<version>/`, then starts it once and checks it            |
| `pnpm verify:packages`                    | Packs the SDK, runtime, templates and CLI and tests the tarballs in an empty project; publishes nothing |

Before you push: `pnpm lint && pnpm format:check && pnpm typecheck && pnpm test`. CI runs those and the e2e specs.

### Tests versus e2e

- **Unit tests** are Vitest in plain Node, next to the code (`*.test.ts`). Put logic in plain modules that do not import `electron`, so it can be tested without launching the app. Most changes need only these.
- **e2e** launches the built Electron app with Playwright against the fake site in `apps/desktop/e2e/support/site.ts`. Use it for flows that cross processes. It is slow and needs a display (or `xvfb-run`), so run the specs that touch your change rather than everything, and let CI run the rest. CI never touches real sources.

## Commits and pull requests

- **Conventional Commits**: `feat:`, `fix:`, `docs:`, `ci:`, `refactor:`, `test:`, `chore:`, with an optional scope (`fix(reader): …`). Plain English, imperative.
- **No attribution lines** in commit messages or pull request descriptions: no `Co-Authored-By`, no "Generated with" footers, no tool or assistant credits.
- Keep a pull request to one change. Say what it does and how you checked it. A UI change needs a screenshot (Mocha and Latte if colours are involved).

## Code conventions

- **i18n**: user-visible text goes through i18next and lives in **both** `apps/desktop/src/renderer/src/i18n/locales/en.json` and `id.json`; a lint rule catches literal strings in JSX, and a test keeps the two files in step. The main process has its own catalog (`apps/desktop/src/main/i18n`, ADR 0042); an error main raises for the user gets a key.
- **Colours**: text in an accent or status colour uses the `*-text` tokens (`text-primary-text`, `text-danger-text`, …), which stay readable on Latte (ADR 0039).
- **UI**: follows the mockups in `docs/ui/` (ADR 0008). Dialogs use `components/ui/dialog.tsx`, menus `components/ui/context-menu.tsx` and `dropdown-menu.tsx`, motion comes from `lib/motion.ts`.
- **Typed IPC**: renderer and main talk through the contract in `packages/shared` (ADR 0005). The renderer has no Node.
- **Decisions**: a change that settles an architectural question gets an ADR in `docs/adr/` (next number, same format as the others, and a line in its README).
- **Extensions never ship with the app**: nothing in this repository adds, names or points to a real source, repository or key.

## Releases

Maintainers follow [docs/releasing.md](docs/releasing.md).

## License

By contributing you agree that your contribution is licensed like the part of the repository it touches: GPL-3.0 for the app (`apps/desktop`, `packages/shared`), MIT for `packages/extension-*` ([ADR 0002](docs/adr/0002-licensing.md), [0011](docs/adr/0011-extension-tooling-mit.md)). Code moved between a GPL and an MIT package changes license with it, so that is a deliberate decision, not a side effect.

---
title: Contribute
---

# Contribute

Thanks for helping. The full rules are in [CONTRIBUTING.md](https://github.com/mataneorg/matane/blob/main/CONTRIBUTING.md) and how the code fits together is in [DEVELOPMENT.md](https://github.com/mataneorg/matane/blob/main/DEVELOPMENT.md); this is the short version. Please read the [code of conduct](https://github.com/mataneorg/matane/blob/main/CODE_OF_CONDUCT.md) first.

## Where things belong

| I want to…                                  | Go to                                                                                                                                           |
| ------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------- |
| Report a bug or suggest an idea for the app | [GitHub issues](https://github.com/mataneorg/matane/issues/new/choose), using the templates. Read [Diagnosis](/docs/guides/troubleshooting/diagnosis) first. |
| Report a vulnerability                      | Privately, as described in [SECURITY.md](https://github.com/mataneorg/matane/blob/main/SECURITY.md). Not in a public issue.                     |
| Ask for a site or a source                  | Not here. Matane ships no sources and does not suggest any. The request belongs to the repository of the extension that provides it.           |
| Write a source                              | [Writing extensions](/extensions/), [Templates](/extensions/templates) and [Publishing a repository](/extensions/repository).                   |
| Fix or improve the docs                     | Use **Help us improve this page** at the bottom of any page, or see below.                                                                      |
| Send a pull request                         | For anything bigger than a fix, open an issue first so the direction can be agreed before you write code.                                       |

## Set up the project

You need **Node 24** and **pnpm 12**, plus a C/C++ toolchain with Python for native modules. Then:

```sh
pnpm install      # also downloads Electron and rebuilds better-sqlite3 for it
pnpm dev          # the app with hot reload
```

Before you push: `pnpm lint && pnpm format:check && pnpm typecheck && pnpm test`. CI runs those and the e2e specs against a fake site, never against real sources.

## Commits and pull requests

- Use **Conventional Commits**: `feat:`, `fix:`, `docs:`, with an optional scope (`fix(reader): …`).
- Keep a pull request to one change. Say what it does and how you checked it.
- Every user-visible string goes through i18n and lives in both the English and the Indonesian locale.

## Working on these docs

The site is a [VitePress](https://vitepress.dev) project in [`apps/docs`](https://github.com/mataneorg/matane/tree/main/apps/docs). Pages are English Markdown.

```sh
pnpm --filter @manga-reader/docs dev       # dev server with hot reload
pnpm --filter @manga-reader/docs build     # static build, fails on a dead link
```

## License

The app is **GPL-3.0**. The packages extension authors depend on (`packages/extension-*`) are **MIT**, so extensions are not bound by the GPL. By contributing you agree that your change is licensed like the part of the repository it touches.

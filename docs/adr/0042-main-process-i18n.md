# 42. The main process speaks the user's language

Status: Accepted (2026-10-12).

## Context
Only the renderer had i18n (i18next, `en.json` and `id.json`). The main process says things to the user too: the tray menu, the notification for new chapters, the update notifications and Discord's status line, each with its own hand-written `language.startsWith('id') ? … : …`, and the messages of the `AppError`s it throws (repository and install failures), which reached the UI as English sentences.

## Decision
- **`main/i18n/` holds the main process's own catalogs** (`catalog.ts`): a typed `en` object and an `id` object typed `Record<CatalogKey, string>`, so a missing or extra key in `id` is a compile error; a unit test also checks the `{{placeholders}}`. `mainT(language, key, params)` takes the setting or an OS locale (`id`, `id-ID`, `en-US`; anything else is English), fills `{{name}}` and, when `params.count` is a number, picks `<key>_one` or `<key>_other` by the language's plural rules. The tray, the new-chapters notification, the updater's notifications and Discord's status use it.
- **Errors carry a key, not a translation.** `AppErrorData` gained an optional `key` (one of `MAIN_ERROR_KEYS` in `@manga-reader/shared/errors`) and `params`; `AppError.keyed(code, message, key, params)` raises one. `message` stays the English text, so logs, `lastError` in the database and the existing tests do not change, and an error without a key behaves as before. `toAppErrorData` drops a key it does not know (a newer main), so the English message is shown then.
- **The renderer translates.** `describeError` (and `useErrorText`) show `errors.main.<key>` with the params as the detail, falling back on the message. A test checks that every key has a text in both languages, that the catalogs hold nothing else and that the placeholders match.
- The repository and install errors (`repos.ts`, `installer.ts`, `fetch-bytes.ts`) were converted first; the technical detail of a failing parse or filesystem call is passed through unchanged, in English.

## Consequences
- A new user-visible text in main gets a key in the catalog; a new error gets a key in `MAIN_ERROR_KEYS` and texts in both locale files, and the test fails until both exist. A new language is added in `LANGUAGES`, `catalog.ts` and the locale files; the compiler and the tests point at what is missing.
- Failures listed per repository (`RepoInfo.lastError`) and `lastError` in the database still carry only the English message.
- Not every error is covered: extension runtime and download errors already have their own codes and texts in the renderer.

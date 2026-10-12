# Security policy

Matane runs third-party extensions in a sandbox (QuickJS in a separate process, network only through the app, over http(s)). Bugs that let an extension or a website escape that — read files, reach the local system, run code in the app — are security issues.

## Reporting

Please **do not open a public issue**. Report privately through GitHub: **Security → Report a vulnerability** on [mataneorg/matane](https://github.com/mataneorg/matane/security/advisories/new). Include the version (Settings → About), your OS, and steps or an extension that shows the problem. A proof of concept helps. GitHub private vulnerability reporting is the only official channel.

You should get an answer within a week; this is a small, volunteer project, so please give us a reasonable chance to fix the problem before you disclose it. Fixes ship in the next release; the advisory is published once users can update.

## Supported versions

Only the latest release gets security fixes: the newest 1.x version (and the latest beta, if it is newer). There are no long-term support branches.

## Scope

In scope: the app (`apps/desktop`), the extension sandbox and host API, the repository format and its verification, the installer and update path, and the published packages (`@matane/extension-sdk`, `-runtime`, `-templates`, `-cli`). Sandbox escapes, signature or hash bypasses, path traversal in archives, and a renderer that can reach things it should not are exactly the reports we want.

Out of scope: the content or behaviour of third-party extensions and repositories (report those to their authors), the sites a source reads from, and the warnings that come from the app being unsigned (see below).

## How the app protects you

A summary; the details are in the decision records [0003](docs/adr/0003-quickjs-extension-sandbox.md), [0022](docs/adr/0022-extension-repositories-and-trust.md), [0023](docs/adr/0023-extension-install-lifecycle.md) and [0031](docs/adr/0031-no-domain-allowlist.md).

- **Extensions are untrusted code.** Each one runs in its own QuickJS (WebAssembly) sandbox, in a separate process, with no `require`, `fetch`, `process`, file access or DOM. The only way out is the host API (`http`, `html`, `storage`, `prefs`, `log`, `crypto` and a few helpers), and every request goes through the app, which applies the scheme limits (http and https on every redirect), rate limits, a session of its own per extension, and checks on the results. Limits per extension: 64 MB of memory, 2 s of uninterrupted synchronous code, 30 s per call (60 s to list chapters). A runaway extension is stopped and reloaded without taking the app down. An extension can reach any website (ADR 0031), so trust rests on the repository you add.
- **Repositories are signed, and trust is your choice.** A repository is a static folder with an `index.json` signed with Ed25519 (`index.json.sig`). The app ships with no repository, extension or key and never suggests one. You decide whether to trust a key; an invalid signature is refused, and an unsigned or unverified repository can be added but is marked unverified. The signed index lists each archive's size and SHA-256, and each icon's.
- **Installs are checked and atomic.** Before anything is written, the archive is compared with the index; it may contain only `manifest.json`, `index.js` and `icon.png`; unsafe paths are refused. The files are written to a temporary folder and swapped in, and the previous version is restored if anything fails.
- **The renderer has no Node.** It runs sandboxed with context isolation and a content security policy, and talks to the main process through a typed IPC contract validated on every call. Images and covers come through the `manga://` protocol.
- **No telemetry.** The only traffic besides the sources you choose is the check for a new version on GitHub Releases and the tracker services you log in to. Secrets such as a proxy password or a tracker login are stored with the operating system's `safeStorage` and never sent to the renderer.

## What the app does not protect you from

- **Unsigned builds.** The Windows and macOS builds are not code-signed, so SmartScreen and Gatekeeper warn on first run. Download packages from the project's GitHub Releases only.
- **Trusting a bad key.** If you trust a repository's key, you trust the extensions it publishes: they are sandboxed, but they decide which sites the app talks to and what it shows you.
- **Content from sources.** The app shows what a source returns; it does not judge it.

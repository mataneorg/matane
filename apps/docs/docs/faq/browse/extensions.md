# Extensions

## What is an extension?

A small program that turns a website into one or more **sources**. It runs in a sandbox: it cannot read your files, and every request goes through Matane. See [Extensions and repositories](/docs/guides/extensions).

## Where do I get extensions?

From a **repository** whose address someone publishes. Matane ships none and suggests none. See [Adding sources](/docs/guides/getting-started#adding-sources).

## What does "trusted" mean?

Every repository index is signed. **Trusted** means it is signed with a key you chose to trust when adding it. **Unverified** means no signature you know: Matane asks before adding it and warns before every install from it.

## Is it safe?

Every downloaded extension must match the signed checksum before anything is written to disk, and extensions cannot read your files. But an extension can make requests to any website and sees what you browse in its sources, so add only repositories you trust.

## How do I update an extension?

On the **Extensions** page; **Update all** installs every update. **Settings, Browse & extensions** can update extensions by themselves after a repository sync.

## What happens to my library if I uninstall an extension?

Nothing is deleted: its manga stay as "source not installed" until you install it again. Uninstalling removes the extension's settings, data and cookies.

## A source stopped working. What do I do?

See [Troubleshooting](/docs/guides/troubleshooting/common-issues#a-source-shows-an-error-or-no-chapters). Short version: update the extension.

## How do I write my own extension?

Read [Writing extensions](/extensions/) and [Templates](/extensions/templates).

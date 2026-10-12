/** Which rows the right-click menu of an installed extension shows. Logs, Copy ID and the removal are always there. */
export function installedMenuRows(extension: {
  origin: 'builtin' | 'repo' | 'dev';
  broken: boolean;
  hasUpdate: boolean;
}) {
  return {
    update: extension.hasUpdate,
    reload: extension.origin === 'dev',
    preferences: !extension.broken,
    uninstall: extension.origin === 'repo',
    removeFolder: extension.origin === 'dev',
  };
}

/** Which rows the menu of an extension a repository offers shows. One installed from another repository only updates there. */
export function availableMenuRows(item: { update: boolean; elsewhere: boolean }) {
  return { action: !item.elsewhere, update: item.update };
}

/** Which rows the menu of a repository shows: the key can be trusted only when the repository signed with an unknown one. */
export function repoMenuRows(repo: { problem: string | null }) {
  return { trust: repo.problem === 'unknown-key' };
}

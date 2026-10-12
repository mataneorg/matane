import { describe, expect, it } from 'vitest';
import { availableMenuRows, installedMenuRows, repoMenuRows } from './menus';

describe('installedMenuRows', () => {
  it('lets a repository extension be updated and uninstalled, and a developer folder be reloaded and removed', () => {
    expect(installedMenuRows({ origin: 'repo', broken: false, hasUpdate: true })).toEqual({
      update: true,
      reload: false,
      preferences: true,
      uninstall: true,
      removeFolder: false,
    });
    expect(installedMenuRows({ origin: 'dev', broken: false, hasUpdate: false })).toEqual({
      update: false,
      reload: true,
      preferences: true,
      uninstall: false,
      removeFolder: true,
    });
  });

  it('has no preferences for a broken extension and nothing to remove for a built-in one', () => {
    const rows = installedMenuRows({ origin: 'builtin', broken: true, hasUpdate: false });
    expect(rows.preferences).toBe(false);
    expect(rows.uninstall || rows.removeFolder).toBe(false);
  });
});

describe('availableMenuRows', () => {
  it('has no install for an extension installed from another repository', () => {
    expect(availableMenuRows({ update: false, elsewhere: true }).action).toBe(false);
    expect(availableMenuRows({ update: true, elsewhere: false })).toEqual({ action: true, update: true });
  });
});

describe('repoMenuRows', () => {
  it('offers to trust the key only for an unknown one', () => {
    expect(repoMenuRows({ problem: 'unknown-key' }).trust).toBe(true);
    expect(repoMenuRows({ problem: null }).trust).toBe(false);
    expect(repoMenuRows({ problem: 'changed-key' }).trust).toBe(false);
  });
});

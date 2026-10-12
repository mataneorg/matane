import { type Page, expect, test } from '@playwright/test';
import { type TestApp, launchApp } from './support/app';

// Right-click menus (ADR 0039 onwards): library cards and category tabs, cards in a listing, and sources. One app
// session against the fake site.
test.describe.configure({ mode: 'serial' });

let t: TestApp;
let page: Page;

const goto = (hash: string) => page.evaluate((h) => (location.hash = h), hash);
const api = <T>(channel: string, input?: unknown) =>
  page.evaluate(
    ([c, i]) => (window.api.invoke as (channel: string, input?: unknown) => Promise<unknown>)(c as string, i),
    [channel, input] as const,
  ) as Promise<T>;
const libraryItems = () => page.getByTestId('library-item');
const menuItem = (name: string) => page.getByRole('menuitem', { name });
const mangaIdOf = async (title: string) => {
  const result = await api<{ items: { mangaId: number; title: string }[] }>('sources.browse', {
    sourceId: 'e2e-demo/en',
    kind: 'search',
    page: 1,
    query: title,
  });
  return result.items.find((i) => i.title === title)!.mangaId;
};

test.beforeAll(async () => {
  t = await launchApp();
  page = t.page;
  const hero = await mangaIdOf('Paged Hero');
  const garden = await mangaIdOf('Scroll Garden');
  await api('manga.refresh', { mangaId: hero });
  await api('library.add', { mangaId: hero, categoryIds: [] });
  await api('library.add', { mangaId: garden, categoryIds: [] });
  await api('categories.create', { name: 'Favourites' });
  await api('categories.create', { name: 'Later' });
});

test.afterAll(async () => {
  await t?.close();
});

test('a library card offers the actions of its manga, and Mark as read marks them', async () => {
  await goto('#/library');
  const hero = page.locator('[data-testid="library-item"][title="Paged Hero"]');
  await expect(hero.getByTitle('4 unread chapters')).toBeVisible();
  await hero.click({ button: 'right' });
  for (const name of [
    'Open',
    'Mark as read',
    'Mark as unread',
    'Set categories',
    'Migrate',
    'Select',
    'Remove from library',
  ]) {
    await expect(menuItem(name)).toBeVisible();
  }
  await menuItem('Mark as read').click();
  await expect(hero.getByTitle(/unread chapter/)).toHaveCount(0);
});

test('the menu of a selected card acts on the whole selection and leaves out the single-manga rows', async () => {
  await libraryItems()
    .first()
    .click({ modifiers: ['Control'] });
  await libraryItems()
    .nth(1)
    .click({ modifiers: ['Control'] });
  await libraryItems().first().click({ button: 'right' });
  await expect(menuItem('Mark as unread')).toBeVisible();
  await expect(menuItem('Open')).toHaveCount(0);
  await expect(menuItem('Migrate')).toHaveCount(0);
  await page.keyboard.press('Escape');
  await page.keyboard.press('Escape');
});

test('removing from the menu asks first and takes the manga out of the library', async () => {
  const garden = page.locator('[data-testid="library-item"][title="Scroll Garden"]');
  await garden.click({ button: 'right' });
  await menuItem('Remove from library').click();
  await page.getByRole('alertdialog').getByRole('button', { name: 'Remove' }).click();
  await expect(libraryItems()).toHaveCount(1);
});

test('a category tab can be renamed and moved from its menu', async () => {
  const tabs = page.getByRole('tablist');
  await tabs.getByRole('tab', { name: /Later/ }).click({ button: 'right' });
  await menuItem('Move left').click();
  await expect(tabs.getByRole('tab').nth(1)).toContainText('Later');

  await tabs.getByRole('tab', { name: /Later/ }).click({ button: 'right' });
  await menuItem('Rename').click();
  await page.getByRole('dialog').getByRole('textbox').fill('Someday');
  await page.getByRole('dialog').getByRole('button', { name: 'Save' }).click();
  await expect(tabs.getByRole('tab', { name: /Someday/ })).toBeVisible();
});

test('a card in a listing offers to add it to the library', async () => {
  await goto('#/browse/sources/e2e-demo/en?tab=search&q=garden');
  const card = page.locator('main a[title="Scroll Garden"]').first();
  await card.click({ button: 'right' });
  await menuItem('Add to library').click();
  await expect(card).toContainText('In library');
});

test('a source row opens its menu and pins from it', async () => {
  await goto('#/browse/sources');
  const row = page.getByRole('listitem').filter({ hasText: 'E2E Demo' }).first();
  await row.click({ button: 'right' });
  await expect(menuItem('Open source')).toBeVisible();
  await menuItem('Pin').click();
  await expect(page.getByRole('heading', { name: /Pinned/i })).toBeVisible();
});

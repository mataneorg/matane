import { LANGUAGES } from '@manga-reader/shared';
import { describe, expect, it } from 'vitest';
import { en, id } from './catalog';
import { mainLanguage, mainT } from '.';

describe('the main-process catalogs', () => {
  it('have exactly the same keys in every language', () => {
    expect(Object.keys(id).sort()).toEqual(Object.keys(en).sort());
  });

  it('have no empty text, and the same placeholders in every language', () => {
    const placeholders = (text: string) => [...text.matchAll(/\{\{(\w+)\}\}/g)].map((match) => match[1]).sort();
    for (const key of Object.keys(en) as (keyof typeof en)[]) {
      expect(id[key], key).not.toBe('');
      expect(placeholders(id[key]), key).toEqual(placeholders(en[key]));
    }
  });

  it('cover every language the app offers', () => {
    for (const language of LANGUAGES) expect(mainT(language, 'tray.quit')).not.toBe('tray.quit');
  });
});

describe('mainLanguage', () => {
  it('maps a setting or an OS locale to a catalog, English for anything else', () => {
    expect(mainLanguage('id')).toBe('id');
    expect(mainLanguage('id-ID')).toBe('id');
    expect(mainLanguage('en-US')).toBe('en');
    expect(mainLanguage('ja')).toBe('en');
  });
});

describe('mainT', () => {
  it('fills in placeholders', () => {
    expect(mainT('en', 'notify.newChapters.title', { count: 5, manga: 3 })).toBe('5 new chapters from 3 manga');
    expect(mainT('id', 'updater.ready.title', { version: '1.2.0' })).toBe('Matane 1.2.0 siap dipasang');
  });

  it('picks the plural form by the language', () => {
    expect(mainT('en', 'tray.paused', { count: 1 })).toBe('1 download paused');
    expect(mainT('en', 'tray.paused', { count: 2 })).toBe('2 downloads paused');
    expect(mainT('id-ID', 'tray.paused', { count: 1 })).toBe('1 download dijeda');
  });

  it('leaves a placeholder it has no value for, and does not touch values that look like placeholders', () => {
    expect(mainT('en', 'notify.newChapters.title', { count: 2 })).toBe('2 new chapters from {{manga}} manga');
    expect(mainT('en', 'notify.newChapters.title', { count: 2, manga: '{{count}}' })).toBe(
      '2 new chapters from {{count}} manga',
    );
  });

  it('answers a key without a plural form as it is', () => {
    expect(mainT('id', 'tray.pause')).toBe('Jeda download');
  });
});

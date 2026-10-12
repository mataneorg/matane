import { MAIN_ERROR_KEYS } from '@manga-reader/shared/errors';
import { describe, expect, it } from 'vitest';
import en from '../i18n/locales/en.json';
import id from '../i18n/locales/id.json';

const lookup = (catalog: unknown, key: string): unknown =>
  key.split('.').reduce<unknown>((node, part) => (node as Record<string, unknown> | undefined)?.[part], catalog);

describe('texts for errors raised by the main process', () => {
  it('exist in English and Indonesian for every key main can send', () => {
    for (const key of MAIN_ERROR_KEYS) {
      for (const catalog of [en.errors.main, id.errors.main]) {
        expect(typeof lookup(catalog, key), key).toBe('string');
      }
    }
  });

  it('hold nothing main cannot send', () => {
    const keys = (node: Record<string, unknown>, prefix = ''): string[] =>
      Object.entries(node).flatMap(([name, value]) =>
        typeof value === 'string' ? [`${prefix}${name}`] : keys(value as Record<string, unknown>, `${prefix}${name}.`),
      );
    for (const catalog of [en.errors.main, id.errors.main]) {
      expect(keys(catalog).sort()).toEqual([...MAIN_ERROR_KEYS].sort());
    }
  });

  it('use the same placeholders in both languages', () => {
    const placeholders = (text: string) => [...text.matchAll(/\{\{(\w+)\}\}/g)].map((match) => match[1]).sort();
    for (const key of MAIN_ERROR_KEYS) {
      expect(placeholders(lookup(id.errors.main, key) as string), key).toEqual(
        placeholders(lookup(en.errors.main, key) as string),
      );
    }
  });
});

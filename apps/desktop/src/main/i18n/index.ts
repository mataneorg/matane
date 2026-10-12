import type { Language } from '@manga-reader/shared';
import { type CatalogKey, en, id } from './catalog';

const catalogs: Record<Language, Record<CatalogKey, string>> = { en, id };

type PluralSuffix = '_one' | '_other';
/** A key as callers write it: the plural forms of `a_one` and `a_other` are asked for as `a`. */
export type MainKey = CatalogKey extends infer K ? (K extends `${infer Base}${PluralSuffix}` ? Base : K) : never;

export type MainParams = Record<string, string | number>;

/** The catalog for a language setting or an OS locale such as "id-ID" or "en-US"; anything else is English. */
export function mainLanguage(language: string): Language {
  return language.startsWith('id') ? 'id' : 'en';
}

/**
 * Looks `key` up in the catalog of `language` and fills in `{{name}}` placeholders. A `count` param picks the plural
 * form by the language's own rules. Nothing escapes: the text goes to the OS, not to HTML.
 */
export function mainT(language: string, key: MainKey, params: MainParams = {}): string {
  const code = mainLanguage(language);
  const catalog = catalogs[code];
  const plural =
    typeof params['count'] === 'number'
      ? new Intl.PluralRules(code).select(params['count']) === 'one'
        ? 'one'
        : 'other'
      : null;
  const template = plural === null ? undefined : catalog[`${key}_${plural}` as CatalogKey];
  const text = template ?? catalog[key as CatalogKey] ?? en[key as CatalogKey] ?? key;
  return text.replace(/\{\{(\w+)\}\}/g, (match, name: string) => (name in params ? String(params[name]) : match));
}

// URL rules for the two languages: English at the root, Korean under /ko,
// with no trailing slash (vercel.json and astro.config.mjs).
import { describe, expect, it } from 'vitest';
import {
  LOCALES,
  TRANSLATED_PATHS,
  alternatePaths,
  homeSectionHref,
  languageLinkPath,
  localeOf,
  localizePath,
  unlocalizePath,
} from '../src/lib/i18n';

describe('localizePath', () => {
  it('leaves English paths at the root', () => {
    expect(localizePath('/', 'en')).toBe('/');
    expect(localizePath('/request-sent', 'en')).toBe('/request-sent');
  });

  it('puts Korean paths under /ko, with no trailing slash', () => {
    expect(localizePath('/', 'ko')).toBe('/ko');
    expect(localizePath('/request-sent', 'ko')).toBe('/ko/request-sent');
  });
});

describe('localeOf and unlocalizePath', () => {
  it('reads the locale from the prefix and strips it', () => {
    for (const [pathname, locale, path] of [
      ['/', 'en', '/'],
      ['/request-sent', 'en', '/request-sent'],
      ['/ko', 'ko', '/'],
      ['/ko/request-sent', 'ko', '/request-sent'],
    ] as const) {
      expect(localeOf(pathname)).toBe(locale);
      expect(unlocalizePath(pathname)).toBe(path);
    }
  });

  it('only matches a whole path segment', () => {
    expect(localeOf('/kokua')).toBe('en');
    expect(unlocalizePath('/kokua')).toBe('/kokua');
  });

  it('round-trips every translated path in every locale', () => {
    for (const path of TRANSLATED_PATHS) {
      for (const locale of LOCALES) {
        const localized = localizePath(path, locale);
        expect(localeOf(localized)).toBe(locale);
        expect(unlocalizePath(localized)).toBe(path);
      }
    }
  });
});

describe('alternatePaths', () => {
  it('lists the page in every locale when it is translated', () => {
    expect(alternatePaths('/')).toEqual([
      { locale: 'en', path: '/' },
      { locale: 'ko', path: '/ko' },
    ]);
  });

  it('is empty for a page that exists in one language only', () => {
    expect(alternatePaths('/request-sent')).toEqual([]);
  });
});

describe('languageLinkPath', () => {
  it('goes to the same page in the other language when there is one', () => {
    expect(languageLinkPath('/', 'ko')).toBe('/ko');
    expect(languageLinkPath('/', 'en')).toBe('/');
  });

  it('falls back to the other language’s home page', () => {
    expect(languageLinkPath('/request-sent', 'ko')).toBe('/ko');
  });
});

describe('homeSectionHref', () => {
  it('points at the section on that language’s home page', () => {
    expect(homeSectionHref('contact', 'en')).toBe('/#contact');
    expect(homeSectionHref('contact', 'ko')).toBe('/ko#contact');
  });
});

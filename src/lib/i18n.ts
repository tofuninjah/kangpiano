// The site's languages. English lives at the root and Korean under /ko, so
// every page has one fixed URL per language. Pages pass their locale to
// BaseLayout; nothing is guessed from the browser's language, so a
// bilingual visitor always gets the page they opened.

export const LOCALES = ['en', 'ko'] as const;
export type Locale = (typeof LOCALES)[number];

export const DEFAULT_LOCALE: Locale = 'en';

interface LocaleDetails {
  /** BCP 47 tag, for lang and hreflang. */
  tag: string;
  /** Open Graph locale. */
  og: string;
  /** URL prefix; empty for the default locale. */
  prefix: string;
  /** The language's name in that language, for the language link. */
  name: string;
}

export const LOCALE_DETAILS: Record<Locale, LocaleDetails> = {
  en: { tag: 'en', og: 'en_US', prefix: '', name: 'English' },
  ko: { tag: 'ko', og: 'ko_KR', prefix: '/ko', name: '한국어' },
};

/**
 * Pages that exist in every locale, by their path without a prefix. Only
 * these get hreflang tags; the language link on any other page goes to the
 * other language's home page.
 */
export const TRANSLATED_PATHS: readonly string[] = [
  '/',
  '/request-sent',
  '/request-not-sent',
];

/** Narrows an untrusted string, such as a form field, to a known locale. */
export function isLocale(value: string): value is Locale {
  return (LOCALES as readonly string[]).includes(value);
}

/** '/' in Korean is '/ko'; '/request-sent' is '/ko/request-sent'. */
export function localizePath(path: string, locale: Locale): string {
  const { prefix } = LOCALE_DETAILS[locale];
  if (!prefix) return path;
  return path === '/' ? prefix : `${prefix}${path}`;
}

/** The locale whose prefix starts the pathname, matching whole segments. */
export function localeOf(pathname: string): Locale {
  const match = LOCALES.find((locale) => {
    const { prefix } = LOCALE_DETAILS[locale];
    return (
      prefix !== '' &&
      (pathname === prefix || pathname.startsWith(`${prefix}/`))
    );
  });
  return match ?? DEFAULT_LOCALE;
}

/** The pathname without its locale prefix: '/ko/request-sent' → '/request-sent'. */
export function unlocalizePath(pathname: string): string {
  const { prefix } = LOCALE_DETAILS[localeOf(pathname)];
  if (!prefix) return pathname;
  return pathname.slice(prefix.length) || '/';
}

/** The page's path in every locale, or none if it isn't translated. */
export function alternatePaths(
  path: string
): { locale: Locale; path: string }[] {
  if (!TRANSLATED_PATHS.includes(path)) return [];
  return LOCALES.map((locale) => ({
    locale,
    path: localizePath(path, locale),
  }));
}

/** Where a link to another language goes: the same page, or its home page. */
export function languageLinkPath(path: string, locale: Locale): string {
  return localizePath(TRANSLATED_PATHS.includes(path) ? path : '/', locale);
}

/** A link to a section of the home page in the given language. */
export function homeSectionHref(section: string, locale: Locale): string {
  return `${localizePath('/', locale)}#${section}`;
}

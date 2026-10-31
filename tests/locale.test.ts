// What each page tells browsers and search engines about its language:
// <html lang> matches the URL, translated pages point at each other with
// hreflang, the header links to the other language, and the Korean page
// carries no leftover English.
import { experimental_AstroContainer as AstroContainer } from 'astro/container';
import { beforeAll, describe, expect, it } from 'vitest';
import config from '../astro.config.mjs';
import { copy } from '../src/data/copy';
import {
  LOCALES,
  LOCALE_DETAILS,
  TRANSLATED_PATHS,
  localeOf,
  localizePath,
} from '../src/lib/i18n';
import { allTowns } from '../src/lib/schedule';

const siteUrl = config.site!;

// Every page component, keyed by the path it's served at.
const pages = Object.entries(
  import.meta.glob('../src/pages/**/*.astro', {
    eager: true,
    import: 'default',
  })
).map(([file, page]) => {
  const name = file.replace('../src/pages/', '').replace(/\.astro$/, '');
  return { path: `/${name.replace(/(^|\/)index$/, '')}`, page };
});

const html: Record<string, string> = {};

beforeAll(async () => {
  const container = await AstroContainer.create({
    astroConfig: { site: siteUrl },
  });
  for (const { path, page } of pages) {
    // The glob is typed unknown; every match is an .astro page component.
    html[path] = await container.renderToString(
      page as Parameters<typeof container.renderToString>[0],
      { request: new Request(`${siteUrl}${path}`) }
    );
  }
});

function attrs(tag: string): Record<string, string> {
  return Object.fromEntries(
    [...tag.matchAll(/([\w:-]+)="([^"]*)"/g)].map((m) => [m[1]!, m[2]!])
  );
}

function hreflangs(page: string) {
  return [...page.matchAll(/<link rel="alternate"[^>]*>/g)].map((m) =>
    attrs(m[0])
  );
}

/** Links that switch language: the only <a> elements with hreflang. */
function languageLinks(page: string) {
  return [
    ...page.matchAll(/<a\b([^>]*\bhreflang="[^"]*"[^>]*)>([^<]*)<\/a>/g),
  ].map((m) => {
    const { href, lang, hreflang } = attrs(m[1]!);
    return { href, lang, hreflang, text: m[2]!.trim() };
  });
}

const translated = LOCALES.flatMap((locale) =>
  TRANSLATED_PATHS.map((path) => ({
    locale,
    path,
    url: localizePath(path, locale),
  }))
);

describe('page language', () => {
  it('has a Korean home page', () => {
    expect(Object.keys(html)).toContain('/ko');
  });

  it('sets <html lang> from the locale its URL belongs to', () => {
    for (const { path } of pages) {
      const lang = LOCALE_DETAILS[localeOf(path)].tag;
      expect(html[path], path).toContain(`<html lang="${lang}"`);
    }
  });

  it('sets og:locale from the locale its URL belongs to', () => {
    for (const { path } of pages) {
      const og = LOCALE_DETAILS[localeOf(path)].og;
      expect(html[path], path).toContain(
        `<meta property="og:locale" content="${og}">`
      );
    }
  });

  it('names the Korean home page’s own URL as canonical', () => {
    expect(html['/ko']).toContain(
      `<link rel="canonical" href="${siteUrl}/ko">`
    );
  });
});

describe('hreflang', () => {
  it('lists every language and an English x-default on each translated page', () => {
    for (const { url, path } of translated) {
      const expected = [
        ...LOCALES.map((locale) => ({
          rel: 'alternate',
          hreflang: LOCALE_DETAILS[locale].tag,
          href: new URL(localizePath(path, locale), siteUrl).href,
        })),
        {
          rel: 'alternate',
          hreflang: 'x-default',
          href: new URL(localizePath(path, 'en'), siteUrl).href,
        },
      ];
      expect(hreflangs(html[url]!), url).toEqual(expected);
    }
  });

  it('names the other languages as og:locale:alternate on translated pages', () => {
    for (const { url, locale } of translated) {
      const others = LOCALES.filter((other) => other !== locale).map(
        (other) =>
          `<meta property="og:locale:alternate" content="${LOCALE_DETAILS[other].og}">`
      );
      for (const tag of others) expect(html[url], url).toContain(tag);
    }
  });

  it('is left off pages that exist in one language only', () => {
    const translatedUrls = new Set(translated.map(({ url }) => url));
    for (const { path } of pages.filter((p) => !translatedUrls.has(p.path))) {
      expect(hreflangs(html[path]!), path).toEqual([]);
      expect(html[path], path).not.toContain('og:locale:alternate');
    }
  });
});

describe('language link', () => {
  it('goes from the English home page to the Korean one, marked as Korean', () => {
    expect(languageLinks(html['/']!)).toEqual([
      { href: '/ko', lang: 'ko', hreflang: 'ko', text: '한국어' },
    ]);
  });

  it('goes from the Korean home page to the English one, marked as English', () => {
    expect(languageLinks(html['/ko']!)).toEqual([
      { href: '/', lang: 'en', hreflang: 'en', text: 'English' },
    ]);
  });

  it('goes to the other language’s home page from an untranslated page', () => {
    expect(languageLinks(html['/request-sent']!)).toEqual([
      { href: '/ko', lang: 'ko', hreflang: 'ko', text: '한국어' },
    ]);
  });
});

describe('Korean home page', () => {
  // Latin text the Korean page is allowed to show: the English town names
  // beside the Hangul in the schedule, and the link to the English page.
  const ALLOWED = [...allTowns(), LOCALE_DETAILS.en.name];

  /** Visible text, alt text and aria-labels, outside the contact form. */
  function readable(page: string): string[] {
    const body = page
      .replace(/<!--[\s\S]*?-->/g, '')
      .replace(/<head>[\s\S]*?<\/head>/, '')
      .replace(/<script[\s\S]*?<\/script>/g, '')
      .replace(/<style[\s\S]*?<\/style>/g, '')
      // English on both pages until the Korean form copy is in.
      .replace(/<section\s[^>]*id="contact"[\s\S]*?<\/section>/, '');
    const attributes = [
      ...body.matchAll(/\b(?:alt|aria-label)="([^"]*)"/g),
    ].map((m) => m[1]!);
    // Tags end at the first > outside quotes; class values such as
    // [&>p]:mb-5 contain one.
    const tag = /<(?:[^>"']|"[^"]*"|'[^']*')*>/g;
    // Decorative numerals in the schedule (I., II.) are aria-hidden.
    const text = body
      .replace(/<span aria-hidden="true"[^>]*>\s*[IVX]+\.\s*<\/span>/g, '')
      .replace(tag, ' ');
    return [text, ...attributes];
  }

  it('has a contact form to leave out', () => {
    expect(html['/ko']).toMatch(/<section\s[^>]*id="contact"/);
  });

  it('shows no English outside the contact form, apart from names', () => {
    const english = readable(html['/ko']!).flatMap((chunk) => {
      let rest = chunk;
      for (const word of ALLOWED) rest = rest.replaceAll(word, '');
      return rest.match(/[A-Za-z]{2,}/g) ?? [];
    });
    expect(english).toEqual([]);
  });

  it('uses the Korean title and description', () => {
    expect(html['/ko']).toContain(`<title>${copy.ko.meta.title}</title>`);
    expect(html['/ko']).toContain(
      `<meta name="description" content="${copy.ko.meta.description}">`
    );
    expect(html['/ko']).toContain(
      `<meta property="og:site_name" content="${copy.ko.meta.siteName}">`
    );
  });
});

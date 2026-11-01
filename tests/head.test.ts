// What the pages tell browsers and search engines: structured data built
// from the site and schedule data, social tags, canonical URLs, icons and the
// CSP config. Sitemap and robots.txt are in seo.test.ts.
import { experimental_AstroContainer as AstroContainer } from 'astro/container';
import { beforeAll, describe, expect, it } from 'vitest';
import config from '../astro.config.mjs';
import { copy } from '../src/data/copy';
import { site } from '../src/data/site';
import { LOCALES } from '../src/lib/i18n';
import { allTowns } from '../src/lib/schedule';
import {
  localBusinessJsonLd,
  toJsonLdScript,
} from '../src/lib/structured-data';
import IndexPage from '../src/pages/index.astro';
import KoreanIndexPage from '../src/pages/ko/index.astro';
import RequestSent from '../src/pages/request-sent.astro';

const siteUrl = config.site!;
let home: string;
let koreanHome: string;
let resultPage: string;

beforeAll(async () => {
  const container = await AstroContainer.create({
    astroConfig: { site: siteUrl },
  });
  home = await container.renderToString(IndexPage);
  koreanHome = await container.renderToString(KoreanIndexPage, {
    request: new Request(`${siteUrl}/ko`),
  });
  // The container renders at "/" unless told the page's URL.
  resultPage = await container.renderToString(RequestSent, {
    request: new Request(`${siteUrl}/request-sent`),
  });
});

function jsonLd(html: string): unknown[] {
  return [
    ...html.matchAll(
      /<script type="application\/ld\+json">([\s\S]*?)<\/script>/g
    ),
  ].map((match) => JSON.parse(match[1]!));
}

describe('structured data', () => {
  it('lists exactly the schedule’s towns and the site phone, with no address', () => {
    for (const locale of LOCALES) {
      const data = localBusinessJsonLd(locale);
      expect(data.areaServed.map((place) => place.name)).toEqual(allTowns());
      expect(data.telephone).toBe(site.phone.href.replace('tel:', ''));
      expect(data).not.toHaveProperty('address');
      expect(data).not.toHaveProperty('url');
      expect(data).not.toHaveProperty('@id');
    }
  });

  it('is rendered once on each home page and nowhere else', () => {
    expect(jsonLd(home)).toEqual([localBusinessJsonLd('en', siteUrl)]);
    expect(jsonLd(koreanHome)).toEqual([localBusinessJsonLd('ko', siteUrl)]);
    expect(jsonLd(resultPage)).toEqual([]);
  });

  it('describes one business, in each page’s language', () => {
    const en = localBusinessJsonLd('en', siteUrl);
    const ko = localBusinessJsonLd('ko', siteUrl);
    expect(en['@id']).toBe(`${siteUrl}/#business`);
    expect(ko['@id']).toBe(en['@id']);
    expect(en.url).toBe(`${siteUrl}/`);
    expect(ko.url).toBe(`${siteUrl}/ko`);
    for (const [data, locale] of [
      [en, 'en'],
      [ko, 'ko'],
    ] as const) {
      expect(data.name).toBe(copy[locale].meta.siteName);
      expect(data.description).toBe(copy[locale].meta.description);
      expect(data.knowsLanguage).toEqual(['en', 'ko']);
    }
    expect(en.founder).toEqual({ '@type': 'Person', name: site.name });
    expect(ko.founder).toEqual({
      '@type': 'Person',
      name: copy.ko.name,
      alternateName: site.name,
    });
  });

  it('cannot close its script element early', () => {
    const script = toJsonLdScript({
      name: '</script><script>alert(1)</script>',
    });
    expect(script).not.toContain('<');
    expect(JSON.parse(script).name).toBe('</script><script>alert(1)</script>');
  });
});

describe('head tags', () => {
  it('carries Open Graph basics and both icons', () => {
    for (const tag of [
      '<meta property="og:type" content="website">',
      `<meta property="og:title" content="${site.title.replace('&', '&amp;')}">`,
      '<meta name="twitter:card" content="summary">',
      '<link rel="icon" href="/favicon.svg" type="image/svg+xml">',
      '<link rel="apple-touch-icon" href="/apple-touch-icon.png">',
    ]) {
      expect(home).toContain(tag);
    }
  });

  it('points canonical and og:url at the production domain', () => {
    expect(siteUrl).toBe('https://www.kangpiano.com');
    for (const [page, url] of [
      [home, `${siteUrl}/`],
      [resultPage, `${siteUrl}/request-sent`],
    ] as const) {
      expect(page).toContain(`<link rel="canonical" href="${url}">`);
      expect(page).toContain(`<meta property="og:url" content="${url}">`);
    }
  });
});

describe('content security policy', () => {
  const csp = config.security?.csp;
  const directives =
    typeof csp === 'object' && csp !== null ? (csp.directives ?? []) : [];

  it('is on, with restrictive defaults', () => {
    expect(directives).toEqual(
      expect.arrayContaining([
        "default-src 'self'",
        "object-src 'none'",
        "base-uri 'self'",
        "form-action 'self'",
      ])
    );
  });

  it('never allows unsafe-inline or unsafe-eval', () => {
    expect(directives.join(' ')).not.toMatch(/unsafe-(inline|eval)/);
  });
});

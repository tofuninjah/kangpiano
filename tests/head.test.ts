// What the pages tell browsers and search engines: structured data built
// from the site and schedule data, social tags, icons, the CSP config, and a
// robots.txt that keeps the noindex pages crawlable.
import { experimental_AstroContainer as AstroContainer } from 'astro/container';
import { beforeAll, describe, expect, it } from 'vitest';
import config from '../astro.config.mjs';
import { site } from '../src/data/site';
import { allTowns } from '../src/lib/schedule';
import {
  localBusinessJsonLd,
  toJsonLdScript,
} from '../src/lib/structured-data';
import IndexPage from '../src/pages/index.astro';
import RequestSent from '../src/pages/request-sent.astro';
import robots from '../public/robots.txt?raw';

let home: string;
let resultPage: string;

beforeAll(async () => {
  const container = await AstroContainer.create();
  home = await container.renderToString(IndexPage);
  resultPage = await container.renderToString(RequestSent);
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
    const data = localBusinessJsonLd();
    expect(data.areaServed.map((place) => place.name)).toEqual(allTowns());
    expect(data.telephone).toBe(site.phone.href.replace('tel:', ''));
    expect(data).not.toHaveProperty('address');
    expect(data).not.toHaveProperty('url');
  });

  it('is rendered once on the home page and nowhere else', () => {
    expect(jsonLd(home)).toEqual([localBusinessJsonLd()]);
    expect(jsonLd(resultPage)).toEqual([]);
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

  it('leaves out absolute-URL tags until a site domain is set', () => {
    expect(config.site).toBeUndefined();
    expect(home).not.toContain('rel="canonical"');
    expect(home).not.toContain('og:url');
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

describe('robots.txt', () => {
  it('lets crawlers in, including the noindex result pages', () => {
    expect(robots).toMatch(/^User-agent: \*$/m);
    expect(robots).toMatch(/^Allow: \/$/m);
    expect(robots).not.toMatch(/^Disallow:/m);
  });
});

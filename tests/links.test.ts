// The header, menu and call bar render on every page, including the form
// result pages, so their section links have to work from all of them.
import { experimental_AstroContainer as AstroContainer } from 'astro/container';
import { beforeAll, describe, expect, it } from 'vitest';
import IndexPage from '../src/pages/index.astro';
import RequestNotSent from '../src/pages/request-not-sent.astro';
import RequestSent from '../src/pages/request-sent.astro';

const pages = {
  '/': IndexPage,
  '/request-sent': RequestSent,
  '/request-not-sent': RequestNotSent,
};
const html: Record<string, string> = {};

beforeAll(async () => {
  const container = await AstroContainer.create();
  for (const [path, page] of Object.entries(pages)) {
    html[path] = await container.renderToString(page);
  }
});

const hrefs = (page: string) =>
  [...page.matchAll(/<a\b[^>]*\bhref="([^"]*)"/g)].map((match) => match[1]!);
const ids = (page: string) =>
  new Set([...page.matchAll(/\bid="([^"]+)"/g)].map((match) => match[1]!));

describe('section links', () => {
  for (const path of Object.keys(pages)) {
    it(`on ${path}, every same-page link has a target on that page`, () => {
      const targets = ids(html[path]!);
      const missing = hrefs(html[path]!)
        .filter((href) => href.startsWith('#'))
        .filter((href) => !targets.has(href.slice(1)));
      expect(missing).toEqual([]);
    });

    it(`on ${path}, every home-page section link has a target on the home page`, () => {
      const targets = ids(html['/']!);
      const missing = hrefs(html[path]!)
        .filter((href) => href.startsWith('/#'))
        .filter((href) => !targets.has(href.slice(2)));
      expect(missing).toEqual([]);
    });
  }
});

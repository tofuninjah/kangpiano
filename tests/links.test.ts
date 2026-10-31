// The header, menu and call bar render on every page, including the form
// result pages, so their section links have to work from all of them. Each
// language has its own home page, and a section link must land on the home
// page it names.
import { experimental_AstroContainer as AstroContainer } from 'astro/container';
import { beforeAll, describe, expect, it } from 'vitest';
import { localeOf } from '../src/lib/i18n';
import { pages } from './pages';

const homes = ['/', '/ko'];
const html: Record<string, string> = {};

beforeAll(async () => {
  const container = await AstroContainer.create();
  for (const { path, page } of pages) {
    // The glob is typed unknown; every match is an .astro page component.
    html[path] = await container.renderToString(
      page as Parameters<typeof container.renderToString>[0],
      { request: new Request(`http://localhost${path}`) }
    );
  }
});

const hrefs = (page: string) =>
  [...page.matchAll(/<a\b[^>]*\bhref="([^"]*)"/g)].map((match) => match[1]!);
const ids = (page: string) =>
  new Set([...page.matchAll(/\bid="([^"]+)"/g)].map((match) => match[1]!));

describe('section links', () => {
  for (const { path } of pages) {
    it(`on ${path}, every same-page link has a target on that page`, () => {
      const targets = ids(html[path]!);
      const missing = hrefs(html[path]!)
        .filter((href) => href.startsWith('#'))
        .filter((href) => !targets.has(href.slice(1)));
      expect(missing).toEqual([]);
    });

    it(`on ${path}, every home-page section link has a target on that home page`, () => {
      const missing = hrefs(html[path]!)
        .map((href) => href.match(/^(\/[^#]*)#(.+)$/))
        .filter((match) => match !== null)
        .filter(
          ([, home, id]) =>
            !homes.includes(home!) || !ids(html[home!]!).has(id!)
        )
        .map(([href]) => href);
      expect(missing).toEqual([]);
    });
  }

  it('sends every Korean page’s section links to the Korean home page', () => {
    const korean = pages.filter(({ path }) => localeOf(path) === 'ko');
    expect(korean.map(({ path }) => path).sort()).toEqual([
      '/ko',
      '/ko/request-not-sent',
      '/ko/request-sent',
    ]);
    for (const { path } of korean) {
      const sectionLinks = hrefs(html[path]!).filter((href) =>
        /^\/[^#]*#/.test(href)
      );
      expect(sectionLinks.length, path).toBeGreaterThan(0);
      expect(
        sectionLinks.filter((href) => !href.startsWith('/ko#')),
        path
      ).toEqual([]);
    }
  });
});

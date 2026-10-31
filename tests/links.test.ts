// The header, menu and call bar render on every page, including the form
// result pages, so their section links have to work from all of them. Each
// language has its own home page, and a section link must land on the home
// page it names.
import { experimental_AstroContainer as AstroContainer } from 'astro/container';
import { beforeAll, describe, expect, it } from 'vitest';
import IndexPage from '../src/pages/index.astro';
import KoreanIndexPage from '../src/pages/ko/index.astro';
import RequestNotSent from '../src/pages/request-not-sent.astro';
import RequestSent from '../src/pages/request-sent.astro';

const pages = {
  '/': IndexPage,
  '/ko': KoreanIndexPage,
  '/request-sent': RequestSent,
  '/request-not-sent': RequestNotSent,
};
const homes = ['/', '/ko'];
const html: Record<string, string> = {};

beforeAll(async () => {
  const container = await AstroContainer.create();
  for (const [path, page] of Object.entries(pages)) {
    html[path] = await container.renderToString(page, {
      request: new Request(`http://localhost${path}`),
    });
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

  it('sends the Korean home page’s section links to the Korean home page', () => {
    const sectionLinks = hrefs(html['/ko']!).filter((href) =>
      /^\/[^#]*#/.test(href)
    );
    expect(sectionLinks.length).toBeGreaterThan(0);
    expect(sectionLinks.filter((href) => !href.startsWith('/ko#'))).toEqual([]);
  });
});

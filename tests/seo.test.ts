// sitemap.xml and robots.txt, both built from `site`. The sitemap lists
// exactly the pages that don't carry a noindex tag, in both directions.
import type { APIContext } from 'astro';
import { experimental_AstroContainer as AstroContainer } from 'astro/container';
import { beforeAll, describe, expect, it } from 'vitest';
import config from '../astro.config.mjs';
import { GET as robots } from '../src/pages/robots.txt';
import { GET as sitemap, INDEXED_PATHS } from '../src/pages/sitemap.xml';
import { pages } from './pages';

const site = new URL(config.site!);
const context = { site } as unknown as APIContext;

let indexable: string[];

beforeAll(async () => {
  const container = await AstroContainer.create({
    astroConfig: { site: config.site },
  });
  indexable = [];
  for (const { path, page } of pages) {
    // The glob is typed unknown; every match is an .astro page component.
    const html = await container.renderToString(
      page as Parameters<typeof container.renderToString>[0]
    );
    if (!html.includes('<meta name="robots" content="noindex">')) {
      indexable.push(path);
    }
  }
});

const text = async (response: Response | Promise<Response>) =>
  (await response).text();

describe('sitemap.xml', () => {
  it('lists exactly the pages without a noindex tag', () => {
    expect([...INDEXED_PATHS].sort()).toEqual([...indexable].sort());
  });

  it('uses absolute URLs on the production domain', async () => {
    const xml = await text(sitemap(context));
    const locs = [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]);
    expect(locs).toEqual(INDEXED_PATHS.map((path) => new URL(path, site).href));
    expect(xml).toMatch(/^<\?xml version="1.0" encoding="UTF-8"\?>/);
  });
});

describe('robots.txt', () => {
  it('lets crawlers in, including the noindex result pages', async () => {
    const body = await text(robots(context));
    expect(body).toMatch(/^User-agent: \*$/m);
    expect(body).toMatch(/^Allow: \/$/m);
    expect(body).not.toMatch(/^Disallow:/m);
  });

  it('points at the sitemap on the production domain', async () => {
    const body = await text(robots(context));
    expect(body).toMatch(
      /^Sitemap: https:\/\/www\.kangpiano\.com\/sitemap\.xml$/m
    );
  });
});

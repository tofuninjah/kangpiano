// What search engines see on the built site: each page's canonical URL is
// the production URL it's served at (Vercel serves no trailing slash), the
// two home pages name each other as translations, and robots.txt and
// sitemap.xml are served from the build.
import { BUILT_PAGES, expect, test } from './test';

const SITE = 'https://www.kangpiano.com';

const HOME_ALTERNATES = [
  { hreflang: 'en', href: `${SITE}/` },
  { hreflang: 'ko', href: `${SITE}/ko` },
  { hreflang: 'x-default', href: `${SITE}/` },
];

for (const [path, lang] of [
  ['/', 'en'],
  ['/ko', 'ko'],
] as const) {
  test(`${path} is marked ${lang} and lists both home pages with hreflang`, async ({
    page,
  }) => {
    await page.goto(path);
    await expect(page.locator('html')).toHaveAttribute('lang', lang);
    const alternates = await page
      .locator('link[rel="alternate"][hreflang]')
      .evaluateAll((links) =>
        links.map((link) => ({
          hreflang: link.getAttribute('hreflang'),
          href: link.getAttribute('href'),
        }))
      );
    expect(alternates).toEqual(HOME_ALTERNATES);
  });
}

for (const path of BUILT_PAGES) {
  test(`${path} names its own production URL as canonical`, async ({
    page,
  }) => {
    const response = await page.goto(path);
    expect(response?.status()).toBe(200);
    await expect(page.locator('link[rel="canonical"]')).toHaveAttribute(
      'href',
      `${SITE}${path}`
    );
    await expect(page.locator('meta[property="og:url"]')).toHaveAttribute(
      'content',
      `${SITE}${path}`
    );
  });
}

test('robots.txt and sitemap.xml are served from the build', async ({
  request,
}) => {
  const robots = await request.get('/robots.txt');
  expect(robots.ok()).toBe(true);
  expect(await robots.text()).toContain(`Sitemap: ${SITE}/sitemap.xml`);

  const sitemap = await request.get('/sitemap.xml');
  expect(sitemap.ok()).toBe(true);
  expect(sitemap.headers()['content-type']).toContain('xml');
  const xml = await sitemap.text();
  expect(xml).toContain(`<loc>${SITE}/</loc>`);
  expect(xml).toContain(`<loc>${SITE}/ko</loc>`);
});

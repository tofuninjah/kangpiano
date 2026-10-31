// What search engines see on the built site: each page's canonical URL is
// the production URL it's served at (Vercel serves no trailing slash), and
// robots.txt and sitemap.xml are served from the build.
import { BUILT_PAGES, expect, test } from './test';

const SITE = 'https://www.kangpiano.com';

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
  expect(await sitemap.text()).toContain(`<loc>${SITE}/</loc>`);
});

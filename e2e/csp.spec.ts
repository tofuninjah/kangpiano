// Each built page carries Astro's hashed CSP and loads without a violation.
// The violation check itself runs in every test (see ./test.ts); here each
// page is loaded until its fonts settle so late font or image loads count.
import { BUILT_PAGES, expect, test } from './test';

for (const path of BUILT_PAGES) {
  test(`${path} enforces the hashed CSP and loads cleanly`, async ({
    page,
  }) => {
    await page.goto(path);

    const policy = await page
      .locator('meta[http-equiv="content-security-policy"]')
      .getAttribute('content');
    expect(policy).toMatch(/script-src 'self' 'sha256-/);
    expect(policy).not.toMatch(/unsafe-(inline|eval)/);

    await page.evaluate(async () => {
      await document.fonts.ready;
    });
    expect(await page.evaluate(() => document.fonts.status)).toBe('loaded');
  });
}

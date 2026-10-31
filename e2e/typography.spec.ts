// Korean typesetting on /ko, at 1440 (desktop-chromium) and 375
// (mobile-webkit): lines break between words rather than inside them, there
// is room between lines of Hangul, emphasis isn't a slanted fake italic, and
// nothing runs off a phone screen. The English page keeps its own settings.
import type { Page } from '@playwright/test';
import { HONEYPOT_FIELD } from '../src/lib/contact';
import { expect, test } from './test';

/** Line height over font size for the page's first match. */
function lineHeightRatio(page: Page, selector: string) {
  return page
    .locator(selector)
    .first()
    .evaluate((el) => {
      const style = getComputedStyle(el);
      return parseFloat(style.lineHeight) / parseFloat(style.fontSize);
    });
}

test.describe('Korean page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/ko');
  });

  test('breaks lines between words, never inside a Korean word', async ({
    page,
  }) => {
    const broken = await page.evaluate((honeypot) => {
      // Measure the folded "why piano" text too.
      for (const details of document.querySelectorAll('details')) {
        details.open = true;
      }
      const main = document.querySelector('main')!;
      const walker = document.createTreeWalker(main, NodeFilter.SHOW_TEXT);
      const found: string[] = [];
      for (let node = walker.nextNode(); node; node = walker.nextNode()) {
        const parent = node.parentElement!;
        // Screen-reader-only text and the honeypot's hidden wrapper are
        // squeezed into 1px on purpose, so they "wrap" by design. Option
        // text isn't laid out as page text, and measuring it in WebKit trips
        // a CSP report from the engine's own <select> internals.
        const skip = `.sr-only, select, :has(> [name="${honeypot}"])`;
        if (parent.closest(skip)) continue;
        const half = parseFloat(getComputedStyle(parent).fontSize) / 2;
        for (const word of (node.textContent ?? '').matchAll(/\S+/g)) {
          if (!/[가-힣]/.test(word[0])) continue;
          const range = document.createRange();
          range.setStart(node, word.index);
          range.setEnd(node, word.index + word[0].length);
          const tops = [...range.getClientRects()]
            .filter((rect) => rect.width > 0)
            .map((rect) => rect.top);
          if (tops.length && Math.max(...tops) - Math.min(...tops) > half) {
            found.push(word[0]);
          }
        }
      }
      return found;
    }, HONEYPOT_FIELD);
    expect(broken).toEqual([]);
  });

  test('keeps each town name with its English name on one line', async ({
    page,
  }) => {
    const split = await page.locator('main [data-town]').evaluateAll((towns) =>
      towns
        .filter((town) => {
          const tops = [...town.getClientRects()].map((rect) => rect.top);
          return new Set(tops.map(Math.round)).size > 1;
        })
        .map((town) => town.textContent)
    );
    expect(split).toEqual([]);
  });

  test('sets emphasis upright instead of a fake Hangul italic', async ({
    page,
  }) => {
    const styles = await page
      .locator('main em')
      .evaluateAll((ems) => ems.map((em) => getComputedStyle(em).fontStyle));
    expect(styles.length).toBeGreaterThan(0);
    expect(new Set(styles)).toEqual(new Set(['normal']));
  });

  test('opens up line height for Hangul headings', async ({ page }) => {
    expect(await lineHeightRatio(page, 'h1')).toBeGreaterThanOrEqual(1.2);
    expect(await lineHeightRatio(page, 'h2')).toBeGreaterThanOrEqual(1.2);
  });

  test('names Korean system fonts after the Latin web fonts', async ({
    page,
  }) => {
    const [sans, serif] = await page.evaluate(() => [
      getComputedStyle(document.documentElement).fontFamily,
      getComputedStyle(document.querySelector('h1')!).fontFamily,
    ]);
    expect(sans).toMatch(/^"?Hanken Grotesk Variable"?, .*Apple SD Gothic Neo/);
    expect(sans).toContain('Malgun Gothic');
    expect(serif).toMatch(/^"?Newsreader Variable"?, .*AppleMyungjo/);
  });

  test('fits the screen without sideways scrolling', async ({ page }) => {
    const overflow = await page.evaluate(
      () =>
        document.documentElement.scrollWidth -
        document.documentElement.clientWidth
    );
    expect(overflow).toBeLessThanOrEqual(0);
  });
});

test.describe('English page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('keeps its tight display line height and italic emphasis', async ({
    page,
  }) => {
    expect(await lineHeightRatio(page, 'h1')).toBeLessThan(1.15);
    await expect(page.locator('h1 em')).toHaveCSS('font-style', 'italic');
  });

  test('keeps its own font stack', async ({ page }) => {
    const sans = await page.evaluate(
      () => getComputedStyle(document.documentElement).fontFamily
    );
    expect(sans).not.toContain('Malgun Gothic');
  });
});

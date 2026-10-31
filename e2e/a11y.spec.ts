// axe-core against WCAG 2.2 A and AA rules, at 1440 (desktop-chromium) and
// 375 (mobile-webkit). axe catches about a third of issues; the keyboard and
// screen-reader checks in the other specs and manual review cover the rest.
import AxeBuilder from '@axe-core/playwright';
import type { Page } from '@playwright/test';
import { contactForm, fillRequest, serveContact } from './contact-form';
import { BUILT_PAGES, expect, test } from './test';

const TAGS = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'];

async function violations(page: Page): Promise<string[]> {
  const results = await new AxeBuilder({ page }).withTags(TAGS).analyze();
  return results.violations.map(
    (violation) =>
      `${violation.id}: ${violation.nodes.map((node) => String(node.target)).join(' | ')}`
  );
}

for (const path of BUILT_PAGES) {
  test(`${path} has no axe violations`, async ({ page }) => {
    await page.goto(path);
    expect(await violations(page)).toEqual([]);
  });
}

test('the form has no axe violations while showing errors', async ({
  page,
}) => {
  await serveContact(page);
  await page.goto('/#contact');
  await fillRequest(page, { contact: 'not sure' });
  await contactForm(page).getByRole('button', { name: 'Send request' }).click();
  await expect(contactForm(page).getByLabel('Phone or email')).toHaveAttribute(
    'aria-invalid',
    'true'
  );

  expect(await violations(page)).toEqual([]);
});

test('the open phone menu has no axe violations', async ({
  page,
  isMobile,
}) => {
  test.skip(!isMobile, 'The menu button shows below 1024px');
  await page.goto('/');
  await page.getByRole('button', { name: 'Menu', exact: true }).click();
  await expect(page.getByRole('navigation', { name: 'Main' })).toBeVisible();

  expect(await violations(page)).toEqual([]);
});

// WCAG 2.4.7 and 1.4.11: axe doesn't check focus rings. The ring sits
// outside the element (outline-offset), so it's measured against the
// background behind the element.
test('every focus ring has 3:1 contrast with the background behind it', async ({
  page,
  isMobile,
}) => {
  test.skip(isMobile, 'Keyboard paths are checked on desktop');
  for (const path of BUILT_PAGES) {
    await page.goto(path);
    const weak: string[] = [];
    let first: string | undefined;
    for (let stop = 0; stop < 60; stop += 1) {
      await page.keyboard.press('Tab');
      const ring = await page.evaluate(async () => {
        const el = document.activeElement;
        if (!(el instanceof HTMLElement) || el === document.body) return null;
        // Tailwind's transition-colors also animates outline-color.
        await Promise.all(el.getAnimations().map((a) => a.finished));
        const luminance = (color: string) => {
          const [r, g, b] = color
            .match(/[\d.]+/g)!
            .slice(0, 3)
            .map(Number)
            .map((v) => v / 255)
            .map((v) =>
              v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4
            );
          return 0.2126 * r! + 0.7152 * g! + 0.0722 * b!;
        };
        let behind = el.parentElement;
        let background = 'rgb(255, 255, 255)';
        while (behind) {
          const color = getComputedStyle(behind).backgroundColor;
          if (color !== 'rgba(0, 0, 0, 0)') {
            background = color;
            break;
          }
          behind = behind.parentElement;
        }
        const style = getComputedStyle(el);
        const [light, dark] = [
          luminance(style.outlineColor),
          luminance(background),
        ].sort((a, b) => b - a);
        return {
          name: `${el.tagName} ${(el.textContent || el.id).trim().replace(/\s+/g, ' ').slice(0, 40)}`,
          shown: style.outlineStyle !== 'none',
          ratio: (light! + 0.05) / (dark! + 0.05),
        };
      });
      if (!ring || ring.name === first) break;
      first ??= ring.name;
      if (!ring.shown || ring.ratio < 3) {
        weak.push(`${path} ${ring.name}: ${ring.ratio.toFixed(2)}:1`);
      }
    }
    expect(weak).toEqual([]);
  }
});

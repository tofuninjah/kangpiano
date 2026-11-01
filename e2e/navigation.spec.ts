// Getting around the page: skip link, phone menu, the phone call bar and
// the link between the English and Korean pages.
import type { Page } from '@playwright/test';
import { copy } from '../src/data/copy';
import { site } from '../src/data/site';
import { expect, test } from './test';

test.beforeEach(async ({ page }) => {
  await page.goto('/');
});

test.describe('skip link', () => {
  test.skip(
    ({ isMobile }) => isMobile,
    'Keyboard paths are checked on desktop'
  );

  test('is the first Tab stop and moves focus to the main content', async ({
    page,
  }) => {
    await page.keyboard.press('Tab');
    const skip = page.getByRole('link', { name: 'Skip to content' });
    await expect(skip).toBeFocused();
    await expect(skip).toBeVisible();

    await page.keyboard.press('Enter');
    await expect(page.getByRole('main')).toBeFocused();
  });
});

test.describe('phone menu', () => {
  test.skip(({ isMobile }) => !isMobile, 'The menu button shows below 1024px');

  const menuButton = (page: Page) =>
    page.getByRole('button', { name: 'Menu', exact: true });
  const menu = (page: Page) => page.getByRole('navigation', { name: 'Main' });

  test('opens from the menu button and closes from its close button', async ({
    page,
  }) => {
    await menuButton(page).click();
    await expect(
      menu(page).getByRole('link', { name: 'Lessons' })
    ).toBeVisible();
    await expect(
      menu(page).getByRole('link', { name: `Call ${site.phone.display}` })
    ).toHaveAttribute('href', site.phone.href);

    await page.getByRole('button', { name: 'Close menu' }).click();
    await expect(menu(page)).toBeHidden();
  });

  test('moves focus into the menu, and Escape returns it to the menu button', async ({
    page,
  }) => {
    await menuButton(page).focus();
    await page.keyboard.press('Enter');
    await expect(menu(page)).toBeVisible();
    await expect(
      page.getByRole('button', { name: 'Close menu' })
    ).toBeFocused();

    await page.keyboard.press('Escape');
    await expect(menu(page)).toBeHidden();
    await expect(menuButton(page)).toBeFocused();
  });

  test('closes after a link is chosen and shows that section', async ({
    page,
  }) => {
    await menuButton(page).click();
    await menu(page).getByRole('link', { name: 'Lessons' }).click();

    await expect(menu(page)).toBeHidden();
    await expect(page).toHaveURL(/#lessons$/);
    await expect(
      page.getByRole('heading', { name: /Lessons shaped around/ })
    ).toBeInViewport();
  });
});

test.describe('call bar', () => {
  const callNow = (page: Page) =>
    page.getByRole('link', { name: `Call now, ${site.phone.display}` });

  test('stays on screen on phones and steps aside while a field has focus', async ({
    page,
    isMobile,
  }) => {
    test.skip(!isMobile, 'The call bar is for phones');
    await expect(callNow(page)).toBeVisible();
    await expect(callNow(page)).toHaveAttribute('href', site.phone.href);

    const name = page.getByLabel('Your name');
    await name.focus();
    await expect(callNow(page)).toBeHidden();
    await name.blur();
    await expect(callNow(page)).toBeVisible();
  });

  test('jumps to the form from Request a lesson', async ({
    page,
    isMobile,
  }) => {
    test.skip(!isMobile, 'The call bar is for phones');
    await page
      .getByRole('link', { name: 'Request a lesson', exact: true })
      .click();

    await expect(page).toHaveURL(/#contact$/);
    await expect(
      page.getByRole('heading', { name: 'Let’s find your first lesson.' })
    ).toBeInViewport();
  });

  test('shows below 768px and is gone from 768px up', async ({
    page,
    isMobile,
  }) => {
    test.skip(isMobile, 'Resizes a desktop browser across the breakpoint');
    await page.setViewportSize({ width: 767, height: 1024 });
    await expect(callNow(page)).toBeVisible();
    await page.setViewportSize({ width: 768, height: 1024 });
    await expect(callNow(page)).toBeHidden();
    await page.setViewportSize({ width: 1440, height: 900 });
    await expect(callNow(page)).toBeHidden();
  });
});

test.describe('from a form result page', () => {
  test('the call bar leads back to the form on the home page', async ({
    page,
    isMobile,
  }) => {
    test.skip(!isMobile, 'The call bar is for phones');
    await page.goto('/request-not-sent');
    await page
      .getByRole('link', { name: 'Request a lesson', exact: true })
      .click();

    await expect(page).toHaveURL('/#contact');
    await expect(
      page.getByRole('heading', { name: 'Let’s find your first lesson.' })
    ).toBeInViewport();
  });

  test('the main nav leads to the home page sections', async ({
    page,
    isMobile,
  }) => {
    test.skip(isMobile, 'Checks the desktop nav');
    await page.goto('/request-sent');
    await page
      .getByRole('navigation', { name: 'Main' })
      .getByRole('link', { name: 'Lessons' })
      .click();

    await expect(page).toHaveURL('/#lessons');
    await expect(
      page.getByRole('heading', { name: /Lessons shaped around/ })
    ).toBeInViewport();
  });
});

// Visible at every width, so it runs on both projects.
test.describe('language link', () => {
  test('goes from the English page to the Korean page and back', async ({
    page,
  }) => {
    await page
      .getByRole('banner')
      .getByRole('link', { name: '한국어', exact: true })
      .click();
    await expect(page).toHaveURL('/ko');
    await expect(page.locator('html')).toHaveAttribute('lang', 'ko');

    await page
      .getByRole('banner')
      .getByRole('link', { name: 'English', exact: true })
      .click();
    await expect(page).toHaveURL('/');
    await expect(page.locator('html')).toHaveAttribute('lang', 'en');
  });
});

test('footer links are 44px tall on phones', async ({ page, isMobile }) => {
  test.skip(!isMobile, 'The 44px minimum applies below 768px');
  const heights = await page
    .getByRole('contentinfo')
    .getByRole('link')
    .evaluateAll((links) =>
      links.map((link) => link.getBoundingClientRect().height)
    );
  expect(heights.length).toBe(2);
  for (const height of heights) expect(height).toBeGreaterThanOrEqual(44);
});

test('on desktop the language link looks unlike the section links', async ({
  page,
  isMobile,
}) => {
  test.skip(isMobile, 'The section links show from 1024px');
  const color = (locator: ReturnType<Page['locator']>) =>
    locator.evaluate((el) => getComputedStyle(el).color);
  const section = page
    .getByRole('navigation', { name: 'Main' })
    .getByRole('link', { name: 'Lessons' });
  const language = page
    .getByRole('banner')
    .getByRole('link', { name: '한국어', exact: true });
  expect(await color(language)).not.toBe(await color(section));
});

test('the footer links to the other language too', async ({ page }) => {
  await page
    .getByRole('contentinfo')
    .getByRole('link', { name: '한국어', exact: true })
    .click();
  await expect(page).toHaveURL('/ko');
  await expect(
    page.getByRole('contentinfo').getByRole('link', { name: 'English' })
  ).toHaveAttribute('href', '/');
});

test.describe('Korean page', () => {
  const ko = copy.ko;
  const nav = (page: Page) =>
    page.getByRole('navigation', { name: ko.header.navLabel });

  test.beforeEach(async ({ page }) => {
    await page.goto('/ko');
  });

  test('the call bar leads to the form on the Korean page', async ({
    page,
    isMobile,
  }) => {
    test.skip(!isMobile, 'The call bar is for phones');
    await expect(
      page.getByRole('link', {
        name: ko.callBar.callNowLabel(site.phone.display),
      })
    ).toHaveAttribute('href', site.phone.href);
    await page
      .getByRole('link', { name: ko.callBar.request, exact: true })
      .click();

    await expect(page).toHaveURL('/ko#contact');
    await expect(page.locator('#contact')).toBeInViewport();
  });

  test('the main nav stays on the Korean page', async ({ page, isMobile }) => {
    test.skip(isMobile, 'Checks the desktop nav');
    await nav(page).getByRole('link', { name: ko.header.nav.lessons }).click();

    await expect(page).toHaveURL('/ko#lessons');
    await expect(
      page.getByRole('heading', { name: new RegExp(ko.lessons.heading.lead) })
    ).toBeInViewport();
  });

  test('the phone menu opens, links in Korean and closes', async ({
    page,
    isMobile,
  }) => {
    test.skip(!isMobile, 'The menu button shows below 1024px');
    await page
      .getByRole('button', { name: ko.header.menu, exact: true })
      .click();
    await nav(page).getByRole('link', { name: ko.header.nav.about }).click();

    await expect(nav(page)).toBeHidden();
    await expect(page).toHaveURL('/ko#about');
    await expect(
      page.getByRole('heading', { name: ko.about.heading })
    ).toBeInViewport();
  });
});

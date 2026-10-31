// The lesson request form with JavaScript off (the no-js-chromium project):
// a normal form post that lands on a fixed result page.
import { contactForm, fillRequest, serveContact } from './contact-form';
import { expect, test } from './test';

test.beforeEach(async ({ page }) => {
  await page.goto('/#contact');
});

test('posts the form and lands on the sent page', async ({ page }) => {
  const endpoint = await serveContact(page);
  await fillRequest(page);
  await contactForm(page).getByRole('button', { name: 'Send request' }).click();

  await expect(page).toHaveURL('/request-sent');
  await expect(
    page.getByRole('heading', {
      level: 1,
      name: 'Thank you. Your request is on its way.',
    })
  ).toBeVisible();
  expect(endpoint.sent).toHaveLength(1);
});

test('lands on the not-sent page when the server rejects the details', async ({
  page,
}) => {
  const endpoint = await serveContact(page);
  await fillRequest(page, { contact: 'not sure' });
  await contactForm(page).getByRole('button', { name: 'Send request' }).click();

  await expect(page).toHaveURL('/request-not-sent');
  await expect(
    page.getByRole('heading', {
      level: 1,
      name: 'Sorry, your request didn’t go through.',
    })
  ).toBeVisible();
  await expect(
    page.getByRole('link', { name: 'Back to the site' })
  ).toHaveAttribute('href', '/#contact');
  expect(endpoint.sent).toHaveLength(0);
});

test('the browser blocks an empty request before it is sent', async ({
  page,
}) => {
  const endpoint = await serveContact(page);
  await contactForm(page).getByRole('button', { name: 'Send request' }).click();

  // The browser focuses the first invalid field instead of submitting.
  await expect(contactForm(page).getByLabel('Your name')).toBeFocused();
  await expect(page).toHaveURL('/#contact');
  expect(endpoint.requests).toBe(0);
});

// The lesson request form with JavaScript: the request goes in the
// background and the answer shows on the page.
import { site } from '../src/data/site';
import { CONTACT_MESSAGES } from '../src/lib/contact';
import {
  contactForm,
  exhaustedLimiter,
  fillRequest,
  serveContact,
  VALID_REQUEST,
} from './contact-form';
import { expect, test } from './test';

test.beforeEach(async ({ page }) => {
  await page.goto('/#contact');
});

test('sends a request and confirms it on the page', async ({ page }) => {
  const endpoint = await serveContact(page);
  await fillRequest(page);
  await contactForm(page).getByRole('button', { name: 'Send request' }).click();

  await expect(page.getByRole('status')).toHaveText(CONTACT_MESSAGES.success);
  await expect(page.getByRole('status')).toContainText(site.phone.display);
  await expect(contactForm(page).getByLabel('Your name')).toHaveValue('');

  expect(endpoint.sent).toHaveLength(1);
  const [email] = endpoint.sent;
  expect(email!.subject).toBe(`Lesson request from ${VALID_REQUEST.name}`);
  expect(email!.replyTo).toBe(VALID_REQUEST.contact);
  for (const line of [
    `Name: ${VALID_REQUEST.name}`,
    `Phone or email: ${VALID_REQUEST.contact}`,
    `Student’s age: ${VALID_REQUEST.age}`,
    `Town: ${VALID_REQUEST.town}`,
    VALID_REQUEST.message,
  ]) {
    expect(email!.text).toContain(line);
  }
});

test('shows server errors next to their fields and focuses the first', async ({
  page,
}) => {
  const endpoint = await serveContact(page);
  // Both pass the browser's own checks: spaces fill a required field, and
  // the contact field is plain text.
  await fillRequest(page, { name: '   ', contact: 'not sure' });
  await contactForm(page).getByRole('button', { name: 'Send request' }).click();

  const name = contactForm(page).getByLabel('Your name');
  const reply = contactForm(page).getByLabel('Phone or email');
  await expect(page.getByRole('status')).toHaveText(
    CONTACT_MESSAGES.checkFields
  );
  await expect(name).toBeFocused();
  await expect(name).toHaveAttribute('aria-invalid', 'true');
  await expect(name).toHaveAccessibleDescription('Please enter your name.');
  await expect(reply).toHaveAttribute('aria-invalid', 'true');
  await expect(reply).toHaveAccessibleDescription(
    'Please enter a phone number or an email address.'
  );
  expect(endpoint.sent).toHaveLength(0);
});

test('clears a field’s error as soon as it is edited', async ({ page }) => {
  await serveContact(page);
  await fillRequest(page, { contact: 'not sure' });
  await contactForm(page).getByRole('button', { name: 'Send request' }).click();

  const reply = contactForm(page).getByLabel('Phone or email');
  await expect(reply).toHaveAttribute('aria-invalid', 'true');
  await reply.fill('(808) 555-0100');
  await expect(reply).not.toHaveAttribute('aria-invalid');
  await expect(reply).toHaveAccessibleDescription('');
});

test('sends once while a request is in flight', async ({ page }) => {
  let release = () => {};
  const held = new Promise<void>((resolve) => {
    release = resolve;
  });
  const endpoint = await serveContact(page, { send: () => held });
  await fillRequest(page);

  const button = contactForm(page).getByRole('button', {
    name: /Send request|Sending/,
  });
  await button.click();
  await expect(button).toHaveText('Sending…');
  await expect(button).toHaveAttribute('aria-disabled', 'true');

  // aria-disabled keeps the button focusable, so taps and Enter still reach
  // the form; the script has to ignore them.
  await button.click({ force: true });
  await contactForm(page).getByLabel('Your name').press('Enter');
  release();

  await expect(page.getByRole('status')).toHaveText(CONTACT_MESSAGES.success);
  await expect(button).toHaveText('Send request');
  await expect(button).not.toHaveAttribute('aria-disabled');
  expect(endpoint.requests).toBe(1);
});

test('keeps the details and offers the phone when sending fails', async ({
  page,
}) => {
  await serveContact(page, {
    send: async () => {
      throw new Error('Resend rejected the email: test');
    },
  });
  await fillRequest(page);
  await contactForm(page).getByRole('button', { name: 'Send request' }).click();

  await expect(page.getByRole('status')).toHaveText(
    CONTACT_MESSAGES.sendFailed
  );
  await expect(contactForm(page).getByLabel('Your name')).toHaveValue(
    VALID_REQUEST.name
  );
});

test('asks the visitor to wait after too many requests', async ({ page }) => {
  const endpoint = await serveContact(page, { limiter: exhaustedLimiter() });
  await fillRequest(page);
  await contactForm(page).getByRole('button', { name: 'Send request' }).click();

  await expect(page.getByRole('status')).toHaveText(CONTACT_MESSAGES.tooMany);
  expect(endpoint.sent).toHaveLength(0);
});

test('explains a lost connection', async ({ page }) => {
  await page.route('**/api/contact', (route) =>
    route.abort('internetdisconnected')
  );
  await fillRequest(page);
  await contactForm(page).getByRole('button', { name: 'Send request' }).click();

  await expect(page.getByRole('status')).toHaveText(CONTACT_MESSAGES.offline);
  await expect(contactForm(page).getByLabel('Your name')).toHaveValue(
    VALID_REQUEST.name
  );
});

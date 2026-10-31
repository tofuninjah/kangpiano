// The lesson request form with JavaScript: the fields are checked on the
// page first, the request goes in the background and the answer shows on
// the page.
import { site } from '../src/data/site';
import {
  CONTACT_LIMITS,
  CONTACT_MESSAGES,
  FIELD_MESSAGES,
} from '../src/lib/contact';
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

test('checks the fields before sending and focuses the first problem', async ({
  page,
}) => {
  const endpoint = await serveContact(page);
  await contactForm(page).getByRole('button', { name: 'Send request' }).click();

  const form = contactForm(page);
  const name = form.getByLabel('Your name');
  await expect(page.getByRole('status')).toHaveText(
    CONTACT_MESSAGES.checkFields
  );
  await expect(name).toBeFocused();
  await expect(name).toHaveAttribute('aria-invalid', 'true');
  await expect(name).toHaveAccessibleDescription(FIELD_MESSAGES.name);
  await expect(form.getByLabel('Phone or email')).toHaveAccessibleDescription(
    FIELD_MESSAGES.contact
  );
  await expect(form.getByLabel('Town')).toHaveAccessibleDescription(
    FIELD_MESSAGES.town
  );
  // Optional fields are never flagged.
  await expect(form.getByLabel('Student’s age')).not.toHaveAttribute(
    'aria-invalid'
  );
  expect(endpoint.requests).toBe(0);
});

test('flags contact details that are neither phone nor email before sending', async ({
  page,
}) => {
  const endpoint = await serveContact(page);
  await fillRequest(page, { contact: 'not sure' });
  await contactForm(page).getByRole('button', { name: 'Send request' }).click();

  const reply = contactForm(page).getByLabel('Phone or email');
  await expect(reply).toBeFocused();
  await expect(reply).toHaveAccessibleDescription(FIELD_MESSAGES.contactFormat);
  expect(endpoint.requests).toBe(0);
});

test('after a first attempt, flags a field as soon as it is left wrong', async ({
  page,
}) => {
  await serveContact(page);
  const name = contactForm(page).getByLabel('Your name');

  // Before any attempt, leaving a field empty says nothing.
  await name.focus();
  await name.blur();
  await expect(name).not.toHaveAttribute('aria-invalid');

  await contactForm(page).getByRole('button', { name: 'Send request' }).click();
  await expect(name).toHaveAttribute('aria-invalid', 'true');
  await name.fill('Ana');
  await expect(name).not.toHaveAttribute('aria-invalid');
  await name.fill('');
  await name.blur();
  await expect(name).toHaveAttribute('aria-invalid', 'true');
  await expect(name).toHaveAccessibleDescription(FIELD_MESSAGES.name);
});

test('shows server errors next to their fields and focuses the first', async ({
  page,
}) => {
  const endpoint = await serveContact(page);
  await fillRequest(page);
  // Only the server can judge these: the town list and the length cap are
  // enforced in the markup, so the page has to be tampered with to send them.
  await contactForm(page)
    .getByLabel('Town')
    .evaluate((select: HTMLSelectElement) => {
      select.add(new Option('Honolulu'));
      select.value = 'Honolulu';
    });
  await contactForm(page)
    .getByLabel('Anything I should know?')
    .evaluate((textarea: HTMLTextAreaElement, limit) => {
      textarea.removeAttribute('maxlength');
      textarea.value = 'x'.repeat(limit + 1);
    }, CONTACT_LIMITS.message);
  await contactForm(page).getByRole('button', { name: 'Send request' }).click();

  const town = contactForm(page).getByLabel('Town');
  const message = contactForm(page).getByLabel('Anything I should know?');
  await expect(page.getByRole('status')).toHaveText(
    CONTACT_MESSAGES.checkFields
  );
  await expect(town).toBeFocused();
  await expect(town).toHaveAttribute('aria-invalid', 'true');
  await expect(town).toHaveAccessibleDescription(FIELD_MESSAGES.town);
  await expect(message).toHaveAttribute('aria-invalid', 'true');
  await expect(message).toHaveAccessibleDescription(FIELD_MESSAGES.tooLong);
  expect(endpoint.sent).toHaveLength(0);

  // Errors only the server can judge clear on any edit.
  await message.fill('Shorter.');
  await expect(message).not.toHaveAttribute('aria-invalid');
  await expect(message).toHaveAccessibleDescription('');
});

test('keeps the message current while a flagged field is edited', async ({
  page,
}) => {
  await serveContact(page);
  await contactForm(page).getByRole('button', { name: 'Send request' }).click();

  const reply = contactForm(page).getByLabel('Phone or email');
  await expect(reply).toHaveAccessibleDescription(FIELD_MESSAGES.contact);
  await reply.fill('not sure');
  await expect(reply).toHaveAccessibleDescription(FIELD_MESSAGES.contactFormat);
  await reply.fill('ana@example.com');
  await expect(reply).not.toHaveAttribute('aria-invalid');
});

test('ignores edits while a request is in flight, so the answer lands on a clean form', async ({
  page,
}) => {
  let release = () => {};
  const held = new Promise<void>((resolve) => {
    release = resolve;
  });
  await serveContact(page, { send: () => held });
  await fillRequest(page);
  const form = contactForm(page);
  await form.getByRole('button', { name: 'Send request' }).click();
  await expect(form.getByRole('button', { name: 'Sending…' })).toBeVisible();

  const name = form.getByLabel('Your name');
  await name.fill('');
  await name.blur();
  release();

  await expect(page.getByRole('status')).toHaveText(CONTACT_MESSAGES.success);
  await expect(name).not.toHaveAttribute('aria-invalid');
  await expect(name).toHaveAccessibleDescription('');
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

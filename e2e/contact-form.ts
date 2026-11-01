// Helpers for specs that use the lesson request form.
import type { Page } from '@playwright/test';
import { copy } from '../src/data/copy';
import { CONTACT_RATE_LIMIT, townOptions } from '../src/lib/contact';
import type { OutgoingEmail, SendEmail } from '../src/lib/contact-email';
import { handleContact } from '../src/lib/contact-handler';
import type { Locale } from '../src/lib/i18n';
import { createRateLimiter, type RateLimiter } from '../src/lib/rate-limit';

/** The form's accessible name: its heading, in the page's language. */
export function formName(locale: Locale = 'en') {
  const { lead, emphasis } = copy[locale].contact.heading;
  return `${lead} ${emphasis}`;
}

export function contactForm(page: Page, locale: Locale = 'en') {
  return page.getByRole('form', { name: formName(locale) });
}

export interface ContactEndpoint {
  /** Emails the fake sender received, in order. */
  sent: OutgoingEmail[];
  /** Requests that reached the endpoint. */
  requests: number;
}

/**
 * Answers POST /api/contact with the real handler: origin and size checks,
 * validation, honeypot, rate limit and response shape all run as deployed.
 * Only the email sender is fake, so nothing leaves the machine.
 */
export async function serveContact(
  page: Page,
  options: { send?: SendEmail; limiter?: RateLimiter } = {}
): Promise<ContactEndpoint> {
  const endpoint: ContactEndpoint = { sent: [], requests: 0 };
  const send: SendEmail =
    options.send ??
    (async (email) => {
      endpoint.sent.push(email);
    });
  const limiter = options.limiter ?? createRateLimiter(CONTACT_RATE_LIMIT);

  await page.route('**/api/contact', async (route) => {
    endpoint.requests += 1;
    const request = route.request();
    const response = await handleContact(
      new Request(request.url(), {
        method: request.method(),
        headers: await request.allHeaders(),
        body: request.postData(),
      }),
      '127.0.0.1',
      { send, limiter }
    );
    await route.fulfill({
      status: response.status,
      headers: Object.fromEntries(response.headers),
      body: await response.text(),
    });
  });

  return endpoint;
}

/** A limiter that has already used up this client's allowance. */
export function exhaustedLimiter(): RateLimiter {
  const limiter = createRateLimiter(CONTACT_RATE_LIMIT);
  for (let hit = 0; hit < CONTACT_RATE_LIMIT.limit; hit += 1) {
    limiter.hit('127.0.0.1');
  }
  return limiter;
}

export const VALID_REQUEST = {
  name: 'Ana Silva',
  contact: 'ana@example.com',
  age: '7',
  town: townOptions()[0]!,
  message: 'Weekday afternoons work best.',
};

/**
 * Fills every field by its label in the page's language; `overrides`
 * replaces individual values. Towns are chosen by value, which stays the
 * English name on both pages.
 */
export async function fillRequest(
  page: Page,
  overrides: Partial<typeof VALID_REQUEST> = {},
  locale: Locale = 'en'
) {
  const values = { ...VALID_REQUEST, ...overrides };
  const labels = copy[locale].contact;
  const form = contactForm(page, locale);
  await form.getByLabel(labels.name).fill(values.name);
  await form.getByLabel(labels.contact).fill(values.contact);
  await form.getByLabel(labels.age).fill(values.age);
  await form.getByLabel(labels.town).selectOption(values.town);
  await form.getByLabel(labels.message).fill(values.message);
}

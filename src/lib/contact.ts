// Contact form fields and messages, shared by the form markup, its browser
// script and the server. No server-only imports here: the script bundles it.
import { site } from '../data/site';
import { allTowns } from './schedule';

/** Every message a visitor can see about their request. */
export const CONTACT_MESSAGES = {
  success: `Thank you! Your request is on its way, and I’ll get back to you soon. If it’s urgent, call ${site.phone.display}.`,
  checkFields: 'Please check the highlighted fields.',
  tooLarge: `That message is too long to send. Please shorten it, or call ${site.phone.display}.`,
  unreadable: `That request couldn’t be read. Please try again, or call ${site.phone.display}.`,
  tooMany: `Too many requests from this device. Please wait a few minutes, or call ${site.phone.display}.`,
  sendFailed: `Sorry, your request didn’t go through. Please call ${site.phone.display}.`,
  offline: `Couldn’t reach the server. Check your connection, or call ${site.phone.display}.`,
} as const;

/** What a visitor reads under a field they got wrong. */
export const FIELD_MESSAGES = {
  name: 'Please enter your name.',
  contact: 'Please enter a phone number or email.',
  contactFormat: 'Please enter a phone number or an email address.',
  town: 'Please choose a town.',
  tooLong: 'That’s too long.',
} as const;

export const OTHER_TOWN = 'Somewhere else';

/** Max lengths, enforced in the browser by maxlength and again on the server. */
export const CONTACT_LIMITS = {
  name: 100,
  contact: 120,
  age: 20,
  message: 2000,
} as const;

/** Emails sent per IP per window, per server instance (see rate-limit.ts). */
export const CONTACT_RATE_LIMIT = {
  limit: 5,
  windowMs: 10 * 60 * 1000,
} as const;

/** Honeypot field name: hidden from people, often filled in by bots. */
export const HONEYPOT_FIELD = 'website';

export function townOptions(): string[] {
  return [...allTowns(), OTHER_TOWN];
}

// Zod 4's default email pattern (z.regexes.email), so the browser bundle
// doesn't need Zod; tests/contact-schema.test.ts fails if the two disagree.
const EMAIL =
  /^(?:[A-Za-z0-9_'+-]+\.)*[A-Za-z0-9_'+-]*[A-Za-z0-9_+-]@(?:[A-Za-z0-9][A-Za-z0-9-]*\.)+[A-Za-z]{2,}$/;

export function isEmail(value: string): boolean {
  return EMAIL.test(value);
}

/** US or international numbers: digits plus common punctuation, 7–15 digits. */
export function isPhone(value: string): boolean {
  if (!/^[0-9+().\s-]+$/.test(value)) return false;
  const digits = value.replace(/\D/g, '').length;
  return digits >= 7 && digits <= 15;
}

/**
 * The checks a visitor can fix before sending: required fields and the
 * shape of the contact field. The browser runs them on submit; the server
 * schema runs the same ones (plus lengths and the town list) on every post.
 */
export function fieldError(field: string, value: string): string | undefined {
  const trimmed = value.trim();
  switch (field) {
    case 'name':
      return trimmed ? undefined : FIELD_MESSAGES.name;
    case 'contact':
      if (!trimmed) return FIELD_MESSAGES.contact;
      if (isEmail(trimmed) || isPhone(trimmed)) return undefined;
      return FIELD_MESSAGES.contactFormat;
    case 'town':
      return trimmed ? undefined : FIELD_MESSAGES.town;
    default:
      return undefined;
  }
}
